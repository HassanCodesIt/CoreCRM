from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    status: str = "new"
    score: int = 0
    source: Optional[str] = None
    source_detail: Optional[str] = None
    owner_id: Optional[str] = None
    campaign_id: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    owner_id: Optional[str] = None
    campaign_id: Optional[str] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class LeadStageUpdate(BaseModel):
    status: str


class LeadBulkUpdate(BaseModel):
    ids: list[str]
    action: str
    value: Optional[str] = None


class LeadImport(BaseModel):
    leads: list[LeadCreate]


class LeadResponse(LeadBase):
    id: str
    ai_summary: Optional[str] = None
    ai_qualification: Optional[str] = None
    ai_insights: Optional[dict] = None
    ai_next_action: Optional[str] = None
    last_activity_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    owner_name: Optional[str] = None
    owner_avatar: Optional[str] = None
    campaign_name: Optional[str] = None

    model_config = {"from_attributes": True}


class LeadActivityResponse(BaseModel):
    id: str
    lead_id: str
    activity_type: str
    subject: str
    content: Optional[str] = None
    event_metadata: Optional[dict] = None
    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeadScoreEventResponse(BaseModel):
    id: str
    lead_id: str
    action: str
    score_delta: int
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeadConvertRequest(BaseModel):
    create_contact: bool = True
    create_account: bool = True
    create_deal: bool = True
    deal_title: Optional[str] = None
    deal_value: Optional[float] = None


class LeadConvertResponse(BaseModel):
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    deal_id: Optional[str] = None
    message: str


class LeadAISummaryRequest(BaseModel):
    pass


class LeadAISummaryResponse(BaseModel):
    summary: str


class LeadAIQualifyRequest(BaseModel):
    pass


class LeadAIQualifyResponse(BaseModel):
    qualification: str
    reasoning: str
    score_factors: list[str]


class LeadAIEmailRequest(BaseModel):
    email_type: str = "initial"
    tone: str = "professional"
    context: Optional[str] = None


class LeadAIEmailResponse(BaseModel):
    subject: str
    body: str


class LeadAIInsightsRequest(BaseModel):
    pass


class LeadAIInsightsResponse(BaseModel):
    conversion_probability: int
    best_contact_time: str
    preferred_channel: str
    pain_points: list[str]
    key_strengths: list[str]
    recommended_actions: list[str]


class LeadBulkImportResponse(BaseModel):
    count: int
    errors: Optional[list[str]] = None
