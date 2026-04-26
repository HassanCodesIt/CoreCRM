from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate
import uuid
from datetime import datetime

class ActivityService:
    @staticmethod
    async def get_activities(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20,
        activity_type: Optional[str] = None,
        is_completed: Optional[bool] = None,
        owner_id: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> Tuple[List[Activity], int]:
        offset = (page - 1) * limit
        query = select(Activity)
        
        if activity_type:
            query = query.where(Activity.activity_type == activity_type)
        if is_completed is not None:
            query = query.where(Activity.is_completed == is_completed)
        if owner_id:
            query = query.where(Activity.created_by == owner_id)
        if assigned_to:
            query = query.where(Activity.assigned_to == assigned_to)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Activity.due_date.asc().nulls_last()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_activity_by_id(db: AsyncSession, activity_id: str) -> Optional[Activity]:
        result = await db.execute(select(Activity).where(Activity.id == activity_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_activity(db: AsyncSession, data: ActivityCreate, creator_id: str) -> Activity:
        activity = Activity(
            id=str(uuid.uuid4()),
            created_by=creator_id,
            **data.model_dump()
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def update_activity(db: AsyncSession, activity_id: str, data: ActivityUpdate) -> Optional[Activity]:
        activity = await ActivityService.get_activity_by_id(db, activity_id)
        if not activity:
            return None
        
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(activity, k, v)
        
        activity.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def complete_activity(db: AsyncSession, activity_id: str) -> Optional[Activity]:
        activity = await ActivityService.get_activity_by_id(db, activity_id)
        if not activity:
            return None
        
        activity.is_completed = True
        activity.completed_at = datetime.utcnow()
        activity.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def delete_activity(db: AsyncSession, activity_id: str) -> bool:
        activity = await ActivityService.get_activity_by_id(db, activity_id)
        if not activity:
            return False
        
        await db.delete(activity)
        await db.commit()
        return True
