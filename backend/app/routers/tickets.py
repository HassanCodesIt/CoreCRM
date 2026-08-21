from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from uuid import uuid4
from typing import Optional

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models.activity import Activity
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/tickets")

@router.get("/", response_model=dict)
async def list_tickets(
    skip: int = 0,
    limit: int = Query(50, le=200),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    channel: Optional[str] = None,
    owner_id: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    query = select(Ticket).where(Ticket.tenant_id == current_user.tenant_id).order_by(Ticket.created_at.desc())
    if status:
        query = query.where(Ticket.status == status)
    if priority:
        query = query.where(Ticket.priority == priority)
    if channel:
        query = query.where(Ticket.channel == channel)
    if owner_id:
        query = query.where(Ticket.owner_id == owner_id)
    if q:
        query = query.where(Ticket.subject.ilike(f"%{q}%") | Ticket.description.ilike(f"%{q}%"))
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    tickets = result.scalars().all()
    return {"items": [TicketRead.model_validate(t) for t in tickets], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=TicketRead, status_code=201)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    import random
    ticket_num = f"TKT-{random.randint(10000, 99999)}"
    ticket = Ticket(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        ticket_number=ticket_num,
        owner_id=current_user.id,
        **ticket_in.model_dump()
    )
    db.add(ticket)
    await log_event(db, current_user.tenant_id, current_user.id, "ticket", ticket.id, "created", new_values=ticket_in.model_dump())
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}/timeline", response_model=list[dict])
async def get_ticket_timeline(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")

    timeline = [
        {
            "type": "ticket",
            "data": {
                "id": ticket.id,
                "subject": ticket.subject,
                "status": ticket.status,
                "priority": ticket.priority,
                "event": "Ticket created",
            },
            "timestamp": ticket.created_at.isoformat(),
        }
    ]
    if ticket.updated_at and ticket.updated_at != ticket.created_at:
        timeline.append({
            "type": "ticket",
            "data": {
                "id": ticket.id,
                "subject": ticket.subject,
                "status": ticket.status,
                "priority": ticket.priority,
                "event": "Ticket updated",
            },
            "timestamp": ticket.updated_at.isoformat(),
        })
    if ticket.resolved_at:
        timeline.append({
            "type": "ticket",
            "data": {
                "id": ticket.id,
                "subject": ticket.subject,
                "status": "resolved",
                "priority": ticket.priority,
                "event": "Ticket resolved",
            },
            "timestamp": ticket.resolved_at.isoformat(),
        })

    activities = (await db.execute(
        select(Activity).where(
            Activity.tenant_id == current_user.tenant_id,
            (Activity.ticket_id == ticket_id) | ((Activity.entity_type == "ticket") & (Activity.entity_id == ticket_id)),
        )
    )).scalars().all()
    for activity in activities:
        timeline.append({
            "type": "activity",
            "data": {"id": activity.id, "subject": activity.subject, "body": activity.body, "activity_type": activity.activity_type},
            "timestamp": (activity.completed_at or activity.created_at).isoformat(),
        })

    return sorted(timeline, key=lambda item: item["timestamp"], reverse=True)

@router.get("/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket

@router.patch("/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")
    if ticket.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this ticket")
    old_values = {k: getattr(ticket, k) for k in ticket_in.model_dump(exclude_unset=True).keys()}
    update_data = ticket_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)
    ticket.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "ticket", ticket.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(ticket)
    return ticket

@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")
    if ticket.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this ticket")
    await db.delete(ticket)
    await log_event(db, current_user.tenant_id, current_user.id, "ticket", ticket.id, "deleted")
    await db.commit()
    return

@router.patch("/{ticket_id}/assign", response_model=TicketRead)
async def assign_ticket(
    ticket_id: str,
    owner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")
    if current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to assign tickets")
    old_owner_id = ticket.owner_id
    ticket.owner_id = owner_id
    ticket.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "ticket", ticket.id, "updated", new_values={"owner_id": owner_id}, old_values={"owner_id": old_owner_id})
    await db.commit()
    await db.refresh(ticket)
    return ticket

@router.post("/{ticket_id}/resolve", response_model=TicketRead)
async def resolve_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise NotFoundError("Ticket not found")
    ticket.status = "resolved"
    ticket.resolved_at = datetime.utcnow()
    ticket.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "ticket", ticket.id, "updated", new_values={"status": "resolved", "resolved_at": str(ticket.resolved_at)})
    await db.commit()
    await db.refresh(ticket)
    return ticket
