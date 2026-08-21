from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta, date as datetime_date
from uuid import uuid4
from typing import Optional, List
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.models.user import User
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.lead import Lead

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


class AvailabilityRequest(BaseModel):
    user_id: str
    date: str  # YYYY-MM-DD


class BookMeetingRequest(BaseModel):
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    date: str  # YYYY-MM-DD
    slot: str  # HH:MM
    subject: str
    notes: Optional[str] = None


@router.get("/host/{user_id}", response_model=dict)
async def get_host_details(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get public details of the host user for the booking page."""
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Host user not found"
        )
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
    }


@router.post("/availability", response_model=List[str])
async def get_availability(
    req: AvailabilityRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get 30-minute available slots for a user on a given date.
    Working hours: 09:00 - 17:00 (local or naive).
    """
    # 1. Resolve host user and tenant
    result = await db.execute(select(User).where(User.id == req.user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Host user not found"
        )

    # 2. Parse request date
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )

    # 3. Define all potential 30-min slots from 09:00 to 17:00
    start_hour = 9
    end_hour = 17
    all_slots = []
    curr = datetime.combine(target_date, datetime.min.time()).replace(hour=start_hour)
    end_time = datetime.combine(target_date, datetime.min.time()).replace(hour=end_hour)

    while curr < end_time:
        all_slots.append(curr)
        curr += timedelta(minutes=30)

    # 4. Fetch existing meetings/activities for this user on this day
    # We look for overlapping meetings
    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    query = select(Activity).where(
        and_(
            Activity.assigned_to == req.user_id,
            Activity.activity_type == "meeting",
            Activity.due_date >= day_start,
            Activity.due_date <= day_end
        )
    )
    result = await db.execute(query)
    existing_meetings = result.scalars().all()

    # 5. Filter slots
    available_slots = []
    for slot in all_slots:
        slot_start = slot
        slot_end = slot + timedelta(minutes=30)

        # Check if this overlaps with any existing meetings
        is_booked = False
        for meeting in existing_meetings:
            if meeting.due_date:
                meet_start = meeting.due_date
                duration = meeting.duration_minutes or 30
                meet_end = meet_start + timedelta(minutes=duration)

                # Overlap conditions:
                # Max(start1, start2) < Min(end1, end2)
                overlap_start = max(slot_start, meet_start)
                overlap_end = min(slot_end, meet_end)
                if overlap_start < overlap_end:
                    is_booked = True
                    break
        
        # Don't allow booking in the past
        if slot_start < datetime.utcnow():
            is_booked = True

        if not is_booked:
            available_slots.append(slot_start.strftime("%H:%M"))

    return available_slots


@router.post("/book", response_model=dict)
async def book_meeting(
    req: BookMeetingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Book a meeting with a host.
    Associates with contact/lead if exists (by email), otherwise creates a new Lead.
    """
    # 1. Resolve host user and lock the row to serialize concurrent booking operations for this host
    result = await db.execute(
        select(User)
        .where(User.id == req.user_id, User.is_active == True)
        .with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Host user not found"
        )
    
    tenant_id = user.tenant_id

    # 2. Check if a Contact with this email already exists
    contact_query = select(Contact).where(
        and_(
            Contact.tenant_id == tenant_id,
            Contact.email == req.email,
            Contact.is_deleted == False
        )
    )
    contact_res = await db.execute(contact_query)
    contact = contact_res.scalar_one_or_none()

    entity_type = None
    entity_id = None
    contact_id = None
    lead_id = None

    if contact:
        entity_type = "contact"
        entity_id = contact.id
        contact_id = contact.id
    else:
        # Check if a Lead with this email already exists
        lead_query = select(Lead).where(
            and_(
                Lead.tenant_id == tenant_id,
                Lead.email == req.email,
                Lead.converted == False
            )
        )
        lead_res = await db.execute(lead_query)
        lead = lead_res.scalar_one_or_none()

        if lead:
            entity_type = "lead"
            entity_id = lead.id
            lead_id = lead.id
        else:
            # Create a new Lead
            name = req.name.strip()
            parts = name.split(" ", 1)
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""

            lead = Lead(
                id=str(uuid4()),
                tenant_id=tenant_id,
                owner_id=req.user_id,
                first_name=first_name,
                last_name=last_name,
                name=name,
                email=req.email,
                phone=req.phone,
                company_name=req.company or f"{name}'s Company",
                company=req.company or f"{name}'s Company",
                source="website",
                status="new"
            )
            db.add(lead)
            await db.flush() # flush to get the lead ID
            entity_type = "lead"
            entity_id = lead.id
            lead_id = lead.id

    # 3. Create meeting activity
    try:
        meeting_datetime = datetime.strptime(f"{req.date} {req.slot}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date or slot format"
        )

    # Check slot availability double booking check
    day_start = datetime.combine(meeting_datetime.date(), datetime.min.time())
    day_end = datetime.combine(meeting_datetime.date(), datetime.max.time())
    query = select(Activity).where(
        and_(
            Activity.assigned_to == req.user_id,
            Activity.activity_type == "meeting",
            Activity.due_date >= day_start,
            Activity.due_date <= day_end
        )
    )
    existing_res = await db.execute(query)
    existing_meetings = existing_res.scalars().all()

    slot_start = meeting_datetime
    slot_end = meeting_datetime + timedelta(minutes=30)
    for meeting in existing_meetings:
        if meeting.due_date:
            meet_start = meeting.due_date
            duration = meeting.duration_minutes or 30
            meet_end = meet_start + timedelta(minutes=duration)

            overlap_start = max(slot_start, meet_start)
            overlap_end = min(slot_end, meet_end)
            if overlap_start < overlap_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This slot is already booked"
                )

    new_activity = Activity(
        id=str(uuid4()),
        tenant_id=tenant_id,
        created_by=req.user_id,
        assigned_to=req.user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        activity_type="meeting",
        subject=req.subject,
        body=req.notes or f"Meeting scheduled via self-booking page.",
        due_date=meeting_datetime,
        duration_minutes=30,
        contact_id=contact_id,
        lead_id=lead_id,
        is_completed=False
    )
    db.add(new_activity)
    await db.commit()

    return {
        "status": "success",
        "message": "Meeting scheduled successfully",
        "activity_id": new_activity.id,
        "lead_id": lead_id,
        "contact_id": contact_id
    }
