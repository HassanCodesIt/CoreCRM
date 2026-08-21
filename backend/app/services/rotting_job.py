from datetime import datetime, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import AsyncSessionLocal
from app.models.deal import Deal
from app.models.pipeline import Pipeline
from app.models.activity import Activity


async def _mark_rotting_deals(db: AsyncSession) -> int:
    now = datetime.utcnow()
    pipelines = (await db.execute(select(Pipeline))).scalars().all()
    updated = 0
    for pipeline in pipelines:
        if not pipeline.rotting_days or pipeline.rotting_days <= 0:
            continue
        cutoff = now - timedelta(days=pipeline.rotting_days)
        deals = (await db.execute(
            select(Deal).where(
                Deal.pipeline_id == pipeline.id,
                Deal.status == "open",
                Deal.tenant_id == pipeline.tenant_id,
            )
        )).scalars().all()
        for deal in deals:
            last_activity = (await db.execute(
                select(func.max(Activity.created_at)).where(
                    Activity.tenant_id == deal.tenant_id,
                    Activity.deal_id == deal.id,
                )
            )).scalar_one_or_none()
            last_touch = last_activity or deal.updated_at or deal.created_at
            is_rotting = last_touch <= cutoff
            if deal.is_rotting != is_rotting:
                deal.is_rotting = is_rotting
                deal.updated_at = now
                updated += 1
    if updated > 0:
        await db.commit()
    return updated


def start_rotting_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()

    async def _job():
        async with AsyncSessionLocal() as db:
            await _mark_rotting_deals(db)

    scheduler.add_job(_job, "interval", minutes=15, id="deal_rotting_check", replace_existing=True)
    scheduler.start()
    return scheduler
