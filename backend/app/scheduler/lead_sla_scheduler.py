from __future__ import annotations
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.lead_sla import LeadSLA
from app.config import settings
from app.models.lead import Lead


async def _check_breached(db):
    now = datetime.utcnow()
    q = select(LeadSLA).where(LeadSLA.status == "on_time", LeadSLA.response_due_at <= now)
    result = await db.execute(q)
    breaches = result.scalars().all()
    if not breaches:
        return
    for sla in breaches:
        sla.status = "breached"
        # Optionally log breach event on the lead
        lead = await db.get(Lead, sla.lead_id)
        if lead:
            lead.updated_at = datetime.utcnow()
    await db.commit()


async def lead_sla_worker():
    interval = max(1, int(settings.SLA_CHECK_INTERVAL_MINUTES))
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await _check_breached(db)
        except Exception:
            # Non-fatal: log in real system; here we swallow to keep scheduler resilient
            pass
        await asyncio.sleep(interval * 60)


def start_sla_scheduler():
    # Lightweight entry to start in background; to be awaited by lifespan in FastAPI
    asyncio.create_task(lead_sla_worker())
