from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date
from uuid import uuid4
from typing import Optional
from collections import defaultdict

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.models.deal import Deal
from app.models.pipeline import Pipeline, PipelineStage
from app.models.activity import Activity
from app.models.deal_stage_history import DealStageHistory
from app.schemas.deal import DealCreate, DealUpdate, DealRead
from app.schemas.deal_close import DealCloseRequest, VelocityResponse, FunnelResponse
from app.services.audit_service import log_event

router = APIRouter(prefix="/deals")

@router.get("/", response_model=dict)
async def list_deals(
    skip: int = 0,
    limit: int = Query(50, le=200),
    page: Optional[int] = None,
    status: Optional[str] = None,
    stage_id: Optional[str] = None,
    pipeline_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if page is not None:
        skip = max(page - 1, 0) * limit
    query = select(Deal).where(Deal.tenant_id == current_user.tenant_id).order_by(Deal.created_at.desc())
    if status:
        query = query.where(Deal.status == status)
    if stage_id:
        query = query.where(Deal.stage_id == stage_id)
    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)
    if owner_id:
        query = query.where(Deal.owner_id == owner_id)
    if q:
        query = query.where(Deal.title.ilike(f"%{q}%"))
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    deals = result.scalars().all()
    return {"items": [DealRead.model_validate(d) for d in deals], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=DealRead, status_code=201)
async def create_deal(
    deal_in: DealCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    # Verify pipeline and stage belong to tenant
    pipeline = await db.execute(select(Pipeline).where(Pipeline.id == deal_in.pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    if not pipeline.scalar_one_or_none():
        raise NotFoundError("Pipeline not found")
    stage = await db.execute(select(PipelineStage).where(PipelineStage.id == deal_in.stage_id, PipelineStage.pipeline_id == deal_in.pipeline_id))
    if not stage.scalar_one_or_none():
        raise NotFoundError("Stage not found")
    deal = Deal(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        **deal_in.model_dump()
    )
    db.add(deal)
    await log_event(db, current_user.tenant_id, current_user.id, "deal", deal.id, "created", new_values=deal_in.model_dump())
    await db.commit()
    await db.refresh(deal)
    return deal


def _avg_days(durations: list[float]) -> float:
    if not durations:
        return 0.0
    return round(sum(durations) / len(durations), 2)


@router.get("/velocity", response_model=VelocityResponse)
async def get_deal_velocity(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    pipelines = (await db.execute(
        select(Pipeline).where(Pipeline.tenant_id == tenant_id)
    )).scalars().all()
    response = []
    now = datetime.utcnow()

    for pipeline in pipelines:
        stages = (await db.execute(
            select(PipelineStage)
            .where(PipelineStage.pipeline_id == pipeline.id)
            .order_by(PipelineStage.order)
        )).scalars().all()
        deals = (await db.execute(
            select(Deal).where(
                Deal.tenant_id == tenant_id,
                Deal.pipeline_id == pipeline.id,
                Deal.is_deleted == False,
            )
        )).scalars().all()
        deal_ids = [deal.id for deal in deals]
        history_by_deal = defaultdict(list)

        if deal_ids:
            histories = (await db.execute(
                select(DealStageHistory)
                .where(
                    DealStageHistory.tenant_id == tenant_id,
                    DealStageHistory.pipeline_id == pipeline.id,
                    DealStageHistory.deal_id.in_(deal_ids),
                )
                .order_by(DealStageHistory.deal_id, DealStageHistory.changed_at)
            )).scalars().all()
            for history in histories:
                history_by_deal[history.deal_id].append(history)

        durations_by_stage = defaultdict(list)
        for deal in deals:
            histories = history_by_deal.get(deal.id, [])
            if not histories:
                end_at = deal.closed_at or now
                if end_at >= deal.created_at:
                    durations_by_stage[deal.stage_id].append((end_at - deal.created_at).total_seconds() / 86400)
                continue

            first_history = histories[0]
            if first_history.from_stage_id and first_history.changed_at >= deal.created_at:
                durations_by_stage[first_history.from_stage_id].append(
                    (first_history.changed_at - deal.created_at).total_seconds() / 86400
                )

            for index, history in enumerate(histories):
                next_at = histories[index + 1].changed_at if index + 1 < len(histories) else (deal.closed_at or now)
                if next_at >= history.changed_at:
                    durations_by_stage[history.to_stage_id].append(
                        (next_at - history.changed_at).total_seconds() / 86400
                    )

        response.append({
            "pipeline_id": pipeline.id,
            "pipeline_name": pipeline.name,
            "stages": [
                {
                    "stage_id": stage.id,
                    "stage_name": stage.name,
                    "avg_days": _avg_days(durations_by_stage[stage.id]),
                }
                for stage in stages
            ],
        })
    return {"pipelines": response}


@router.get("/funnel", response_model=FunnelResponse)
async def get_deal_funnel(
    pipeline_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    tenant_id = current_user.tenant_id
    pipeline = (await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == tenant_id))).scalar_one_or_none()
    if not pipeline:
        raise NotFoundError("Pipeline not found")
    stages = (await db.execute(select(PipelineStage).where(PipelineStage.pipeline_id == pipeline_id).order_by(PipelineStage.order))).scalars().all()
    stage_rows = []
    previous_count = None
    for stage in stages:
        count = (await db.execute(select(func.count(Deal.id)).where(
            Deal.tenant_id == tenant_id,
            Deal.pipeline_id == pipeline_id,
            Deal.stage_id == stage.id,
            Deal.is_deleted == False,
        ))).scalar_one()
        conversion_rate = None
        if previous_count and previous_count > 0:
            conversion_rate = round((count / previous_count) * 100)
        stage_rows.append({
            "stage_id": stage.id,
            "stage_name": stage.name,
            "count": int(count),
            "conversion_rate": conversion_rate,
        })
        previous_count = count
    return {"pipeline_id": pipeline_id, "stages": stage_rows}


@router.get("/{deal_id}", response_model=DealRead)
async def get_deal(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    return deal

@router.patch("/{deal_id}", response_model=DealRead)
async def update_deal(
    deal_id: str,
    deal_in: DealUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    if deal.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this deal")
    old_values = {k: getattr(deal, k) for k in deal_in.model_dump(exclude_unset=True).keys()}
    update_data = deal_in.model_dump(exclude_unset=True)
    if "pipeline_id" in update_data or "stage_id" in update_data:
        pipeline_id = update_data.get("pipeline_id", deal.pipeline_id)
        stage_id = update_data.get("stage_id", deal.stage_id)
        pipeline = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
        if not pipeline.scalar_one_or_none():
            raise NotFoundError("Pipeline not found")
        stage = await db.execute(select(PipelineStage).where(PipelineStage.id == stage_id, PipelineStage.pipeline_id == pipeline_id))
        if not stage.scalar_one_or_none():
            raise NotFoundError("Stage not found")
        if stage_id != deal.stage_id:
            db.add(DealStageHistory(
                tenant_id=current_user.tenant_id,
                deal_id=deal.id,
                pipeline_id=pipeline_id,
                from_stage_id=deal.stage_id,
                to_stage_id=stage_id,
                changed_by=current_user.id,
                changed_at=datetime.utcnow(),
            ))
    for key, value in update_data.items():
        setattr(deal, key, value)
    deal.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "deal", deal.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(deal)
    return deal

@router.delete("/{deal_id}", status_code=204)
async def delete_deal(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    if deal.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this deal")
    await db.delete(deal)
    await log_event(db, current_user.tenant_id, current_user.id, "deal", deal.id, "deleted")
    await db.commit()
    return

@router.patch("/{deal_id}/stage", response_model=DealRead)
async def move_deal_stage(
    deal_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    # Verify new stage is in same pipeline
    stage = await db.execute(select(PipelineStage).where(PipelineStage.id == stage_id, PipelineStage.pipeline_id == deal.pipeline_id))
    if not stage.scalar_one_or_none():
        raise ForbiddenError("Stage not in same pipeline")
    old_stage_id = deal.stage_id
    deal.stage_id = stage_id
    deal.updated_at = datetime.utcnow()
    db.add(DealStageHistory(
        tenant_id=current_user.tenant_id,
        deal_id=deal.id,
        pipeline_id=deal.pipeline_id,
        from_stage_id=old_stage_id,
        to_stage_id=stage_id,
        changed_by=current_user.id,
        changed_at=datetime.utcnow(),
    ))
    await log_event(db, current_user.tenant_id, current_user.id, "deal", deal.id, "updated", new_values={"stage_id": stage_id}, old_values={"stage_id": old_stage_id})
    await db.commit()
    await db.refresh(deal)
    return deal

@router.post("/{deal_id}/close-won", response_model=DealRead)
async def close_deal_won(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    deal.status = "won"
    deal.actual_close_date = date.today()
    deal.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "deal", deal.id, "updated", new_values={"status": "won", "actual_close_date": str(date.today())})
    await db.commit()
    await db.refresh(deal)
    return deal

@router.patch("/{deal_id}/close", response_model=DealRead)
async def close_deal(
    deal_id: str,
    body: DealCloseRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    if body.status not in ["won", "lost"]:
        raise BadRequestError("Status must be won or lost")
    deal.status = body.status
    deal.actual_close_date = date.today()
    deal.closed_at = datetime.utcnow()
    deal.close_reason = body.reason_category
    deal.loss_reason = body.reason_notes
    if body.amount_final is not None:
        deal.amount_final = body.amount_final
    deal.updated_at = datetime.utcnow()
    await log_event(
        db,
        current_user.tenant_id,
        current_user.id,
        "deal",
        deal.id,
        "updated",
        new_values={
            "status": body.status,
            "close_reason": body.reason_category,
            "loss_reason": body.reason_notes,
            "amount_final": body.amount_final,
            "actual_close_date": str(date.today()),
        },
    )
    await db.commit()
    await db.refresh(deal)
    return deal


@router.get("/{deal_id}/activities", response_model=dict)
async def list_deal_activities(
    deal_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")
    query = select(Activity).where(
        Activity.entity_type == "deal",
        Activity.entity_id == deal_id,
        Activity.tenant_id == current_user.tenant_id
    ).order_by(Activity.created_at.desc())
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()
    from app.schemas.activity import ActivityRead
    return {"items": [ActivityRead.model_validate(a) for a in activities], "total": total, "skip": skip, "limit": limit}


@router.get("/{deal_id}/timeline", response_model=list[dict])
async def get_deal_timeline(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")

    timeline = [
        {
            "type": "deal",
            "data": {
                "id": deal.id,
                "title": deal.title,
                "status": deal.status,
                "value": float(deal.value or 0),
                "event": "Deal created",
            },
            "timestamp": deal.created_at.isoformat(),
        }
    ]
    if deal.updated_at and deal.updated_at != deal.created_at:
        timeline.append({
            "type": "deal",
            "data": {
                "id": deal.id,
                "title": deal.title,
                "status": deal.status,
                "event": "Deal updated",
            },
            "timestamp": deal.updated_at.isoformat(),
        })
    if deal.actual_close_date:
        timeline.append({
            "type": "deal",
            "data": {
                "id": deal.id,
                "title": deal.title,
                "status": deal.status,
                "event": f"Deal closed {deal.status}",
            },
            "timestamp": deal.actual_close_date.isoformat(),
        })

    activities = (await db.execute(
        select(Activity).where(
            Activity.tenant_id == current_user.tenant_id,
            (Activity.deal_id == deal_id) | ((Activity.entity_type == "deal") & (Activity.entity_id == deal_id)),
        )
    )).scalars().all()
    for activity in activities:
        timeline.append({
            "type": "activity",
            "data": {
                "id": activity.id,
                "activity_type": activity.activity_type,
                "subject": activity.subject,
                "body": activity.body,
                "is_completed": activity.is_completed,
            },
            "timestamp": (activity.completed_at or activity.created_at).isoformat(),
        })

    return sorted(timeline, key=lambda item: item["timestamp"], reverse=True)


@router.post("/{deal_id}/ai-health")
async def evaluate_deal_ai_health(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """
    Triggers AI-powered deal risk & health assessment.
    Updates deal.ai_health_score in database.
    """
    result = await db.execute(select(Deal).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id))
    deal = result.scalar_one_or_none()
    if not deal:
        raise NotFoundError("Deal not found")

    # Fetch activities for this deal
    acts_res = await db.execute(
        select(Activity)
        .where(Activity.deal_id == deal_id)
        .order_by(Activity.created_at.desc())
        .limit(10)
    )
    activities = acts_res.scalars().all()

    # Fetch stage history
    hist_res = await db.execute(
        select(DealStageHistory)
        .where(DealStageHistory.deal_id == deal_id)
        .order_by(DealStageHistory.entered_at.desc())
    )
    history = hist_res.scalars().all()

    # Construct context
    deal_context = (
        f"Deal Name: {deal.title}\n"
        f"Value: ${deal.value or 0:,.2f} {deal.currency}\n"
        f"Current Stage ID: {deal.stage_id}\n"
        f"Status: {deal.status}\n"
        f"Expected Close Date: {deal.expected_close_date or 'N/A'}\n"
        f"Notes: {deal.notes or 'N/A'}"
    )

    history_text = "Stage history:\n"
    if history:
        for hist in history[:5]:
            entered = hist.entered_at.strftime("%Y-%m-%d")
            left = hist.left_at.strftime("%Y-%m-%d") if hist.left_at else "present"
            history_text += f"- Stage {hist.stage_id} from {entered} to {left}\n"
    else:
        history_text += f"- Created on {deal.created_at.strftime('%Y-%m-%d')}. Current stage since creation.\n"

    from app.services.ai_service import AIService
    assessment = await AIService.evaluate_deal_health(deal_context, activities, history_text)

    # Save to db
    deal.ai_health_score = int(assessment.get("health_score", 50))
    await db.commit()

    return {
        "deal_id": deal_id,
        "health_score": deal.ai_health_score,
        "risk_level": assessment.get("risk_level", "medium"),
        "risk_factors": assessment.get("risk_factors", []),
        "recommended_actions": assessment.get("recommended_actions", []),
        "predicted_close_date": assessment.get("predicted_close_date", None)
    }

