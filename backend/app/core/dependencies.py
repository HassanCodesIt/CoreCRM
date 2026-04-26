from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.database import get_db
from app.core.auth import decode_token
from app.core.exceptions import UnauthorizedError, ForbiddenError
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise UnauthorizedError()
    except JWTError:
        raise UnauthorizedError()

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedError()
    return user


async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise ForbiddenError("Admin role required")
    return current_user


async def get_current_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "manager"):
        raise ForbiddenError("Manager or Admin role required")
    return current_user
