from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CampaignBase(BaseModel):
    name: str
    subject: Optional[str] = ""
    body: Optional[str] = ""
    campaign_type: Optional[str] = "email"
    scheduled_at: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[str] = "draft"

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    campaign_type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    description: Optional[str] = None
    status: Optional[str] = None

class CampaignRead(CampaignBase):
    id: str
    tenant_id: str
    owner_id: str
    sent_at: Optional[datetime] = None
    recipient_count: int = 0
    open_count: int = 0
    click_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
