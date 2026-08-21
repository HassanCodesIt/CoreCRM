from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
import re
from app.models.deal import Deal
from app.models.notification import Notification
from app.models.pipeline import PipelineStage
from app.schemas.deal import DealCreate, DealUpdate, DealStageUpdate
import uuid
from datetime import datetime

def _stage_slug(name: str) -> str:
    """Convert stage name to slug matching frontend STAGES ids (lowercase, underscores)."""
    return re.sub(r'[^a-z0-9]+', '_', name.strip().lower()).strip('_')

class DealService:
    @staticmethod
    async def get_deals(
        db: AsyncSession, 
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        q: Optional[str] = None,
        stage_id: Optional[str] = None,
        pipeline_id: Optional[str] = None,
        owner_id: Optional[str] = None
    ) -> Tuple[List[Deal], int]:
        # Always join with PipelineStage to get stage name
        query = select(Deal, PipelineStage.name.label("stage_name")).outerjoin(PipelineStage, Deal.stage_id == PipelineStage.id).where(Deal.is_deleted == False, Deal.tenant_id == tenant_id)
        
        if q:
            query = query.where(Deal.title.ilike(f"%{q}%"))
        if stage_id:
            query = query.where(Deal.stage_id == stage_id)
        if pipeline_id:
            query = query.where(Deal.pipeline_id == pipeline_id)
        if owner_id:
            query = query.where(Deal.owner_id == owner_id)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Deal.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        deals = []
        for row in rows:
            deal = row[0]
            if deal.account:
                deal.account_name = deal.account.name
            if deal.owner:
                deal.owner_name = deal.owner.full_name
            deal.stage = _stage_slug(row.stage_name or "")
            deals.append(deal)
        return deals, total

    @staticmethod
    async def get_deal_by_id(db: AsyncSession, deal_id: str, tenant_id: str = None) -> Optional[Deal]:
        query = (
            select(Deal, PipelineStage.name.label("stage_name"))
            .outerjoin(PipelineStage, Deal.stage_id == PipelineStage.id)
            .where(Deal.id == deal_id, Deal.is_deleted == False)
        )
        if tenant_id:
            query = query.where(Deal.tenant_id == tenant_id)
        result = await db.execute(query)
        row = result.first()
        if not row:
            return None
        deal = row[0]
        if deal.account:
            deal.account_name = deal.account.name
        if deal.owner:
            deal.owner_name = deal.owner.full_name
        deal.stage = _stage_slug(row.stage_name or "")
        return deal

    @staticmethod
    async def create_deal(db: AsyncSession, data: DealCreate, owner_id: str, tenant_id: str) -> Deal:
        # Look up the stage by slug (case-insensitive match)
        target_slug = _stage_slug(data.stage) if hasattr(data, 'stage') else None
        stage = None
        if target_slug:
            stage_result = await db.execute(select(PipelineStage).where(PipelineStage.pipeline_id == data.pipeline_id))
            for s in stage_result.scalars().all():
                if _stage_slug(s.name) == target_slug:
                    stage = s
                    break
        stage_id = stage.id if stage else None
        
        deal_data = data.model_dump()
        if 'stage' in deal_data:
            del deal_data['stage']  # Remove stage name, we use stage_id
        deal = Deal(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            tenant_id=tenant_id,
            stage_id=stage_id,
            **deal_data
        )
        db.add(deal)
        await db.commit()
        await db.refresh(deal)
        # Populate stage name for response
        if stage:
            deal.stage = _stage_slug(stage.name)
        return deal

    @staticmethod
    async def update_deal(db: AsyncSession, deal_id: str, data: DealUpdate, tenant_id: str) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id, tenant_id)
        if not deal:
            return None
        
        old_values = {k: getattr(deal, k) for k, v in data.model_dump(exclude_none=True).items()}
        update_data = data.model_dump(exclude_none=True)
        
        # Handle stage name -> stage_id conversion
        if 'stage' in update_data:
            stage_name = update_data.pop('stage')
            stage_result = await db.execute(
                select(PipelineStage).where(PipelineStage.name == stage_name)
            )
            stage = stage_result.scalar_one_or_none()
            if stage:
                deal.stage_id = stage.id
                deal.stage = stage_name
        
        for k, v in update_data.items():
            setattr(deal, k, v)
        
        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, deal.owner_id, "deal", deal.id, "updated", new_values=data.model_dump(exclude_none=True), old_values=old_values)
        return deal

    @staticmethod
    async def update_deal_stage(db: AsyncSession, deal_id: str, data: DealStageUpdate, tenant_id: str) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id, tenant_id)
        if not deal:
            return None
        
        # Look up the stage by slug (case-insensitive match)
        target_slug = _stage_slug(data.stage)
        stage_result = await db.execute(
            select(PipelineStage).where(PipelineStage.pipeline_id == deal.pipeline_id)
        )
        # Find stage with matching slug
        stage = None
        for s in stage_result.scalars().all():
            if _stage_slug(s.name) == target_slug:
                stage = s
                break
        
        if not stage:
            return None
        
        old_stage_id = deal.stage_id
        deal.stage_id = stage.id
        if data.probability is not None:
            deal.probability = data.probability
        
        if deal.stage_id != old_stage_id:
            notification = Notification(
                user_id=deal.owner_id,
                title="Deal Updated",
                body=f"Deal '{deal.title}' stage moved to {data.stage}",
                type="deal_updated",
                reference_id=deal.id,
                reference_type="deal"
            )
            db.add(notification)
    
        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        # Set the stage name for the response
        deal.stage = data.stage
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, deal.owner_id, "deal", deal.id, "updated", new_values={"stage_id": stage.id, "stage_name": data.stage})
        return deal

    @staticmethod
    async def delete_deal(db: AsyncSession, deal_id: str, tenant_id: str) -> bool:
        deal = await DealService.get_deal_by_id(db, deal_id, tenant_id)
        if not deal:
            return False
        
        deal.is_deleted = True
        deal.updated_at = datetime.utcnow()
        await db.commit()
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, deal.owner_id, "deal", deal.id, "deleted")
        return True

    @staticmethod
    async def close_won(db: AsyncSession, deal_id: str, tenant_id: str) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id, tenant_id)
        if not deal:
            return None
        deal.status = "won"
        deal.actual_close_date = date.today()
        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, deal.owner_id, "deal", deal.id, "updated", new_values={"status": "won", "actual_close_date": str(deal.actual_close_date)})
        return deal

    @staticmethod
    async def close_lost(db: AsyncSession, deal_id: str, tenant_id: str, loss_reason: str = None) -> Optional[Deal]:
        deal = await DealService.get_deal_by_id(db, deal_id, tenant_id)
        if not deal:
            return None
        deal.status = "lost"
        deal.actual_close_date = date.today()
        if loss_reason:
            deal.loss_reason = loss_reason
        deal.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(deal)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, deal.owner_id, "deal", deal.id, "updated", new_values={"status": "lost", "loss_reason": loss_reason})
        return deal

    @staticmethod
    async def get_deals_by_stage(db: AsyncSession, owner_id: Optional[str] = None) -> List[Deal]:
        query = select(Deal, PipelineStage.name.label("stage_name")).outerjoin(PipelineStage, Deal.stage_id == PipelineStage.id).where(Deal.is_deleted == False)
        if owner_id:
            query = query.where(Deal.owner_id == owner_id)
        
        result = await db.execute(query)
        rows = result.all()
        deals = []
        for row in rows:
            deal = row[0]
            if deal.account:
                deal.account_name = deal.account.name
            if deal.owner:
                deal.owner_name = deal.owner.full_name
            deal.stage = _stage_slug(row.stage_name or "")
            deals.append(deal)
        return deals
