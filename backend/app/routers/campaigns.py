from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
from typing import Optional
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.core.exceptions import NotFoundError
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.common import PaginatedResponse
from app.models.user import User
import uuid

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/", response_model=PaginatedResponse[CampaignResponse])
async def list_campaigns(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Campaign)
    total = (await db.execute(select(func.count()).select_from(Campaign))).scalar()
    campaigns = (await db.execute(query.order_by(Campaign.created_at.desc()).offset((page - 1) * limit).limit(limit))).scalars().all()
    return PaginatedResponse(data=campaigns, total=total, page=page, limit=limit)


@router.post("/", response_model=CampaignResponse, status_code=201)
async def create_campaign(data: CampaignCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_manager_or_admin)):
    campaign = Campaign(id=str(uuid.uuid4()), owner_id=current_user.id, **data.model_dump(exclude={"owner_id"}))
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, data: CampaignUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_manager_or_admin)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(campaign, k, v)
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_manager_or_admin)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    await db.delete(campaign)
    await db.commit()
    return {"message": "Campaign deleted"}


# Global search endpoint
search_router = APIRouter(prefix="/search", tags=["search"])


@search_router.get("/")
async def global_search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contacts = (await db.execute(
        select(Contact).where(
            Contact.is_deleted == False,
            or_(Contact.first_name.ilike(f"%{q}%"), Contact.last_name.ilike(f"%{q}%"), Contact.email.ilike(f"%{q}%"))
        ).limit(5)
    )).scalars().all()
    deals = (await db.execute(
        select(Deal).where(Deal.is_deleted == False, Deal.title.ilike(f"%{q}%")).limit(5)
    )).scalars().all()
    tickets = (await db.execute(
        select(Ticket).where(Ticket.is_deleted == False, Ticket.subject.ilike(f"%{q}%")).limit(5)
    )).scalars().all()
    return {
        "contacts": [{"id": c.id, "name": f"{c.first_name} {c.last_name}", "email": c.email, "type": "contact"} for c in contacts],
        "deals": [{"id": d.id, "title": d.title, "stage": d.stage, "type": "deal"} for d in deals],
        "tickets": [{"id": t.id, "ticket_number": t.ticket_number, "subject": t.subject, "type": "ticket"} for t in tickets],
    }
