from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from uuid import uuid4
from typing import List

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError, ConflictError
from app.models.pipeline import Pipeline, PipelineStage
from app.models.deal import Deal
from app.schemas.pipeline import PipelineCreate, PipelineUpdate, PipelineRead, PipelineStageCreate, PipelineStageRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/pipelines")

@router.get("/", response_model=List[PipelineRead])
async def list_pipelines(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Pipeline).where(Pipeline.tenant_id == current_user.tenant_id).options(selectinload(Pipeline.stages)))
    return result.scalars().all()

@router.post("/", response_model=PipelineRead, status_code=201)
async def create_pipeline(
    pipeline_in: PipelineCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    pipeline = Pipeline(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        name=pipeline_in.name,
        is_default=pipeline_in.is_default,
        currency=pipeline_in.currency
    )
    db.add(pipeline)
    # Create stages
    for stage_in in pipeline_in.stages:
        stage = PipelineStage(
            id=str(uuid4()),
            pipeline_id=pipeline.id,
            **stage_in.model_dump()
        )
        db.add(stage)
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline", pipeline.id, "created", new_values=pipeline_in.model_dump())
    await db.commit()
    await db.refresh(pipeline)
    # Reload with stages
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline.id).options(selectinload(Pipeline.stages)))
    return result.scalar_one()

@router.get("/{pipeline_id}", response_model=PipelineRead)
async def get_pipeline(
    pipeline_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id).options(selectinload(Pipeline.stages)))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise NotFoundError("Pipeline not found")
    return pipeline

@router.patch("/{pipeline_id}", response_model=PipelineRead)
async def update_pipeline(
    pipeline_id: str,
    pipeline_in: PipelineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise NotFoundError("Pipeline not found")
    old_values = {k: getattr(pipeline, k) for k in pipeline_in.model_dump(exclude_unset=True).keys()}
    update_data = pipeline_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pipeline, key, value)
    pipeline.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline", pipeline.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(pipeline)
    return pipeline

@router.delete("/{pipeline_id}", status_code=204)
async def delete_pipeline(
    pipeline_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise NotFoundError("Pipeline not found")
    # Check for open deals
    open_deals = await db.execute(select(func.count(Deal.id)).where(Deal.pipeline_id == pipeline_id, Deal.status == "open"))
    if open_deals.scalar_one() > 0:
        raise ConflictError("Cannot delete pipeline with open deals")
    await db.delete(pipeline)
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline", pipeline.id, "deleted")
    await db.commit()
    return

@router.post("/{pipeline_id}/stages", response_model=PipelineStageRead, status_code=201)
async def add_stage(
    pipeline_id: str,
    stage_in: PipelineStageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise NotFoundError("Pipeline not found")
    stage = PipelineStage(
        id=str(uuid4()),
        pipeline_id=pipeline_id,
        **stage_in.model_dump()
    )
    db.add(stage)
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline_stage", stage.id, "created", new_values=stage_in.model_dump())
    await db.commit()
    await db.refresh(stage)
    return stage

@router.patch("/{pipeline_id}/stages/{stage_id}", response_model=PipelineStageRead)
async def update_stage(
    pipeline_id: str,
    stage_id: str,
    stage_in: PipelineStageCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(PipelineStage).where(PipelineStage.id == stage_id, PipelineStage.pipeline_id == pipeline_id))
    stage = result.scalar_one_or_none()
    if not stage:
        raise NotFoundError("Stage not found")
    # Verify pipeline belongs to tenant
    pipeline = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    if not pipeline.scalar_one_or_none():
        raise ForbiddenError("Not authorized")
    old_values = {k: getattr(stage, k) for k in stage_in.model_dump(exclude_unset=True).keys()}
    update_data = stage_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stage, key, value)
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline_stage", stage.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(stage)
    return stage

@router.delete("/{pipeline_id}/stages/{stage_id}", status_code=204)
async def delete_stage(
    pipeline_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(PipelineStage).where(PipelineStage.id == stage_id, PipelineStage.pipeline_id == pipeline_id))
    stage = result.scalar_one_or_none()
    if not stage:
        raise NotFoundError("Stage not found")
    # Verify pipeline belongs to tenant
    pipeline = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    if not pipeline.scalar_one_or_none():
        raise ForbiddenError("Not authorized")
    # Check for deals in this stage
    deals = await db.execute(select(func.count(Deal.id)).where(Deal.stage_id == stage_id))
    if deals.scalar_one() > 0:
        raise ForbiddenError("Cannot delete stage with deals")
    await db.delete(stage)
    await log_event(db, current_user.tenant_id, current_user.id, "pipeline_stage", stage.id, "deleted")
    await db.commit()
    return

@router.patch("/{pipeline_id}/stages/reorder")
async def reorder_stages(
    pipeline_id: str,
    stages: List[dict],
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    # Verify pipeline belongs to tenant
    result = await db.execute(select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.tenant_id == current_user.tenant_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Pipeline not found")
    # Update order for each stage
    for item in stages:
        stage_id = item.get("id")
        order = item.get("order")
        if stage_id and order is not None:
            result = await db.execute(select(PipelineStage).where(PipelineStage.id == stage_id, PipelineStage.pipeline_id == pipeline_id))
            stage = result.scalar_one_or_none()
            if stage:
                stage.order = order
    await db.commit()
    return {"message": "Stages reordered successfully"}
