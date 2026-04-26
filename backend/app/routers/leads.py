from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.core.exceptions import NotFoundError
from app.models.user import User
from app.services.lead_service import LeadService
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadResponse, LeadStageUpdate,
    LeadBulkUpdate, LeadImport, LeadBulkImportResponse,
    LeadConvertRequest, LeadConvertResponse,
    LeadActivityResponse, LeadScoreEventResponse,
    LeadAISummaryResponse, LeadAIQualifyResponse,
    LeadAIEmailResponse, LeadAIInsightsResponse
)
from app.schemas.common import PaginatedResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/", response_model=PaginatedResponse[LeadResponse])
async def list_leads(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    owner_id: Optional[str] = None,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_owner_id = current_user.id if current_user.role == "rep" else owner_id
    leads, total = await LeadService.get_leads(
        db, page, limit, search, status, source, effective_owner_id,
        min_score, max_score, sort_by, sort_dir
    )
    return PaginatedResponse(data=leads, total=total, page=page, limit=limit)


@router.get("/pipeline", response_model=dict)
async def get_pipeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = current_user.id if current_user.role == "rep" else None
    return await LeadService.get_leads_by_stage(db, owner_id)


@router.get("/stats", response_model=dict)
async def get_lead_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = current_user.id if current_user.role == "rep" else None
    return await LeadService.get_lead_stats(db, owner_id)


@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await LeadService.create_lead(db, data, current_user.id)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.get_lead_by_id(db, lead_id)
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.update_lead(db, lead_id, data)
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


@router.patch("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: str,
    data: LeadStageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.update_lead_status(db, lead_id, data.status)
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin),
):
    success = await LeadService.delete_lead(db, lead_id)
    if not success:
        raise NotFoundError("Lead not found")
    return {"message": "Lead deleted"}


@router.patch("/bulk-update")
async def bulk_update_leads(
    data: LeadBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin),
):
    count = await LeadService.bulk_update(db, data.ids, data.action, data.value)
    return {"message": f"Updated {count} leads"}


@router.post("/import", response_model=LeadBulkImportResponse)
async def import_leads(
    data: LeadImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin),
):
    count, errors = await LeadService.create_leads_bulk(db, data.leads, current_user.id)
    return LeadBulkImportResponse(count=count, errors=errors if errors else None)


@router.get("/{lead_id}/activities", response_model=List[LeadActivityResponse])
async def get_lead_activities(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activities = await LeadService.get_lead_activities(db, lead_id)
    return activities


@router.post("/{lead_id}/activities")
async def add_lead_activity(
    lead_id: str,
    activity_type: str = Query(...),
    subject: str = Query(...),
    content: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = await LeadService.add_activity(
        db, lead_id, activity_type, subject, content,
        created_by=current_user.id
    )
    return activity


@router.post("/{lead_id}/score")
async def update_score(
    lead_id: str,
    action: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.update_score(db, lead_id, action, current_user.id)
    if not lead:
        raise NotFoundError("Lead not found")
    return lead


@router.get("/{lead_id}/score-events", response_model=List[LeadScoreEventResponse])
async def get_score_events(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await LeadService.get_score_events(db, lead_id)


@router.post("/{lead_id}/convert", response_model=LeadConvertResponse)
async def convert_lead(
    lead_id: str,
    data: LeadConvertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await LeadService.convert_lead(
        db, lead_id,
        create_contact=data.create_contact,
        create_account=data.create_account,
        create_deal=data.create_deal,
        deal_title=data.deal_title,
        deal_value=data.deal_value
    )
    return LeadConvertResponse(
        contact_id=result.get("contact_id"),
        account_id=result.get("account_id"),
        deal_id=result.get("deal_id"),
        message=result.get("message", "Conversion completed successfully")
    )


@router.post("/{lead_id}/ai-summary", response_model=LeadAISummaryResponse)
async def get_ai_summary(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.get_lead_by_id(db, lead_id)
    if not lead:
        raise NotFoundError("Lead not found")

    activities = await LeadService.get_lead_activities(db, lead_id)

    context = f"""
Lead Name: {lead.name}
Company: {lead.company or 'N/A'}
Email: {lead.email or 'N/A'}
Source: {lead.source or 'N/A'}
Status: {lead.status}
Score: {lead.score}
Notes: {lead.notes or 'No notes'}
Recent Activities: {len(activities)} activities recorded
    """

    summary = await AIService.summarize_lead(context, activities)
    return LeadAISummaryResponse(summary=summary)


@router.post("/{lead_id}/ai-qualify", response_model=LeadAIQualifyResponse)
async def qualify_lead(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.get_lead_by_id(db, lead_id)
    if not lead:
        raise NotFoundError("Lead not found")

    activities = await LeadService.get_lead_activities(db, lead_id)
    score_events = await LeadService.get_score_events(db, lead_id)

    context = f"""
Lead Name: {lead.name}
Company: {lead.company or 'N/A'}
Industry: {lead.industry or 'N/A'}
Email: {lead.email or 'N/A'}
Status: {lead.status}
Current Score: {lead.score}
Source: {lead.source or 'N/A'}
Notes: {lead.notes or 'N/A'}
Total Activities: {len(activities)}
    """

    result = await AIService.qualify_lead(context, activities, score_events)
    return LeadAIQualifyResponse(**result)


@router.post("/{lead_id}/ai-email", response_model=LeadAIEmailResponse)
async def generate_ai_email(
    lead_id: str,
    email_type: str = Query("initial"),
    tone: str = Query("professional"),
    context: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.get_lead_by_id(db, lead_id)
    if not lead:
        raise NotFoundError("Lead not found")

    activities = await LeadService.get_lead_activities(db, lead_id)

    email_result = await AIService.generate_outreach_email(
        lead, activities, email_type, tone, context
    )
    return LeadAIEmailResponse(**email_result)


@router.post("/{lead_id}/ai-insights", response_model=LeadAIInsightsResponse)
async def get_lead_insights(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = await LeadService.get_lead_by_id(db, lead_id)
    if not lead:
        raise NotFoundError("Lead not found")

    activities = await LeadService.get_lead_activities(db, lead_id)
    score_events = await LeadService.get_score_events(db, lead_id)

    context = f"""
Lead Name: {lead.name}
Company: {lead.company or 'N/A'}
Industry: {lead.industry or 'N/A'}
Status: {lead.status}
Current Score: {lead.score}
Source: {lead.source or 'N/A'}
Notes: {lead.notes or 'N/A'}
Total Activities: {len(activities)}
    """

    insights = await AIService.get_lead_insights(context, activities, score_events)
    return LeadAIInsightsResponse(**insights)