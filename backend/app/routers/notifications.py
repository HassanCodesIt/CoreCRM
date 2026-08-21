from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import List
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
@router.get("/")
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = (await db.execute(
        select(func.count()).select_from(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    )).scalar()
    return {"count": count}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await db.execute(
        update(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id).values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked as read"}

@router.patch("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await db.execute(
        update(Notification).where(Notification.user_id == current_user.id).values(is_read=True)
    )
    await db.commit()
    return {"message": "All marked as read"}
