from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from app.core.exceptions import NotFoundError
from app.core.dependencies import get_db
from app.services.lead_routing_service import LeadRoutingService
from app.models.lead import Lead

router = APIRouter(prefix="/public", tags=["public"])


class PublicLeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    source: Optional[str] = None


@router.post("/leads")
async def public_capture_lead(
    lead_in: PublicLeadCreate,
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
):
    # Rudimentary tenant resolution via header; in real environments, verify tenant access
    if not x_tenant_id:
        raise NotFoundError("Tenant not provided")
    # Resolve tenant existence
    result = await db.execute(text("SELECT id FROM tenants WHERE id = :tid"), {"tid": x_tenant_id})
    if not result or result.first() is None:
        raise NotFoundError("Tenant not found")

    # Derive first/last name from full name
    name = lead_in.name.strip()
    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    owner_id = None
    try:
        routing_owner = await LeadRoutingService(db, x_tenant_id).pick_owner_id()
        owner_id = routing_owner
    except Exception:
        owner_id = None

    lead = Lead(
        id=str(uuid4()),
        tenant_id=x_tenant_id,
        owner_id=owner_id or "system",
        first_name=first_name,
        last_name=last_name,
        name=name,
        email=lead_in.email,
        phone=lead_in.phone,
        company_name=lead_in.company_name,
        source=lead_in.source,
        status="new",
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead
