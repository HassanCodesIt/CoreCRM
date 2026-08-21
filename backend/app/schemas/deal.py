from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class DealBase(BaseModel):
    title: str
    value: Optional[float] = None
    currency: str = "USD"
    expected_close_date: Optional[date] = None
    status: str = "open"
    notes: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    pipeline_id: str
    stage_id: str

class DealCreate(DealBase):
    pass

class DealUpdate(BaseModel):
    title: Optional[str] = None
    value: Optional[float] = None
    currency: Optional[str] = None
    expected_close_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    pipeline_id: Optional[str] = None
    stage_id: Optional[str] = None
    loss_reason: Optional[str] = None
    is_rotting: Optional[bool] = None

class DealRead(DealBase):
    id: str
    tenant_id: str
    owner_id: str
    actual_close_date: Optional[date] = None
    closed_at: Optional[datetime] = None
    loss_reason: Optional[str] = None
    close_reason: Optional[str] = None
    amount_final: Optional[float] = None
    is_rotting: Optional[bool] = None
    ai_summary: Optional[str] = None
    ai_health_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
