from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TicketBase(BaseModel):
    subject: str
    description: Optional[str] = None
    status: str = "open"
    priority: str = "medium"
    category: str = "general"
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    assigned_to: Optional[str] = None
    sla_due_at: Optional[datetime] = None


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    assigned_to: Optional[str] = None
    sla_due_at: Optional[datetime] = None


class TicketStatusUpdate(BaseModel):
    status: str


class TicketAssignUpdate(BaseModel):
    assigned_to: str


class TicketResponse(TicketBase):
    id: str
    ticket_number: str
    resolved_at: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
