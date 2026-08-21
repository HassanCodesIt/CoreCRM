from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.auth_service import get_current_user as auth_get_current_user
from ..models.user import User, UserRole


bearer_scheme = HTTPBearer()


async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await auth_get_current_user(credentials.credentials, db)


def require_role(*roles: UserRole):
    async def checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


# Shorthand dependencies
require_admin = require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN)
require_manager = require_role(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
get_current_admin = require_admin
get_current_user = get_current_active_user
get_current_manager_or_admin = require_manager
