from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple, Dict
from app.models.lead import Lead, LeadActivity, LeadScoreEvent
from app.models.user import User
from app.models.contact import Contact
from app.models.account import Account
from app.models.deal import Deal
from app.schemas.lead import LeadCreate, LeadUpdate
import uuid
from datetime import datetime


class LeadService:
    STATUSES = ["new", "contacted", "qualified", "nurturing", "unqualified", "converted"]
    SOURCES = ["organic", "paid_search", "social_media", "email", "referral", "campaign", "api", "manual", "imported"]
    SCORE_ACTIONS = {
        "email_opened": 10,
        "link_clicked": 20,
        "demo_requested": 50,
        "form_submitted": 30,
        "page_visited": 5,
        "inactive": -10,
        "unsubscribed": -20,
    }

    @staticmethod
    async def get_leads(
        db: AsyncSession,
        tenant_id: str,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
        source: Optional[str] = None,
        owner_id: Optional[str] = None,
        min_score: Optional[int] = None,
        max_score: Optional[int] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc"
    ) -> Tuple[List[Lead], int]:
        offset = (page -1) * limit
        query = select(Lead).options(selectinload(Lead.owner)).where(Lead.is_deleted == False, Lead.tenant_id == tenant_id)

        if search:
            query = query.where(or_(
                Lead.name.ilike(f"%{search}%"),
                Lead.email.ilike(f"%{search}%"),
                Lead.company.ilike(f"%{search}%"),
            ))
        if status:
            statuses = status.split(',')
            query = query.where(Lead.status.in_(statuses))
        if source:
            sources = source.split(',')
            query = query.where(Lead.source.in_(sources))
        if owner_id:
            query = query.where(Lead.owner_id == owner_id)
        if min_score is not None:
            query = query.where(Lead.score >= min_score)
        if max_score is not None:
            query = query.where(Lead.score <= max_score)

        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()

        col = getattr(Lead, sort_by, Lead.created_at)
        order = col.desc() if sort_dir == "desc" else col.asc()
        query = query.order_by(order).offset(offset).limit(limit)

        result = await db.execute(query)
        leads = result.scalars().all()

        for lead in leads:
            if lead.owner:
                lead.owner_name = lead.owner.full_name
                lead.owner_avatar = getattr(lead.owner, 'avatar_url', None)
            else:
                lead.owner_name = None
                lead.owner_avatar = None

        return leads, total

    @staticmethod
    async def get_leads_by_stage(
        db: AsyncSession, owner_id: Optional[str] = None
    ) -> Dict[str, List[Lead]]:
        query = select(Lead).options(selectinload(Lead.owner)).where(Lead.is_deleted == False)
        if owner_id:
            query = query.where(Lead.owner_id == owner_id)
        query = query.order_by(Lead.created_at.desc())
        result = await db.execute(query)
        leads = result.scalars().all()

        for lead in leads:
            if lead.owner:
                lead.owner_name = lead.owner.full_name
                lead.owner_avatar = getattr(lead.owner, 'avatar_url', None)
            else:
                lead.owner_name = None
                lead.owner_avatar = None

        stages = {status: [] for status in LeadService.STATUSES}
        for lead in leads:
            if lead.status in stages:
                stages[lead.status].append(lead)
        return stages

    @staticmethod
    async def get_lead_by_id(db: AsyncSession, lead_id: str, tenant_id: str = None) -> Optional[Lead]:
        query = (
            select(Lead)
            .options(selectinload(Lead.owner), selectinload(Lead.campaign))
            .where(Lead.id == lead_id, Lead.is_deleted == False)
        )
        if tenant_id:
            query = query.where(Lead.tenant_id == tenant_id)
        result = await db.execute(query)
        lead = result.scalar_one_or_none()
        if lead and lead.owner:
            lead.owner_name = lead.owner.full_name
            lead.owner_avatar = getattr(lead.owner, 'avatar_url', None)
        return lead

    @staticmethod
    async def create_lead(db: AsyncSession, data: LeadCreate, owner_id: str, tenant_id: str) -> Lead:
        lead = Lead(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            tenant_id=tenant_id,
            **data.model_dump()
        )
        db.add(lead)
        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def update_lead(db: AsyncSession, lead_id: str, data: LeadUpdate, tenant_id: str) -> Optional[Lead]:
        lead = await LeadService.get_lead_by_id(db, lead_id, tenant_id)
        if not lead:
            return None

        old_values = {k: getattr(lead, k) for k, v in data.model_dump(exclude_none=True).items()}
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(lead, k, v)

        lead.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(lead)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, lead.owner_id, "lead", lead.id, "updated", new_values=data.model_dump(exclude_none=True), old_values=old_values)
        return lead

    @staticmethod
    async def update_lead_status(db: AsyncSession, lead_id: str, status: str) -> Optional[Lead]:
        lead = await LeadService.get_lead_by_id(db, lead_id)
        if not lead:
            return None

        lead.status = status
        lead.updated_at = datetime.utcnow()

        if status == "converted":
            lead.converted_at = datetime.utcnow()

        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def delete_lead(db: AsyncSession, lead_id: str, tenant_id: str) -> bool:
        lead = await LeadService.get_lead_by_id(db, lead_id, tenant_id)
        if not lead:
            return False

        lead.is_deleted = True
        lead.updated_at = datetime.utcnow()
        await db.commit()
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, lead.owner_id, "lead", lead.id, "deleted")
        return True

    @staticmethod
    async def add_activity(
        db: AsyncSession,
        lead_id: str,
        activity_type: str,
        subject: str,
        content: Optional[str] = None,
        created_by: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> LeadActivity:
        activity = LeadActivity(
            id=str(uuid.uuid4()),
            lead_id=lead_id,
            activity_type=activity_type,
            subject=subject,
            content=content,
            created_by=created_by,
            event_metadata=metadata
        )
        db.add(activity)

        lead = await LeadService.get_lead_by_id(db, lead_id)
        if lead:
            lead.last_activity_at = datetime.utcnow()
            lead.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def get_lead_activities(db: AsyncSession, lead_id: str) -> List[LeadActivity]:
        result = await db.execute(
            select(LeadActivity)
            .where(LeadActivity.lead_id == lead_id)
            .order_by(LeadActivity.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def update_score(db: AsyncSession, lead_id: str, action: str, score_delta: Optional[int] = None, created_by: Optional[str] = None) -> Optional[Lead]:
        lead = await LeadService.get_lead_by_id(db, lead_id)
        if not lead:
            return None

        if score_delta is None:
            score_delta = LeadService.SCORE_ACTIONS.get(action, 0)

        score_event = LeadScoreEvent(
            id=str(uuid.uuid4()),
            lead_id=lead_id,
            action=action,
            score_delta=score_delta,
            description=f"Action: {action}, Delta: {score_delta}"
        )
        db.add(score_event)

        lead.score = max(0, lead.score + score_delta)
        lead.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def get_score_events(db: AsyncSession, lead_id: str) -> List[LeadScoreEvent]:
        result = await db.execute(
            select(LeadScoreEvent)
            .where(LeadScoreEvent.lead_id == lead_id)
            .order_by(LeadScoreEvent.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def bulk_update(db: AsyncSession, ids: List[str], action: str, value: Optional[str] = None) -> int:
        query = select(Lead).where(Lead.id.in_(ids), Lead.is_deleted == False)
        result = await db.execute(query)
        leads = result.scalars().all()

        count = 0
        for lead in leads:
            if action == "change_status" and value:
                lead.status = value
                count += 1
            elif action == "assign_owner" and value:
                lead.owner_id = value
                count += 1
            elif action == "delete":
                lead.is_deleted = True
                count += 1
            lead.updated_at = datetime.utcnow()

        await db.commit()
        return count

    @staticmethod
    async def convert_lead(
        db: AsyncSession,
        lead_id: str,
        create_contact: bool = True,
        create_account: bool = True,
        create_deal: bool = True,
        deal_title: Optional[str] = None,
        deal_value: Optional[float] = None
    ) -> dict:
        lead = await LeadService.get_lead_by_id(db, lead_id)
        if not lead:
            return {"error": "Lead not found"}

        result = {
            "contact_id": None,
            "account_id": None,
            "deal_id": None,
            "message": "Conversion completed"
        }

        contact_id = None
        account_id = None

        if create_contact:
            name_parts = lead.name.split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            contact = Contact(
                id=str(uuid.uuid4()),
                first_name=first_name,
                last_name=last_name,
                email=lead.email,
                phone=lead.phone,
                job_title=lead.job_title,
                owner_id=lead.owner_id,
                lead_score=lead.score,
                contact_stage="customer",
                source=lead.source,
                notes=lead.notes,
                is_deleted=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(contact)
            contact_id = contact.id
            result["contact_id"] = contact_id

        if create_account and lead.company:
            account = Account(
                id=str(uuid.uuid4()),
                name=lead.company,
                website=lead.website,
                industry=lead.industry,
                owner_id=lead.owner_id,
                phone=lead.phone,
                is_deleted=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(account)
            account_id = account.id
            result["account_id"] = account_id

            if contact_id:
                contact_result = await db.execute(select(Contact).where(Contact.id == contact_id))
                contact_obj = contact_result.scalar_one_or_none()
                if contact_obj:
                    contact_obj.account_id = account_id

        if create_deal:
            deal = Deal(
                id=str(uuid.uuid4()),
                title=deal_title or f"Deal from {lead.name}",
                value=deal_value,
                stage="prospecting",
                probability=20,
                contact_id=contact_id,
                account_id=account_id,
                owner_id=lead.owner_id,
                is_deleted=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(deal)
            result["deal_id"] = deal.id

        lead.status = "converted"
        lead.converted_at = datetime.utcnow()
        lead.updated_at = datetime.utcnow()

        await db.commit()
        return result

    @staticmethod
    async def create_leads_bulk(db: AsyncSession, data: List[LeadCreate], owner_id: str) -> Tuple[int, List[str]]:
        count = 0
        errors = []

        for lead_data in data:
            try:
                lead = Lead(
                    id=str(uuid.uuid4()),
                    owner_id=owner_id,
                    **lead_data.model_dump()
                )
                db.add(lead)
                count += 1
            except Exception as e:
                errors.append(f"Failed to import: {lead_data.name} - {str(e)}")

        await db.commit()
        return count, errors

    @staticmethod
    async def get_lead_stats(db: AsyncSession, owner_id: Optional[str] = None) -> dict:
        query = select(Lead).where(Lead.is_deleted == False)
        if owner_id:
            query = query.where(Lead.owner_id == owner_id)

        total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()

        status_counts = {}
        for status in LeadService.STATUSES:
            status_q = query.where(Lead.status == status)
            count = (await db.execute(select(func.count()).select_from(status_q.subquery()))).scalar()
            status_counts[status] = count

        avg_score_q = select(func.avg(Lead.score)).select_from(query.where(Lead.score > 0))
        avg_score = (await db.execute(avg_score_q)).scalar() or 0

        source_q = select(Lead.source, func.count()).select_from(query).where(Lead.source.isnot(None)).group_by(Lead.source)
        source_counts = dict((await db.execute(source_q)).all())

        return {
            "total": total,
            "by_status": status_counts,
            "avg_score": round(avg_score, 1),
            "by_source": source_counts
        }
