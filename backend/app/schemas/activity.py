from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ActivityBase(BaseModel):
    entity_type: str
    entity_id: str
    activity_type: str
    subject: str
    body: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_status: Optional[str] = None
    meeting_outcome: Optional[str] = None
    reminder_trigger_minutes: Optional[int] = None
    reminder_sent: bool = False
    attachment_ids: Optional[list[str]] = None

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    activity_type: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_status: Optional[str] = None
    meeting_outcome: Optional[str] = None
    reminder_trigger_minutes: Optional[int] = None
    reminder_sent: Optional[bool] = None

class ActivityRead(ActivityBase):
    id: str
    tenant_id: str
    created_by: str
    assigned_to: Optional[str] = None
    completed_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    contact_id: Optional[str] = None
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    account_id: Optional[str] = None
    ticket_id: Optional[str] = None
    opens: int = 0
    clicks: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
