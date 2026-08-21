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
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        q: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        activity_type: Optional[str] = None,
        is_completed: Optional[bool] = None,
        assigned_to: Optional[str] = None
    ) -> Tuple[List[Activity], int]:
        query = select(Activity).where(Activity.tenant_id == tenant_id)
        
        if q:
            query = query.where(or_(
                Activity.subject.ilike(f"%{q}%"),
                Activity.body.ilike(f"%{q}%")
            ))
        if entity_type:
            query = query.where(Activity.entity_type == entity_type)
        if entity_id:
            query = query.where(Activity.entity_id == entity_id)
        if activity_type:
            query = query.where(Activity.activity_type == activity_type)
        if is_completed is not None:
            query = query.where(Activity.is_completed == is_completed)
        if assigned_to:
            query = query.where(Activity.assigned_to == assigned_to)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Activity.due_date.asc().nulls_last()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_activity_by_id(db: AsyncSession, activity_id: str, tenant_id: str = None) -> Optional[Activity]:
        query = select(Activity).where(Activity.id == activity_id)
        if tenant_id:
            query = query.where(Activity.tenant_id == tenant_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_activity(db: AsyncSession, data: ActivityCreate, creator_id: str, tenant_id: str) -> Activity:
        activity = Activity(
            id=str(uuid.uuid4()),
            created_by=creator_id,
            tenant_id=tenant_id,
            **data.model_dump()
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def update_activity(db: AsyncSession, activity_id: str, data: ActivityUpdate, tenant_id: str) -> Optional[Activity]:
        activity = await ActivityService.get_activity_by_id(db, activity_id, tenant_id)
        if not activity:
            return None
        
        old_values = {k: getattr(activity, k) for k, v in data.model_dump(exclude_none=True).items()}
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(activity, k, v)
        
        activity.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(activity)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, creator_id, "activity", activity.id, "updated", new_values=data.model_dump(exclude_none=True), old_values=old_values)
        return activity

    @staticmethod
    async def complete_activity(db: AsyncSession, activity_id: str, tenant_id: str) -> Optional[Activity]:
        activity = await ActivityService.get_activity_by_id(db, activity_id, tenant_id)
        if not activity:
            return None
        
        activity.is_completed = True
        activity.completed_at = datetime.utcnow()
        activity.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(activity)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, activity.created_by, "activity", activity.id, "updated", new_values={"is_completed": True, "completed_at": str(activity.completed_at)})
        return activity

    @staticmethod
    async def delete_activity(db: AsyncSession, activity_id: str, tenant_id: str) -> bool:
        activity = await ActivityService.get_activity_by_id(db, activity_id, tenant_id)
        if not activity:
            return False
        
        await db.delete(activity)
        await db.commit()
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, activity.created_by, "activity", activity.id, "deleted")
        return True
