from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from uuid import uuid4
from typing import Optional

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/campaigns")

@router.get("/", response_model=dict)
async def list_campaigns(
    skip: int = 0,
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    query = select(Campaign).where(Campaign.tenant_id == current_user.tenant_id).order_by(Campaign.created_at.desc())
    if status:
        query = query.where(Campaign.status == status)
    if q:
        query = query.where(Campaign.name.ilike(f"%{q}%") | Campaign.subject.ilike(f"%{q}%"))
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()
    return {"items": [CampaignRead.model_validate(c) for c in campaigns], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=CampaignRead, status_code=201)
async def create_campaign(
    campaign_in: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    campaign = Campaign(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        status=campaign_in.status or "draft",
        subject=campaign_in.subject or campaign_in.name,
        body=campaign_in.body or campaign_in.description or "",
        **campaign_in.model_dump(exclude={"status", "subject", "body"})
    )
    db.add(campaign)
    await log_event(db, current_user.tenant_id, current_user.id, "campaign", campaign.id, "created", new_values=campaign_in.model_dump())
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.get("/{campaign_id}", response_model=CampaignRead)
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    return campaign

@router.patch("/{campaign_id}", response_model=CampaignRead)
async def update_campaign(
    campaign_id: str,
    campaign_in: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    if campaign.status != "draft":
        raise ForbiddenError("Can only update draft campaigns")
    old_values = {k: getattr(campaign, k) for k in campaign_in.model_dump(exclude_unset=True).keys()}
    update_data = campaign_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(campaign, key, value)
    campaign.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "campaign", campaign.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    await db.delete(campaign)
    await log_event(db, current_user.tenant_id, current_user.id, "campaign", campaign.id, "deleted")
    await db.commit()
    return

@router.post("/{campaign_id}/send", response_model=CampaignRead)
async def send_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.tenant_id == current_user.tenant_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise NotFoundError("Campaign not found")
    # Count active contacts
    contact_count = await db.execute(select(func.count(Contact.id)).where(Contact.tenant_id == current_user.tenant_id, Contact.status == "active"))
    campaign.status = "sent"
    campaign.sent_at = datetime.utcnow()
    campaign.recipient_count = contact_count.scalar_one()
    campaign.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "campaign", campaign.id, "updated", new_values={"status": "sent", "sent_at": str(campaign.sent_at), "recipient_count": campaign.recipient_count})
    await db.commit()
    await db.refresh(campaign)
    return campaign
