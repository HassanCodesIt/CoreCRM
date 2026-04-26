from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.core.exceptions import NotFoundError, ConflictError
from app.core.auth import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.common import PaginatedResponse
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    offset = (page - 1) * limit
    count_result = await db.execute(select(func.count()).select_from(User).where(User.is_active == True))
    total = count_result.scalar()
    result = await db.execute(select(User).where(User.is_active == True).offset(offset).limit(limit))
    users = result.scalars().all()
    return PaginatedResponse(data=users, total=total, page=page, limit=limit)


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise ConflictError("Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        avatar_url=data.avatar_url,
        hashed_password=get_password_hash(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def deactivate_user(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "User deactivated"}
