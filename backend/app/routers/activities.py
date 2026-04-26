from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.services.activity_service import ActivityService
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("/", response_model=PaginatedResponse[ActivityResponse])
async def list_activities(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    assigned_to: Optional[str] = None,
    is_completed: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities, total = await ActivityService.get_activities(
        db, page, limit, type, is_completed, assigned_to=assigned_to
    )
    return PaginatedResponse(data=activities, total=total, page=page, limit=limit)


@router.post("/", response_model=ActivityResponse, status_code=201)
async def create_activity(data: ActivityCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await ActivityService.create_activity(db, data, current_user.id)


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(activity_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    activity = await ActivityService.get_activity_by_id(db, activity_id)
    if not activity:
        raise NotFoundError("Activity not found")
    return activity


@router.put("/{activity_id}", response_model=ActivityResponse)
async def update_activity(activity_id: str, data: ActivityUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    activity = await ActivityService.update_activity(db, activity_id, data)
    if not activity:
        raise NotFoundError("Activity not found")
    return activity


@router.patch("/{activity_id}/complete", response_model=ActivityResponse)
async def complete_activity(activity_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    activity = await ActivityService.complete_activity(db, activity_id)
    if not activity:
        raise NotFoundError("Activity not found")
    return activity


@router.delete("/{activity_id}")
async def delete_activity(activity_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = await ActivityService.delete_activity(db, activity_id)
    if not success:
        raise NotFoundError("Activity not found")
    return {"message": "Activity deleted"}
