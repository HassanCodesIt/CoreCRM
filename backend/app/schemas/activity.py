from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityBase(BaseModel):
    activity_type: str
    subject: str
    description: Optional[str] = None
    outcome: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: bool = False
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    account_id: Optional[str] = None
    ticket_id: Optional[str] = None
    assigned_to: Optional[str] = None


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    activity_type: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    due_date: Optional[datetime] = None
    is_completed: Optional[bool] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    account_id: Optional[str] = None
    ticket_id: Optional[str] = None
    assigned_to: Optional[str] = None


class ActivityResponse(ActivityBase):
    id: str
    completed_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
