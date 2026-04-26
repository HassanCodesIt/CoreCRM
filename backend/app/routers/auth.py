from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
import uuid
from app.database import get_db
from app.core.auth import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user
from app.core.exceptions import UnauthorizedError, NotFoundError, BadRequestError
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, UserUpdate, UserPasswordUpdate, UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new user
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role="rep", # Default role
        is_active=True
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    await db.execute(update(User).where(User.id == user.id).values(last_login=datetime.utcnow()))
    await db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return LoginResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_none=True)
    update_data.pop("role", None)  # can't self-promote
    update_data.pop("is_active", None)
    update_data["updated_at"] = datetime.utcnow()
    await db.execute(update(User).where(User.id == current_user.id).values(**update_data))
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password")
async def change_password(
    data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise BadRequestError("Current password is incorrect")
    await db.execute(
        update(User).where(User.id == current_user.id).values(
            hashed_password=get_password_hash(data.new_password),
            updated_at=datetime.utcnow(),
        )
    )
    await db.commit()
    return {"message": "Password updated successfully"}
