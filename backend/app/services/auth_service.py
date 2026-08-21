from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.user import User, UserRole
from ..models.tenant import Tenant
from ..models.refresh_token import RefreshToken
from ..schemas.auth import TokenResponse, TokenPayload
from ..config import settings
import secrets
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "tenant_id": str(user.tenant_id),
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def create_refresh_token(user_id: str, db: AsyncSession) -> str:
    token_str = secrets.token_urlsafe(64)
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token=token_str,
        expires_at=expires,
        created_at=datetime.now(timezone.utc),
    )
    db.add(rt)
    await db.commit()
    await db.refresh(rt)
    return token_str


async def get_user_by_email(email: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def register_user(data: "RegisterRequest", db: AsyncSession) -> TokenResponse:
    from app.models.email_role_mapping import EmailRoleMapping
    from sqlalchemy import func
    
    # Check if a mapping for this email already exists
    mapping_result = await db.execute(
        select(EmailRoleMapping).where(func.lower(EmailRoleMapping.email) == func.lower(data.email))
    )
    mapping = mapping_result.scalar_one_or_none()
    
    if mapping:
        tenant_id = mapping.tenant_id
        role = mapping.role
        # Delete mapping so it is consumed
        await db.delete(mapping)
    else:
        # Create tenant
        t_name = data.tenant_name or f"{data.full_name}'s Team"
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name=t_name,
            slug=t_name.lower().replace(' ', '-')
        )
        db.add(tenant)
        await db.flush()
        tenant_id = tenant.id
        role = UserRole.REP

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=role,
        is_active=True,
        is_verified=False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    access_token = create_access_token(user)
    refresh_token = await create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user,
    )


async def login_user(data: "LoginRequest", db: AsyncSession) -> TokenResponse:
    user = await get_user_by_email(data.email, db)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User inactive")
    # update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    access_token = create_access_token(user)
    refresh_token = await create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user,
    )


async def refresh_tokens(refresh_token: str, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
    rt = result.scalar_one_or_none()
    if not rt or rt.is_revoked or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    # revoke old token
    rt.is_revoked = True
    # get user
    result = await db.execute(select(User).where(User.id == rt.user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    # issue new tokens
    new_access = create_access_token(user)
    new_refresh = await create_refresh_token(user.id, db)
    await db.commit()
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user=user,
    )


async def get_current_user(token: str, db: AsyncSession) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def revoke_refresh_token(token: str, db: AsyncSession) -> bool:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == token))
    rt = result.scalar_one_or_none()
    if rt and not rt.is_revoked:
        rt.is_revoked = True
        rt.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        return True
    return False


async def change_password(user: User, current_password: str, new_password: str, db: AsyncSession) -> bool:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return True
