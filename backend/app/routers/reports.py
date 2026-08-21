from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Dict, Any, List

from app.core.dependencies import get_current_active_user, get_db
from app.models.contact import Contact
from app.models.lead import Lead
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.models.pipeline import PipelineStage

router = APIRouter(prefix="/reports")

@router.get("/metrics", response_model=Dict[str, Any])
async def get_report_metrics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    
    # Avg Deal Size
    avg_deal_size = (await db.execute(select(func.avg(Deal.value)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one() or 0.0
    
    # Win Rate
    total_closed_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status.in_(["won", "lost"])))).scalar_one()
    won_deals = (await db.execute(select(func.count(Deal.id)).where(Deal.tenant_id == tenant_id, Deal.status == "won"))).scalar_one()
    win_rate = (won_deals / total_closed_deals * 100) if total_closed_deals > 0 else 0.0

    # Avg Sales Cycle (days from created to won)
    # Using SQL extract epoch
    if db.bind.dialect.name == 'sqlite':
        sales_cycle_days = (await db.execute(text(
            "SELECT AVG(julianday(actual_close_date) - julianday(created_at)) FROM deals WHERE tenant_id = :tenant_id AND status = 'won'"
        ), {"tenant_id": tenant_id})).scalar_one() or 0.0
    else:
        sales_cycle_days = (await db.execute(text(
            "SELECT AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at))/86400) FROM deals WHERE tenant_id = :tenant_id AND status = 'won'"
        ), {"tenant_id": tenant_id})).scalar_one() or 0.0

    # Lead Sources
    sources_result = (await db.execute(
        select(Lead.source, func.count(Lead.id))
        .where(Lead.tenant_id == tenant_id, Lead.source != None)
        .group_by(Lead.source)
    )).all()
    
    lead_sources = [{"name": source or "Unknown", "value": int(count)} for source, count in sources_result]

    return {
        "avg_deal_size": float(avg_deal_size),
        "win_rate": float(win_rate),
        "sales_cycle_days": float(sales_cycle_days),
        "lead_sources": lead_sources
    }

@router.get("/export/{entity}")
async def export_entity(
    entity: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    
    if entity == "contacts":
        contacts = (await db.execute(select(Contact).where(Contact.tenant_id == tenant_id, Contact.is_deleted == False))).scalars().all()
        return [{"id": c.id, "name": f"{c.first_name} {c.last_name}", "email": c.email, "phone": c.phone, "status": c.status, "created_at": c.created_at.isoformat()} for c in contacts]
        
    elif entity == "leads":
        leads = (await db.execute(select(Lead).where(Lead.tenant_id == tenant_id))).scalars().all()
        return [{"id": l.id, "name": l.name, "company": l.company, "email": l.email, "status": l.status, "source": l.source, "score": l.score, "created_at": l.created_at.isoformat()} for l in leads]
        
    elif entity == "deals":
        deals = (await db.execute(select(Deal).where(Deal.tenant_id == tenant_id, Deal.is_deleted == False))).scalars().all()
        return [{"id": d.id, "title": d.title, "value": float(d.value) if d.value else 0.0, "status": d.status, "probability": d.stage.probability if d.stage else 0, "created_at": d.created_at.isoformat()} for d in deals]
        
    elif entity == "tickets":
        tickets = (await db.execute(select(Ticket).where(Ticket.tenant_id == tenant_id))).scalars().all()
        return [{"id": t.id, "subject": t.subject, "status": t.status, "priority": t.priority, "created_at": t.created_at.isoformat()} for t in tickets]
        
    return []
