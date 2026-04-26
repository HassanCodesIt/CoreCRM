from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    account_id: Optional[str] = None
    owner_id: Optional[str] = None
    lead_score: int = 0
    contact_stage: str = "lead"
    source: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    account_id: Optional[str] = None
    owner_id: Optional[str] = None
    lead_score: Optional[int] = None
    contact_stage: Optional[str] = None
    source: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class ContactBulkUpdate(BaseModel):
    ids: list[str]
    action: str  # change_status, assign_owner, delete
    value: Optional[str] = None


class ContactImport(BaseModel):
    contacts: list[ContactCreate]


class ContactResponse(ContactBase):
    id: str
    last_contacted_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
