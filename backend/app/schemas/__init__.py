from app.schemas.contact import ContactBase, ContactCreate, ContactUpdate, ContactRead
from app.schemas.account import AccountBase, AccountCreate, AccountUpdate, AccountRead
from app.schemas.lead import LeadBase, LeadCreate, LeadUpdate, LeadRead
from app.schemas.pipeline import (
    PipelineStageBase, PipelineStageCreate, PipelineStageRead,
    PipelineBase, PipelineCreate, PipelineUpdate, PipelineRead
)
from app.schemas.deal import DealBase, DealCreate, DealUpdate, DealRead
from app.schemas.activity import ActivityBase, ActivityCreate, ActivityUpdate, ActivityRead
from app.schemas.ticket import TicketBase, TicketCreate, TicketUpdate, TicketRead
from app.schemas.campaign import CampaignBase, CampaignCreate, CampaignUpdate, CampaignRead
from app.schemas.dashboard import DashboardStats
from app.schemas.user import UserUpdate, UserRead
