from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class AccountBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    annual_revenue: Optional[Decimal] = None
    employee_count: Optional[int] = None
    account_type: str = "prospect"
    owner_id: Optional[str] = None
    parent_account_id: Optional[str] = None
    description: Optional[str] = None


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    annual_revenue: Optional[Decimal] = None
    employee_count: Optional[int] = None
    account_type: Optional[str] = None
    owner_id: Optional[str] = None
    parent_account_id: Optional[str] = None
    description: Optional[str] = None


class AccountResponse(AccountBase):
    id: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
