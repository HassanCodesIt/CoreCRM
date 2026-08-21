from fastapi import APIRouter, Depends, Query
from fastapi import Body
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import uuid4
from typing import Optional

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.lead import Lead
from app.models.contact import Contact
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadRead,
    LeadActivityCreate, LeadActivityRead,
    LeadScoreEventRead, LeadBulkUpdate
)
from app.schemas.contact import ContactRead
from app.services.audit_service import log_event
from app.models.lead_sla import LeadSLA
from app.config import settings
from app.services.lead_routing_service import LeadRoutingService
from app.services.lead_service import LeadService
from app.services.ai_service import ai_service

router = APIRouter(prefix="/leads")

# Valid status transitions for Kanban-like workflow
VALID_STATUS_TRANSITIONS = {
    'new': 'contacted',
    'contacted': 'qualified',
    'qualified': 'lost',
    'lost': None,
}

@router.get("/", response_model=dict)
async def list_leads(
    skip: int = 0,
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    query = select(Lead).where(Lead.tenant_id == current_user.tenant_id).order_by(Lead.created_at.desc())
    if status:
        query = query.where(Lead.status == status)
    if source:
        query = query.where(Lead.source == source)
    if q:
        query = query.where(
            Lead.first_name.ilike(f"%{q}%") | Lead.last_name.ilike(f"%{q}%") | Lead.email.ilike(f"%{q}%")
        )
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    leads = result.scalars().all()
    return {"items": [LeadRead.model_validate(l) for l in leads], "total": total, "skip": skip, "limit": limit}

@router.get("/stats", response_model=dict)
async def get_lead_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    total = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))).scalar_one()
    status_counts = {}
    statuses = ['new', 'contacted', 'qualified', 'nurturing', 'unqualified', 'converted']
    for status in statuses:
        count = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.status == status))).scalar_one()
        status_counts[status] = count
    avg_result = (await db.execute(select(func.avg(Lead.score)).where(Lead.tenant_id == tenant_id))).scalar_one()
    avg_score = float(avg_result) if avg_result else 0.0
    return {
        "total": total,
        "by_status": status_counts,
        "avg_score": round(avg_score, 1)
    }

@router.post("/", response_model=LeadRead, status_code=201)
async def create_lead(
    lead_in: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    # Lead routing: assign to owner based on routing strategy when creating a lead
    routing_owner_id = None
    try:
        routing_owner_id = await LeadRoutingService(db, current_user.tenant_id).pick_owner_id()
    except Exception:
        routing_owner_id = current_user.id
    owner_id = routing_owner_id or current_user.id
    payload = lead_in.model_dump()
    name = payload.get("name") or ""
    first_name = payload.get("first_name") or ""
    last_name = payload.get("last_name") or ""
    
    if (not first_name or not last_name) and name:
        parts = name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""
        payload["first_name"] = first_name
        payload["last_name"] = last_name
    elif not name:
        payload["name"] = f"{first_name} {last_name}".strip()

    # Sync company and company_name
    company = payload.get("company")
    company_name = payload.get("company_name")
    if company and not company_name:
        payload["company_name"] = company
    elif company_name and not company:
        payload["company"] = company_name

    lead = Lead(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=owner_id,
        **payload
    )
    db.add(lead)
    await log_event(db, current_user.tenant_id, current_user.id, "lead", lead.id, "created", new_values=lead_in.model_dump())
    # Initialize SLA for this lead
    try:
        from datetime import datetime as _dt
        sla = LeadSLA(
            lead_id=lead.id,
            assigned_at=_dt.utcnow(),
            response_due_at=_dt.utcnow() + timedelta(hours=settings.SLA_WINDOW_HOURS),
            status="on_time",
        )
        db.add(sla)
    except Exception:
        pass
    await db.commit()
    await db.refresh(lead)
    return lead

@router.get("/{lead_id}", response_model=LeadRead)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    return lead

@router.get("/{lead_id}/sla", response_model=dict)
async def get_lead_sla(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(
        select(LeadSLA)
        .join(Lead, LeadSLA.lead_id == Lead.id)
        .where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id)
    )
    sla = result.scalar_one_or_none()
    if not sla:
        raise NotFoundError("SLA not found")
    return {
        "lead_id": sla.lead_id,
        "assigned_at": sla.assigned_at,
        "response_due_at": sla.response_due_at,
        "status": sla.status,
    }

    

@router.patch("/{lead_id}", response_model=LeadRead)
async def update_lead(
    lead_id: str,
    lead_in: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    if lead.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this lead")
    old_values = {k: getattr(lead, k) for k in lead_in.model_dump(exclude_unset=True).keys() if hasattr(lead, k)}
    update_data = lead_in.model_dump(exclude_unset=True)
    # Sync company and company_name
    if "company" in update_data and "company_name" not in update_data:
        update_data["company_name"] = update_data["company"]
    elif "company_name" in update_data and "company" not in update_data:
        update_data["company"] = update_data["company_name"]

    for key, value in update_data.items():
        setattr(lead, key, value)
    # If status updated, enforce transitions and update status_changed_at
    if 'status' in update_data:
        cur = lead.status
        next_status = update_data.get('status')
        allowed = VALID_STATUS_TRANSITIONS.get(cur)
        if next_status not in (allowed, None):
            from app.core.exceptions import BadRequestError
            raise BadRequestError("Invalid status transition")
        lead.status_changed_at = datetime.utcnow()
    lead.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "lead", lead.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(lead)
    return lead

@router.patch("/{lead_id}/status", response_model=LeadRead)
async def update_lead_status(
    lead_id: str,
    status: dict = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    # Expects body: {"status": "new_status"}
    new_status = status.get("status") if isinstance(status, dict) else None
    if not new_status:
        raise NotFoundError("Status not provided")
    # Validate allowed transitions: new -> contacted -> qualified -> lost
    valid_next = {
        'new': 'contacted',
        'contacted': 'qualified',
        'qualified': 'lost',
        'lost': None
    }
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    if lead.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this lead")
    lead.status = new_status
    lead.status_changed_at = datetime.utcnow()
    lead.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lead)
    return lead

@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    if lead.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this lead")
    await db.delete(lead)
    await log_event(db, current_user.tenant_id, current_user.id, "lead", lead.id, "deleted")
    await db.commit()
    return

@router.post("/{lead_id}/convert", response_model=ContactRead, status_code=201)
async def convert_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    contact = Contact(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        company_name=lead.company_name,
        title=lead.title,
        lead_source=lead.source,
        status="active"
    )
    db.add(contact)
    lead.converted = True
    lead.converted_contact_id = contact.id
    lead.converted_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "contact", contact.id, "created", new_values={"source": "lead_conversion", "lead_id": lead_id})
    await log_event(db, current_user.tenant_id, current_user.id, "lead", lead.id, "updated", new_values={"converted": True, "converted_contact_id": contact.id})
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/{lead_id}/activities/", response_model=list[LeadActivityRead])
async def list_lead_activities(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Lead not found")
    activities = await LeadService.get_lead_activities(db, lead_id)
    return activities


@router.post("/{lead_id}/activities/", response_model=LeadActivityRead, status_code=201)
async def create_lead_activity(
    lead_id: str,
    activity_in: LeadActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Lead not found")
    activity = await LeadService.add_activity(
        db,
        lead_id,
        activity_in.activity_type,
        activity_in.subject,
        activity_in.content,
        created_by=current_user.id,
        metadata=activity_in.event_metadata
    )
    return activity


@router.get("/{lead_id}/score-events/", response_model=list[LeadScoreEventRead])
async def list_lead_score_events(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Lead not found")
    events = await LeadService.get_score_events(db, lead_id)
    return events


@router.post("/{lead_id}/score", response_model=LeadRead)
async def update_lead_score(
    lead_id: str,
    action: str = Query(...),
    score_delta: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Lead not found")
    lead = await LeadService.update_score(db, lead_id, action, score_delta=score_delta, created_by=current_user.id)
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


@router.post("/{lead_id}/ai-summary/")
async def generate_lead_ai_summary(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    activities = await LeadService.get_lead_activities(db, lead_id)
    
    lead_context = (
        f"Name: {lead.first_name} {lead.last_name}\n"
        f"Company: {lead.company_name or 'N/A'}\n"
        f"Email: {lead.email or 'N/A'}\n"
        f"Phone: {lead.phone or 'N/A'}\n"
        f"Title: {lead.title or 'N/A'}\n"
        f"Source: {lead.source or 'N/A'}\n"
        f"Status: {lead.status}\n"
        f"Score: {lead.score}\n"
        f"Notes: {lead.notes or 'N/A'}"
    )
    
    summary = await ai_service.summarize_lead(lead_context, activities)
    lead.ai_summary = summary
    await db.commit()
    return {"summary": summary}


@router.post("/{lead_id}/ai-qualify/")
async def run_lead_ai_qualification(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    
    activities = await LeadService.get_lead_activities(db, lead_id)
    score_events = await LeadService.get_score_events(db, lead_id)
    
    lead_context = (
        f"Name: {lead.first_name} {lead.last_name}\n"
        f"Company: {lead.company_name or 'N/A'}\n"
        f"Email: {lead.email or 'N/A'}\n"
        f"Phone: {lead.phone or 'N/A'}\n"
        f"Title: {lead.title or 'N/A'}\n"
        f"Source: {lead.source or 'N/A'}\n"
        f"Status: {lead.status}\n"
        f"Score: {lead.score}\n"
        f"Notes: {lead.notes or 'N/A'}"
    )
    
    qualification = await ai_service.qualify_lead(lead_context, activities, score_events)
    lead.ai_qualification = qualification.get("qualification")
    await db.commit()
    return qualification


@router.post("/{lead_id}/ai-insights/")
async def get_lead_ai_insights(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    
    activities = await LeadService.get_lead_activities(db, lead_id)
    score_events = await LeadService.get_score_events(db, lead_id)
    
    lead_context = (
        f"Name: {lead.first_name} {lead.last_name}\n"
        f"Company: {lead.company_name or 'N/A'}\n"
        f"Email: {lead.email or 'N/A'}\n"
        f"Phone: {lead.phone or 'N/A'}\n"
        f"Title: {lead.title or 'N/A'}\n"
        f"Source: {lead.source or 'N/A'}\n"
        f"Status: {lead.status}\n"
        f"Score: {lead.score}\n"
        f"Notes: {lead.notes or 'N/A'}"
    )
    
    insights = await ai_service.get_lead_insights(lead_context, activities, score_events)
    lead.ai_insights = insights
    await db.commit()
    return insights


@router.post("/{lead_id}/ai-email/")
async def generate_lead_ai_email(
    lead_id: str,
    email_type: str = Query(...),
    tone: str = Query(...),
    context: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead not found")
    
    activities = await LeadService.get_lead_activities(db, lead_id)
    email = await ai_service.generate_outreach_email(lead, activities, email_type, tone, context)
    return email


@router.patch("/bulk-update/")
async def bulk_update_leads(
    bulk_in: LeadBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if current_user.role not in ["admin", "manager"] and bulk_in.action == "delete":
        raise ForbiddenError("Not authorized to perform bulk delete")
    
    count = await LeadService.bulk_update(db, bulk_in.ids, bulk_in.action, bulk_in.value)
    return {"updated": count}


@router.post("/import/")
async def import_leads(
    leads_in: list[LeadCreate],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    count, errors = await LeadService.create_leads_bulk(db, leads_in, owner_id=current_user.id)
    return {"imported": count, "errors": errors}

