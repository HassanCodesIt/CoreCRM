from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.core.dependencies import get_current_active_user, get_db, require_manager
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models.user import User
from app.schemas.user import UserUpdate, UserRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/users")

@router.get("/", response_model=dict)
async def list_users(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    query = select(User).where(User.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return {"items": [UserRead.model_validate(u) for u in users], "total": total, "skip": skip, "limit": limit}

@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    return user

@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    old_values = {k: getattr(user, k) for k in user_in.model_dump(exclude_unset=True).keys()}
    update_data = user_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "user", user.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User not found")
    user.is_active = False
    user.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "user", user.id, "updated", new_values={"is_active": False})
    await db.commit()
    return
