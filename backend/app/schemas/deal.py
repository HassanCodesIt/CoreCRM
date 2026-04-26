from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class DealBase(BaseModel):
    title: str
    value: Optional[Decimal] = None
    currency: str = "USD"
    stage: str = "prospecting"
    close_date: Optional[date] = None
    probability: int = 0
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    owner_id: Optional[str] = None
    pipeline_id: int = 1
    lost_reason: Optional[str] = None
    description: Optional[str] = None


class DealCreate(DealBase):
    pass


class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    stage: Optional[str] = None
    close_date: Optional[date] = None
    probability: Optional[int] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    owner_id: Optional[str] = None
    pipeline_id: Optional[int] = None
    lost_reason: Optional[str] = None
    description: Optional[str] = None


class DealStageUpdate(BaseModel):
    stage: str


class DealResponse(DealBase):
    id: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    account_name: Optional[str] = None
    owner_name: Optional[str] = None

    model_config = {"from_attributes": True}
