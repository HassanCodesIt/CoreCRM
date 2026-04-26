from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class CampaignBase(BaseModel):
    name: str
    type: str = "email"
    status: str = "draft"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    owner_id: Optional[str] = None
    description: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = None
    owner_id: Optional[str] = None
    description: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
