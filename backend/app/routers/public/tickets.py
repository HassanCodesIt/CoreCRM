from fastapi import APIRouter, Depends, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from uuid import uuid4
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.core.exceptions import NotFoundError
from app.core.dependencies import get_db
from app.models.ticket import Ticket
from app.models.contact import Contact

router = APIRouter(prefix="/public/tickets", tags=["public", "tickets"])


class InboundTicketCreate(BaseModel):
    subject: str
    description: Optional[str] = None
    email: EmailStr
    name: Optional[str] = None
    priority: Optional[str] = "medium"


async def _resolve_contact_id(db: AsyncSession, tenant_id: str, email: str, name: Optional[str] = None) -> Optional[str]:
    # Try to find an existing contact by email
    result = await db.execute(
        select(Contact).where(
            Contact.tenant_id == tenant_id,
            Contact.email == email,
            Contact.is_deleted == False
        )
    )
    contact = result.scalar_one_or_none()
    if contact:
        return contact.id

    # Create a new contact if not found
    parts = (name or "").strip().split(" ", 1)
    first_name = parts[0] or email.split("@")[0]
    last_name = parts[1] if len(parts) > 1 else ""

    # Assign to system or default user (can be improved with routing service later)
    new_contact = Contact(
        id=str(uuid4()),
        tenant_id=tenant_id,
        owner_id="system", # Temporary fallback
        first_name=first_name,
        last_name=last_name,
        email=email,
        contact_stage="lead",
        source="Inbound Email",
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact.id

@router.post("/")
async def public_create_inbound_ticket(
    ticket_in: InboundTicketCreate,
    background_tasks: BackgroundTasks,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
):
    if not x_tenant_id:
        raise NotFoundError("Tenant not provided")

    result = await db.execute(text("SELECT id FROM tenants WHERE id = :tid"), {"tid": x_tenant_id})
    if not result or result.first() is None:
        raise NotFoundError("Tenant not found")

    contact_id = await _resolve_contact_id(db, x_tenant_id, ticket_in.email, ticket_in.name)

    ticket = Ticket(
        id=str(uuid4()),
        tenant_id=x_tenant_id,
        owner_id="system", # Can be replaced by an owner selection/routing service
        subject=ticket_in.subject,
        description=ticket_in.description,
        priority=ticket_in.priority or "medium",
        channel="email",
        contact_id=contact_id,
        status="open"
    )
    
    # Optional ticket number generation can go here (defaults to UUID based or specific format)
    # If using string primary key as ticket number, we'll just use a short UUID portion
    ticket.ticket_number = f"TKT-{str(uuid4())[:8].upper()}"

    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return {"id": ticket.id, "ticket_number": ticket.ticket_number, "status": "created"}
