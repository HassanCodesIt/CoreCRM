from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from app.models.deal import Deal
from app.models.notification import Notification
from app.schemas.deal import DealCreate, DealUpdate, DealStageUpdate
import uuid
from datetime import datetime

class DealService:
    @staticmethod
    async def get_deals(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        owner_id: Optional[str] = None
    ) -> Tuple[List[Deal], int]:
        offset = (page - 1) * limit
        query = select(Deal).where(Deal.is_deleted == False)
        
        if search:
            query = query.where(Deal.title.ilike(f"%{search}%"))
        if stage:
            query = query.where(Deal.stage == stage)
        if owner_id:
            query = query.where(Deal.owner_id == owner_id)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Deal.created_at.desc()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        deals = result.scalars().all()
        for deal in deals:
            if deal.account:
                deal.account_name = deal.account.name
            if deal.owner:
                deal.owner_name = deal.owner.full_name
        return deals, total

    @staticmethod
    async def get_deal_by_id(db: AsyncSession, deal_id: str) -> Optional[Deal]:
        result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.is_deleted == False))
        deal = result.scalar_one_or_none()
        if deal:
            if deal.account:
                deal.account_name = deal.account.name
            if deal.owner:
                deal.owner_name = deal.owner.full_name
        return deal

    @staticmethod
    async def create_deal(db: AsyncSession, data: DealCreate, owner_id: str) -> Deal:
        deal = Deal(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            **data.model_dump()
        )
        db.add(deal)
        await db.commit()
        await db.refresh(deal)
        return deal

    @staticmethod
    async def update_deal(db: AsyncSession, deal_id: str, data: DealUpdate) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id)
        if not deal:
            return None
        
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(deal, k, v)
        
        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        return deal

    @staticmethod
    async def update_deal_stage(db: AsyncSession, deal_id: str, data: DealStageUpdate) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id)
        if not deal:
            return None
        
        old_stage = deal.stage
        deal.stage = data.stage
        if data.probability is not None:
            deal.probability = data.probability
        
        if deal.stage != old_stage:
            notification = Notification(
                user_id=deal.owner_id,
                title="Deal Updated",
                body=f"Deal '{deal.title}' stage moved to {deal.stage}",
                type="deal_updated",
                reference_id=deal.id,
                reference_type="deal"
            )
            db.add(notification)

        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        return deal

    @staticmethod
    async def delete_deal(db: AsyncSession, deal_id: str) -> bool:
        deal = await DealService.get_deal_by_id(db, deal_id)
        if not deal:
            return False
        
        deal.is_deleted = True
        deal.updated_at = datetime.utcnow()
        await db.commit()
        return True

    @staticmethod
    async def get_deals_by_stage(db: AsyncSession, owner_id: Optional[str] = None) -> List[Deal]:
        query = select(Deal).where(Deal.is_deleted == False)
        if owner_id:
            query = query.where(Deal.owner_id == owner_id)
        
        result = await db.execute(query)
        deals = result.scalars().all()
        for deal in deals:
            if deal.account:
                deal.account_name = deal.account.name
            if deal.owner:
                deal.owner_name = deal.owner.full_name
        return deals
