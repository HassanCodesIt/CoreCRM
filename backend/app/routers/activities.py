from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from uuid import uuid4
from typing import Optional

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models.activity import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/activities")

@router.get("/", response_model=dict)
async def list_activities(
    skip: int = 0,
    limit: int = Query(50, le=1000),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    is_completed: Optional[bool] = None,
    q: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    meeting_type: Optional[str] = None,
    meeting_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    query = select(Activity).where(Activity.tenant_id == current_user.tenant_id).order_by(Activity.created_at.desc())
    if entity_type:
        query = query.where(Activity.entity_type == entity_type)
    if entity_id:
        query = query.where(Activity.entity_id == entity_id)
    if activity_type:
        query = query.where(Activity.activity_type == activity_type)
    if is_completed is not None:
        query = query.where(Activity.is_completed == is_completed)
    if start_date:
        query = query.where(Activity.due_date >= start_date)
    if end_date:
        query = query.where(Activity.due_date <= end_date)
    if meeting_type:
        query = query.where(Activity.meeting_type == meeting_type)
    if meeting_status:
        query = query.where(Activity.meeting_status == meeting_status)
    if q:
        query = query.where(Activity.subject.ilike(f"%{q}%") | Activity.body.ilike(f"%{q}%"))
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()
    return {"items": [ActivityRead.model_validate(a) for a in activities], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=ActivityRead, status_code=201)
async def create_activity(
    activity_in: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    activity_data = activity_in.model_dump()
    activity_data.pop("attachment_ids", None)
    
    activity = Activity(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **activity_data
    )
    db.add(activity)
    await log_event(db, current_user.tenant_id, current_user.id, "activity", activity.id, "created", new_values=activity_in.model_dump())
    await db.commit()
    await db.refresh(activity)

    # If this is a reply note on a ticket, send SMTP email
    if activity.activity_type == "note" and (activity.entity_type == "ticket" or activity.ticket_id):
        ticket_id = activity.ticket_id or activity.entity_id
        if ticket_id:
            try:
                from app.models.ticket import Ticket
                from app.services.email_service import send_smtp_email
                from app.models.attachment import Attachment
                import asyncio
                import os

                ticket_res = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
                ticket = ticket_res.scalar_one_or_none()
                if ticket and ticket.email:
                    subject = f"Re: {ticket.subject} ({ticket.ticket_number})"
                    
                    attachment_paths = []
                    if activity_in.attachment_ids:
                        att_res = await db.execute(select(Attachment).where(Attachment.id.in_(activity_in.attachment_ids)))
                        attachments = att_res.scalars().all()
                        for att in attachments:
                            # file_url is like /uploads/filename.ext
                            local_path = att.file_url.lstrip("/")
                            if os.path.exists(local_path):
                                attachment_paths.append(local_path)
                    
                    asyncio.create_task(send_smtp_email(ticket.email, subject, activity.body or "", attachment_paths))
            except Exception as e:
                print(f"Error preparing email for ticket reply: {e}")

    return activity

@router.get("/{activity_id}", response_model=ActivityRead)
async def get_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Activity).where(Activity.id == activity_id, Activity.tenant_id == current_user.tenant_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("Activity not found")
    return activity

@router.patch("/{activity_id}", response_model=ActivityRead)
async def update_activity(
    activity_id: str,
    activity_in: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Activity).where(Activity.id == activity_id, Activity.tenant_id == current_user.tenant_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("Activity not found")
    if activity.created_by != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this activity")
    old_values = {k: getattr(activity, k) for k in activity_in.model_dump(exclude_unset=True).keys()}
    update_data = activity_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)
    activity.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "activity", activity.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(activity)
    return activity

@router.delete("/{activity_id}", status_code=204)
async def delete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Activity).where(Activity.id == activity_id, Activity.tenant_id == current_user.tenant_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("Activity not found")
    if activity.created_by != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this activity")
    await db.delete(activity)
    await log_event(db, current_user.tenant_id, current_user.id, "activity", activity.id, "deleted")
    await db.commit()
    return

@router.post("/{activity_id}/complete", response_model=ActivityRead)
async def complete_activity(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Activity).where(Activity.id == activity_id, Activity.tenant_id == current_user.tenant_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise NotFoundError("Activity not found")
    activity.is_completed = True
    activity.completed_at = datetime.utcnow()
    activity.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "activity", activity.id, "updated", new_values={"is_completed": True, "completed_at": str(activity.completed_at)})
    await db.commit()
    await db.refresh(activity)
    return activity


# --- Email tracking endpoints (no auth required — pixel is embedded in emails) ---

# 1x1 transparent GIF bytes
_TRACKING_PIXEL = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00"
    b"!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


@router.get("/tracking/pixel/{activity_id}", include_in_schema=False)
async def track_email_open(
    activity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve a 1x1 GIF and increment opens counter for the activity."""
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if activity:
        activity.opens = (activity.opens or 0) + 1
        activity.updated_at = datetime.utcnow()
        await db.commit()
    return Response(
        content=_TRACKING_PIXEL,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        },
    )


@router.get("/tracking/click/{activity_id}", include_in_schema=False)
async def track_email_click(
    activity_id: str,
    url: str = Query(..., description="Target URL to redirect to"),
    db: AsyncSession = Depends(get_db),
):
    """Increment clicks counter for the activity and redirect to target URL."""
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if activity:
        activity.clicks = (activity.clicks or 0) + 1
        activity.updated_at = datetime.utcnow()
        await db.commit()
    return RedirectResponse(url=url, status_code=302)
