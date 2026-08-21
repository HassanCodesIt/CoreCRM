from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TicketBase(BaseModel):
    subject: str
    description: Optional[str] = None
    status: str = "open"
    priority: str = "medium"
    channel: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    email: Optional[str] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    channel: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    email: Optional[str] = None
    resolved_at: Optional[datetime] = None

class TicketRead(TicketBase):
    id: str
    tenant_id: str
    owner_id: str
    resolved_at: Optional[datetime] = None
    ai_category: Optional[str] = None
    ai_sentiment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
