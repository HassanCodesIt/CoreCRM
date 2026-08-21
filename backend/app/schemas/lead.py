from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class LeadBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    converted: Optional[bool] = None
    score: Optional[int] = None

class LeadRead(LeadBase):
    id: str
    tenant_id: str
    owner_id: str
    score: Optional[float] = None
    converted: bool = False
    converted_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeadActivityCreate(BaseModel):
    activity_type: str
    subject: str
    content: Optional[str] = None
    event_metadata: Optional[dict] = None


class LeadActivityRead(BaseModel):
    id: str
    lead_id: str
    activity_type: str
    subject: str
    content: Optional[str] = None
    event_metadata: Optional[dict] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadScoreEventRead(BaseModel):
    id: str
    lead_id: str
    action: str
    score_delta: int
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeadBulkUpdate(BaseModel):
    ids: list[str]
    action: str
    value: Optional[str] = None

