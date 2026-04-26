from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class NoteBase(BaseModel):
    content: str
    is_pinned: bool = False
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    account_id: Optional[str] = None
    ticket_id: Optional[str] = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None


class NoteResponse(NoteBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


