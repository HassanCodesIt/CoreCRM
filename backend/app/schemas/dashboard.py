from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_contacts: int
    total_leads: int
    total_deals: int
    open_deals: int
    total_pipeline_value: float
    won_deals_this_month: int
    revenue_this_month: float
    total_revenue: float
    leads_this_month: int
    open_tickets: int
    conversion_rate: float
    rotting_deals: int
