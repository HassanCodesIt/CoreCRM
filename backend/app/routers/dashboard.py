from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload
from datetime import datetime, date, timedelta
from calendar import monthrange
from typing import List, Dict, Any

from app.core.dependencies import get_current_active_user, get_db
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.models.activity import Activity
from app.models.pipeline import Pipeline, PipelineStage
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services.ai_service import ai_service

router = APIRouter(prefix="/dashboard")

@router.get("/stats", response_model=DashboardStats)
@router.get("/summary", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    # Total contacts (status != deleted)
    total_contacts = (await db.execute(select(func.count(Contact.id)).where(Contact.tenant_id == tenant_id, Contact.status != "deleted"))).scalar_one()
    # Total leads
    total_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))).scalar_one()
    # Total deals
    total_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id))).scalar_one()
    # Open deals
    open_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "open"))).scalar_one()
    # Total pipeline value (open deals)
    total_pipeline_value = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "open"))).scalar_one() or 0.0
    # Current month
    today = date.today()
    first_day = today.replace(day=1)
    last_day = today.replace(day=monthrange(today.year, today.month)[1])
    # Leads this month
    leads_this_month = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.created_at >= first_day, Lead.created_at <= last_day))).scalar_one()
    # Won deals this month
    won_deals_this_month = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "won", Deal.actual_close_date >= first_day, Deal.actual_close_date <= last_day))).scalar_one()
    # Revenue this month (won deals)
    revenue_this_month = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "won", Deal.actual_close_date >= first_day, Deal.actual_close_date <= last_day))).scalar_one() or 0.0
    # Total all-time revenue (all won deals)
    total_revenue = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one() or 0.0
    # Open tickets
    open_tickets = (await db.execute(select(func.count(Ticket.id)).where(Ticket.tenant_id == tenant_id, Ticket.status == "open"))).scalar_one()
    # Conversion rate (converted leads / total leads) - as percentage
    converted_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.converted == True))).scalar_one()
    conversion_rate = float(round(converted_leads / total_leads * 100)) if total_leads > 0 else 0.0
    # Rotting deals
    rotting_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "open", Deal.is_rotting == True))).scalar_one()

    return DashboardStats(
        total_contacts=total_contacts,
        total_leads=total_leads,
        total_deals=total_deals,
        open_deals=open_deals,
        total_pipeline_value=float(total_pipeline_value),
        won_deals_this_month=won_deals_this_month,
        revenue_this_month=float(revenue_this_month),
        total_revenue=float(total_revenue),
        leads_this_month=leads_this_month,
        open_tickets=open_tickets,
        conversion_rate=conversion_rate,
        rotting_deals=rotting_deals
    )

@router.get("/pipeline-overview", response_model=List[Dict])
@router.get("/pipeline", response_model=List[Dict])
async def get_pipeline_overview(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    pipelines = (await db.execute(select(Pipeline).where(Pipeline.tenant_id == tenant_id).options(selectinload(Pipeline.stages)))).scalars().all()
    result = []
    for pipeline in pipelines:
        stages_data = []
        for stage in pipeline.stages:
            deal_count = (await db.execute(select(func.count(Deal.id)).where(Deal.stage_id == stage.id, Deal.tenant_id == tenant_id))).scalar_one()
            total_value = (await db.execute(select(func.sum(Deal.value)).where(Deal.stage_id == stage.id, Deal.tenant_id == tenant_id))).scalar_one() or 0.0
            stages_data.append({
                "stage_id": stage.id,
                "stage_name": stage.name,
                "deal_count": deal_count,
                "total_value": float(total_value)
            })
        result.append({
            "pipeline_id": pipeline.id,
            "pipeline_name": pipeline.name,
            "stages": stages_data
        })
    return result

@router.get("/recent-activities", response_model=Dict[str, Any])
@router.get("/activities", response_model=Dict[str, Any])
async def get_recent_activities(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
    skip: int = Query(0),
    limit: int = Query(20, le=50)
):
    tenant_id = current_user.tenant_id
    # Get total count
    total = (await db.execute(select(func.count(Activity.id)).where(Activity.tenant_id == tenant_id))).scalar_one()
    # Get paginated results
    activities = (await db.execute(
        select(Activity).where(Activity.tenant_id == tenant_id).order_by(Activity.created_at.desc()).offset(skip).limit(limit)
    )).scalars().all()
    return {
        "items": [{
            "id": a.id,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "activity_type": a.activity_type,
            "subject": a.subject,
            "created_at": a.created_at
        } for a in activities],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/deals-closing-soon", response_model=Dict[str, Any])
async def get_deals_closing_soon(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
    days: int = Query(7, ge=1, le=30),
    skip: int = Query(0),
    limit: int = Query(20, le=50)
):
    tenant_id = current_user.tenant_id
    cutoff_date = date.today() + timedelta(days=days)
    # Get total count
    total = (await db.execute(
        select(func.count(Deal.id)).where(
            Deal.tenant_id == tenant_id,
            Deal.status == "open",
            Deal.expected_close_date != None,
            Deal.expected_close_date <= cutoff_date
        )
    )).scalar_one()
    # Get paginated results
    deals = (await db.execute(
        select(Deal).where(
            Deal.tenant_id == tenant_id,
            Deal.status == "open",
            Deal.expected_close_date != None,
            Deal.expected_close_date <= cutoff_date
        ).order_by(Deal.expected_close_date).offset(skip).limit(limit)
    )).scalars().all()
    return {
        "items": [{
            "id": d.id,
            "title": d.title,
            "value": float(d.value) if d.value else 0.0,
            "expected_close_date": d.expected_close_date,
            "stage_id": d.stage_id,
            "contact_id": d.contact_id,
            "account_id": d.account_id,
            "probability": d.stage.probability if d.stage else 0,
            "is_rotting": d.is_rotting
        } for d in deals],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/tickets", response_model=Dict[str, Any])
async def get_dashboard_tickets(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
    status: str = Query("open"),
    skip: int = Query(0),
    limit: int = Query(20, le=50)
):
    tenant_id = current_user.tenant_id
    query = select(Ticket).where(Ticket.tenant_id == tenant_id)
    if status != "all":
        query = query.where(Ticket.status == status)
    # Get total count
    total = (await db.execute(select(func.count(Ticket.id)).where(Ticket.tenant_id == tenant_id, Ticket.status == status if status != "all" else True))).scalar_one()
    # Get paginated results
    tickets = (await db.execute(query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit))).scalars().all()
    return {
        "items": [{
            "id": t.id,
            "subject": t.subject,
            "status": t.status,
            "priority": t.priority,
            "contact_id": t.contact_id,
            "account_id": t.account_id,
            "created_at": t.created_at
        } for t in tickets],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/ticket-stats", response_model=Dict[str, Any])
async def get_ticket_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    # Get all tickets for this tenant
    tickets = (await db.execute(
        select(Ticket).where(Ticket.tenant_id == tenant_id)
    )).scalars().all()
    
    # Calculate stats manually
    by_status = {}
    resolved_tickets = []
    
    for ticket in tickets:
        status = ticket.status or 'unknown'
        by_status[status] = by_status.get(status, 0) + 1
        
        if status == 'resolved' and ticket.resolved_at and ticket.created_at:
            # Calculate resolution time in hours
            delta = ticket.resolved_at - ticket.created_at
            hours = delta.total_seconds() / 3600
            resolved_tickets.append(hours)
    
    # Calculate stats
    open_count = by_status.get('open', 0)
    pending_count = by_status.get('pending', 0)
    resolved_count = by_status.get('resolved', 0)
    avg_resolution = sum(resolved_tickets) / len(resolved_tickets) if resolved_tickets else 0
    
    # Count SLA breaches (> 24 hours)
    sla_breach_count = len([h for h in resolved_tickets if h > 24])
    
    return {
        "by_status": by_status,
        "open_count": open_count,
        "pending": pending_count,
        "resolved": resolved_count,
        "avg_resolution_hours": round(avg_resolution, 2),
        "sla_breach_count": sla_breach_count
    }

@router.get("/top-reps", response_model=Dict[str, Any])
async def get_top_reps(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
    skip: int = Query(0),
    limit: int = Query(10, le=50)
):
    tenant_id = current_user.tenant_id
    # Get total count of users with deals
    total = (await db.execute(
        select(func.count(func.distinct(User.id))).outerjoin(Deal, and_(Deal.owner_id == User.id, Deal.tenant_id == tenant_id)).where(User.tenant_id == tenant_id)
    )).scalar_one()
    # Get users with deal counts and values
    results = (await db.execute(
        select(
            User.id,
            User.full_name,
            func.count(Deal.id).label('deal_count'),
            func.sum(Deal.value).label('total_value'),
            func.sum(case((Deal.status == "won", 1), else_=0)).label('won_count')
        )
        .outerjoin(Deal, and_(Deal.owner_id == User.id, Deal.tenant_id == tenant_id))
        .where(User.tenant_id == tenant_id)
        .group_by(User.id, User.full_name)
        .order_by(func.count(Deal.id).desc())
        .offset(skip)
        .limit(limit)
    )).all()
    return {
        "items": [{
            "user_id": r[0],
            "full_name": r[1],
            "deal_count": r[2],
            "total_value": float(r[3]) if r[3] else 0.0,
            "won_count": r[4]
        } for r in results],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/ai-insight", response_model=Dict[str, Any])
async def get_ai_insight(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    
    # Total contacts
    total_contacts = (await db.execute(select(func.count(Contact.id)).where(Contact.tenant_id == tenant_id, Contact.status != "deleted"))).scalar_one()
    # Total leads
    total_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))).scalar_one()
    # Total deals
    total_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id))).scalar_one()
    # Open deals
    open_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "open"))).scalar_one()
    # Total pipeline value
    total_pipeline_value = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "open"))).scalar_one() or 0.0
    # Open tickets
    open_tickets = (await db.execute(select(func.count(Ticket.id)).where(Ticket.tenant_id == tenant_id, Ticket.status == "open"))).scalar_one()
    # Total all-time revenue
    total_revenue = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one() or 0.0
    
    # Calculate conversion rate
    converted_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.converted == True))).scalar_one()
    conversion_rate = float(round(converted_leads / total_leads * 100)) if total_leads > 0 else 0.0

    rotting_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "open", Deal.is_rotting == True))).scalar_one()

    context = (
        f"Total Contacts: {total_contacts}\n"
        f"Total Leads: {total_leads}\n"
        f"Total Deals: {total_deals} ({open_deals} open)\n"
        f"Total Pipeline Value: ${total_pipeline_value:,.2f}\n"
        f"Total Revenue: ${total_revenue:,.2f}\n"
        f"Open Support Tickets: {open_tickets}\n"
        f"Rotting Deals (no activity): {rotting_deals}\n"
        f"Conversion Rate: {int(conversion_rate)}%"
    )
    
    insight_text = await ai_service.get_insight(context)
    insights = [s.strip() for s in insight_text.split(". ") if s.strip()]
    insights = [s if s.endswith(".") else s + "." for s in insights]

    return {
        "insights": insights,
        "recommendations": [
            "Focus on high-scoring leads first",
            "Review stalled deals in negotiation stage"
        ]
    }

@router.get("/funnel", response_model=Dict[str, Any])
async def get_sales_funnel(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    # Count leads
    total_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))).scalar_one()
    converted_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.converted == True))).scalar_one()
    # Count contacts created from leads
    contacts_from_leads = (await db.execute(select(func.count(Contact.id)).where(Contact.tenant_id == tenant_id, Contact.lead_source == "lead_conversion"))).scalar_one()
    # Count deals
    total_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id))).scalar_one()
    won_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one()
    # Calculate values
    pipeline_value = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "open"))).scalar_one() or 0.0
    won_value = (await db.execute(select(func.sum(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one() or 0.0
    return {
        "leads": {
            "total": total_leads,
            "converted": converted_leads,
            "conversion_rate": round(converted_leads / total_leads * 100) if total_leads > 0 else 0
        },
        "contacts": {
            "from_leads": contacts_from_leads
        },
        "deals": {
            "total": total_deals,
            "won": won_deals,
            "win_rate": (won_deals / total_deals * 100) if total_deals > 0 else 0,
            "pipeline_value": float(pipeline_value),
            "won_value": float(won_value)
        }
    }

@router.get("/recent-leads", response_model=Dict[str, Any])
async def get_recent_leads(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
    skip: int = Query(0),
    limit: int = Query(20, le=50)
):
    tenant_id = current_user.tenant_id
    # Get total count
    total = (await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))).scalar_one()
    # Get paginated results
    leads = (await db.execute(
        select(Lead).where(Lead.tenant_id == tenant_id).order_by(Lead.created_at.desc()).offset(skip).limit(limit)
    )).scalars().all()
    return {
        "items": [{
            "id": l.id,
            "first_name": l.first_name,
            "last_name": l.last_name,
            "full_name": f"{l.first_name} {l.last_name}",
            "email": l.email,
            "company_name": l.company_name,
            "company": l.company_name or l.company,
            "lead_source": l.source,
            "status": l.status,
            "contact_stage": l.status,
            "owner_name": l.owner.full_name if l.owner else "Unassigned",
            "score": l.score,
            "created_at": l.created_at
        } for l in leads],
        "total": total,
        "skip": skip,
        "limit": limit
    }
