from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, date
from decimal import Decimal
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.models.activity import Activity
from app.models.user import User
from app.services.ai_service import AIService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_contacts = (await db.execute(select(func.count()).select_from(Contact).where(Contact.is_deleted == False))).scalar()
    
    # Leads this month
    month_start = date.today().replace(day=1)
    month_start_dt = datetime.combine(month_start, datetime.min.time())
    leads_this_month = (await db.execute(
        select(func.count()).select_from(Contact).where(Contact.is_deleted == False, Contact.created_at >= month_start_dt)
    )).scalar()

    # Deals metrics
    total_deals = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False))).scalar()
    active_deals = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False, Deal.stage.notin_(["closed_won", "closed_lost"])))).scalar()
    
    closed_won_deals = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False, Deal.stage == "closed_won"))).scalar()
    
    # Conversion Rate: (closed_won / total_deals) * 100
    conversion_rate = round((closed_won_deals / total_deals * 100), 1) if total_deals > 0 else 0.0

    # Revenue
    total_revenue_result = await db.execute(select(func.sum(Deal.value)).where(Deal.stage == "closed_won", Deal.is_deleted == False))
    total_revenue = total_revenue_result.scalar() or Decimal(0)
    
    revenue_this_month_result = await db.execute(
        select(func.sum(Deal.value)).where(Deal.stage == "closed_won", Deal.is_deleted == False, Deal.updated_at >= month_start_dt)
    )
    revenue_this_month = revenue_this_month_result.scalar() or Decimal(0)

    open_tickets = (await db.execute(select(func.count()).select_from(Ticket).where(Ticket.status == "open", Ticket.is_deleted == False))).scalar()

    return {
        "total_contacts": total_contacts,
        "leads_this_month": leads_this_month,
        "total_deals": active_deals, # frontend expects active_deals here for "Active Deals" card
        "total_deals_all": total_deals,
        "conversion_rate": conversion_rate,
        "total_revenue": float(total_revenue),
        "revenue_this_month": float(revenue_this_month),
        "open_tickets": open_tickets,
    }


@router.get("/pipeline")
async def get_pipeline_by_stage(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stages = ["prospecting", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    result = {}
    for stage in stages:
        count = (await db.execute(select(func.count()).select_from(Deal).where(Deal.stage == stage, Deal.is_deleted == False))).scalar()
        val = (await db.execute(select(func.sum(Deal.value)).where(Deal.stage == stage, Deal.is_deleted == False))).scalar()
        result[stage] = {"count": count, "total_value": float(val or 0)}
    return result


@router.get("/recent-leads")
async def get_recent_leads(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Join with Account to get company name
    # Contact model doesn't have direct account_name, it has account_id and account relation
    # But usually contacts have account relation
    query = select(Contact).where(Contact.is_deleted == False).order_by(Contact.created_at.desc()).limit(10)
    result = await db.execute(query)
    contacts = result.scalars().all()
    
    leads = []
    for c in contacts:
        # Assuming account relation exists as 'account'
        leads.append({
            "id": c.id,
            "full_name": f"{c.first_name} {c.last_name}",
            "company": c.account.name if c.account else "Individual",
            "lead_source": c.source,
            "contact_stage": c.contact_stage,
            "owner_name": c.owner.full_name if c.owner else "Unassigned"
        })
    return leads


@router.get("/funnel")
async def get_funnel_data(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Funnel steps: Total Leads -> Contacted -> Qualified -> Proposal Sent -> Closed Won
    # Total Leads = All active contacts
    total_leads = (await db.execute(select(func.count()).select_from(Contact).where(Contact.is_deleted == False))).scalar()
    # Contacted = status != 'lead' (assuming 'lead' is initial)
    contacted = (await db.execute(select(func.count()).select_from(Contact).where(Contact.is_deleted == False, Contact.contact_stage != "lead"))).scalar()
    # Qualified = stage 'qualified' in deals or 'qualified' in contacts
    qualified = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False, Deal.stage != "prospecting"))).scalar()
    # Proposal Sent = stage 'proposal' or later
    proposal = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False, Deal.stage.in_(["proposal", "negotiation", "closed_won"])))).scalar()
    # Closed Won
    closed_won = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False, Deal.stage == "closed_won"))).scalar()
    
    return [
        {"stage": "Total Leads", "count": total_leads},
        {"stage": "Contacted", "count": contacted},
        {"stage": "Qualified", "count": qualified},
        {"stage": "Proposal Sent", "count": proposal},
        {"stage": "Closed Won", "count": closed_won}
    ]


@router.get("/activities")
async def get_recent_activity(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Activity).order_by(Activity.created_at.desc()).limit(20))
    return result.scalars().all()


@router.get("/deals-closing-soon")
async def get_deals_closing(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    in_30 = today + timedelta(days=30)
    result = await db.execute(
        select(Deal).where(
            Deal.close_date >= today,
            Deal.close_date <= in_30,
            Deal.is_deleted == False,
            Deal.stage.notin_(["closed_won", "closed_lost"]),
        ).order_by(Deal.close_date)
    )
    return result.scalars().all()


@router.get("/tickets")
async def get_ticket_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    statuses = ["open", "pending", "resolved", "closed"]
    priorities = ["low", "medium", "high", "urgent"]
    by_status = {}
    for s in statuses:
        by_status[s] = (await db.execute(select(func.count()).select_from(Ticket).where(Ticket.status == s, Ticket.is_deleted == False))).scalar()
    by_priority = {}
    for p in priorities:
        by_priority[p] = (await db.execute(select(func.count()).select_from(Ticket).where(Ticket.priority == p, Ticket.is_deleted == False))).scalar()
    return {"by_status": by_status, "by_priority": by_priority}


@router.get("/top-reps")
async def get_top_reps(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    month_start = date.today().replace(day=1)
    result = await db.execute(
        select(Deal.owner_id, func.sum(Deal.value).label("total"))
        .where(Deal.stage == "closed_won", Deal.is_deleted == False, Deal.updated_at >= datetime.combine(month_start, datetime.min.time()))
        .group_by(Deal.owner_id)
        .order_by(func.sum(Deal.value).desc())
        .limit(5)
    )
    rows = result.all()
    top_reps = []
    for row in rows:
        user_result = await db.execute(select(User).where(User.id == row.owner_id))
        user = user_result.scalar_one_or_none()
        top_reps.append({"user_id": row.owner_id, "full_name": user.full_name if user else "Unknown", "total_closed": float(row.total or 0)})
    return top_reps
@router.get("/ai-insight")
async def get_ai_insight(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Fetch some summary data for context
    total_deals = (await db.execute(select(func.count()).select_from(Deal).where(Deal.is_deleted == False))).scalar()
    won_deals = (await db.execute(select(func.count()).select_from(Deal).where(Deal.stage == "closed_won", Deal.is_deleted == False))).scalar()
    total_rev = (await db.execute(select(func.sum(Deal.value)).where(Deal.stage == "closed_won", Deal.is_deleted == False))).scalar() or 0
    open_tickets = (await db.execute(select(func.count()).select_from(Ticket).where(Ticket.status == "open", Ticket.is_deleted == False))).scalar()
    
    context = f"Total Deals: {total_deals}, Won Deals: {won_deals}, Total Revenue: ${float(total_rev):,.2f}, Open Tickets: {open_tickets}."
    insight = await AIService.get_insight(context)
    return {"insight": insight}
