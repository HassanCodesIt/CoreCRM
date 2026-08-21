from pydantic import BaseModel, EmailStr, field_validator, model_validator
from datetime import datetime
from typing import Any, Optional, List
import json

class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    account_id: Optional[str] = None
    contact_stage: str = "lead"
    source: Optional[str] = None
    linkedin_url: Optional[str] = None
    lead_source: Optional[str] = None
    status: str = "active"
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("email", mode="before")
    def blank_email_to_none(cls, v):
        return None if v == "" else v

    @model_validator(mode="after")
    def map_legacy_title(self):
        if self.title and not self.job_title:
            self.job_title = self.title
        return self

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    account_id: Optional[str] = None
    contact_stage: Optional[str] = None
    source: Optional[str] = None
    linkedin_url: Optional[str] = None
    lead_source: Optional[str] = None
    status: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("email", mode="before")
    def blank_email_to_none(cls, v):
        return None if v == "" else v

    @model_validator(mode="after")
    def map_legacy_title(self):
        if self.title and not self.job_title:
            self.job_title = self.title
        return self

class ContactRead(ContactBase):
    id: str
    tenant_id: str
    owner_id: str
    lead_score: Optional[float] = None
    ai_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator('tags', mode='before')
    def deserialize_tags(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    @model_validator(mode="before")
    @classmethod
    def add_legacy_read_fields(cls, data):
        if not isinstance(data, dict):
            values = {
                "id": getattr(data, "id", None),
                "tenant_id": getattr(data, "tenant_id", None),
                "owner_id": getattr(data, "owner_id", None),
                "first_name": getattr(data, "first_name", None),
                "last_name": getattr(data, "last_name", None),
                "email": getattr(data, "email", None),
                "phone": getattr(data, "phone", None),
                "mobile": getattr(data, "mobile", None),
                "job_title": getattr(data, "job_title", None),
                "department": getattr(data, "department", None),
                "account_id": getattr(data, "account_id", None),
                "contact_stage": getattr(data, "contact_stage", None),
                "source": getattr(data, "source", None),
                "lead_source": getattr(data, "lead_source", None),
                "status": getattr(data, "status", None),
                "city": getattr(data, "city", None),
                "country": getattr(data, "country", None),
                "linkedin_url": getattr(data, "linkedin_url", None),
                "notes": getattr(data, "notes", None),
                "tags": getattr(data, "tags", None),
                "lead_score": getattr(data, "lead_score", None),
                "ai_summary": getattr(data, "ai_summary", None),
                "created_at": getattr(data, "created_at", None),
                "updated_at": getattr(data, "updated_at", None),
            }
            values["title"] = values["job_title"]
            values["company_name"] = None
            return values
        data.setdefault("title", data.get("job_title"))
        data.setdefault("company_name", None)
        return data

    class Config:
        from_attributes = True


class ContactMergeRequest(BaseModel):
    primary_id: str
    secondary_ids: List[str]


class ContactCustomFieldBase(BaseModel):
    name: str
    type: str
    options: Optional[List[str]] = None

    @field_validator("type")
    def validate_type(cls, v):
        allowed = {"text", "number", "date", "select"}
        if v not in allowed:
            raise ValueError(f"type must be one of {', '.join(sorted(allowed))}")
        return v


class ContactCustomFieldCreate(ContactCustomFieldBase):
    pass


class ContactCustomFieldRead(ContactCustomFieldBase):
    id: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ContactCustomValueWrite(BaseModel):
    field_id: str
    value: Optional[str] = None


class ContactCustomValueRead(BaseModel):
    id: str
    contact_id: str
    field_id: str
    value: Optional[str] = None
    field: Optional[ContactCustomFieldRead] = None

    class Config:
        from_attributes = True


class ContactCustomValuesUpsert(BaseModel):
    values: List[ContactCustomValueWrite]


class ContactImportConfirm(BaseModel):
    upload_id: str
    mapping: dict[str, str]


class ContactLegacyImport(BaseModel):
    contacts: List[dict[str, Any]]
