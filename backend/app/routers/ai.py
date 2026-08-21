"""
AI Copilot router — provides conversational chat and record-summarization endpoints
that power the frontend AI Copilot sidebar.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, date, timedelta

from app.core.dependencies import get_current_active_user, get_db
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])


# ─────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None  # optional extra CRM context injected by the frontend


class ChatResponse(BaseModel):
    reply: str


class SummarizeRequest(BaseModel):
    record_type: Literal["lead", "contact", "deal", "account"]
    record_id: str
    extra_context: Optional[str] = None


class SummarizeResponse(BaseModel):
    summary: str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    body: ChatRequest,
    current_user=Depends(get_current_active_user),
):
    """
    Conversational AI endpoint for the Copilot sidebar.
    Accepts a thread of messages and returns the next assistant reply.
    """
    client = AIService.get_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI service unavailable: GROQ_API_KEY not configured.")

    system_prompt = (
        "You are CoreCRM Copilot, an expert sales & CRM assistant. "
        "Answer questions about CRM best practices, sales strategy, lead management, and help users understand their data. "
        "Respond in **Markdown** format, never using tables. Keep answers concise (3‑5 sentences max unless more detail is requested) and always be actionable and professional."
    )
    if body.context:
        system_prompt += f"\n\nCurrent CRM context provided by the user:\n{body.context}"

    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in body.messages:
        groq_messages.append({"role": msg.role, "content": msg.content})

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=groq_messages,
            temperature=0.7,
            max_tokens=500,
        )
        reply = completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI backend error: {str(e)}")

    return ChatResponse(reply=reply)


@router.post("/summarize-record", response_model=SummarizeResponse)
async def summarize_record(
    body: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Summarize any CRM record (lead, contact, deal, account) using the AI service.
    Fetches the record from the DB and passes context to the AI.
    """
    client = AIService.get_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI service unavailable: GROQ_API_KEY not configured.")

    # Lazy imports to avoid circular deps
    record_context = ""

    try:
        if body.record_type == "lead":
            from app.models.lead import Lead
            from app.models.activity import Activity

            result = await db.execute(
                select(Lead).where(Lead.id == body.record_id, Lead.tenant_id == current_user.tenant_id)
            )
            lead = result.scalar_one_or_none()
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")

            acts_result = await db.execute(
                select(Activity)
                .where(Activity.lead_id == body.record_id)
                .order_by(Activity.created_at.desc())
                .limit(10)
            )
            activities = acts_result.scalars().all()

            record_context = (
                f"Name: {lead.name}\nCompany: {lead.company or 'N/A'}\n"
                f"Email: {lead.email or 'N/A'}\nStatus: {lead.status}\n"
                f"Score: {lead.score}\nSource: {lead.source or 'N/A'}\n"
                f"Industry: {lead.industry or 'N/A'}\n"
            )
            summary = await AIService.summarize_lead(record_context, activities)

        elif body.record_type == "contact":
            from app.models.contact import Contact
            from app.models.activity import Activity

            result = await db.execute(
                select(Contact).where(Contact.id == body.record_id, Contact.tenant_id == current_user.tenant_id)
            )
            contact = result.scalar_one_or_none()
            if not contact:
                raise HTTPException(status_code=404, detail="Contact not found")

            acts_result = await db.execute(
                select(Activity)
                .where(Activity.contact_id == body.record_id)
                .order_by(Activity.created_at.desc())
                .limit(10)
            )
            activities = acts_result.scalars().all()

            record_context = (
                f"Name: {contact.first_name} {contact.last_name}\n"
                f"Email: {contact.email or 'N/A'}\nPhone: {contact.phone or 'N/A'}\n"
                f"Title: {contact.title or 'N/A'}\n"
            )
            summary = await AIService.summarize_lead(record_context, activities)

        elif body.record_type == "deal":
            from app.models.deal import Deal

            result = await db.execute(
                select(Deal).where(Deal.id == body.record_id, Deal.tenant_id == current_user.tenant_id)
            )
            deal = result.scalar_one_or_none()
            if not deal:
                raise HTTPException(status_code=404, detail="Deal not found")

            record_context = (
                f"Deal Name: {deal.title}\nValue: ${deal.value or 0:,.0f}\n"
                f"Stage: {deal.stage_id}\nStatus: {deal.status}\n"
                f"Close Date: {deal.expected_close_date or 'N/A'}\n"
                f"Health Score: {deal.ai_health_score}/100\n"
            )
            summary = await AIService.get_insight(
                f"Summarize this deal for a sales rep in 2-3 sentences:\n{record_context}"
            )

        else:  # account
            from app.models.account import Account

            result = await db.execute(
                select(Account).where(Account.id == body.record_id, Account.tenant_id == current_user.tenant_id)
            )
            account = result.scalar_one_or_none()
            if not account:
                raise HTTPException(status_code=404, detail="Account not found")

            record_context = (
                f"Account: {account.name}\nIndustry: {account.industry or 'N/A'}\n"
                f"Website: {account.website or 'N/A'}\nEmployees: {account.employee_count or 'N/A'}\n"
                f"Revenue: ${account.annual_revenue or 'N/A'}\nStatus: {account.status}\n"
            )
            summary = await AIService.get_insight(
                f"Summarize this account for a sales rep in 2-3 sentences:\n{record_context}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

    if body.extra_context:
        summary += f"\n\n📌 Additional context: {body.extra_context}"

    return SummarizeResponse(summary=summary)


# ─────────────────────────────────────────────
# /ai/context  — live CRM snapshot for the sidebar
# ─────────────────────────────────────────────

class CRMContext(BaseModel):
    generated_at: str
    user_name: str
    today: str
    stats: Dict[str, Any]
    hot_leads: List[Dict[str, Any]]
    overdue_activities: List[Dict[str, Any]]
    deals_closing_soon: List[Dict[str, Any]]
    context_text: str   # pre-formatted string ready to paste into system prompt


@router.get("/context", response_model=CRMContext)
async def get_crm_context(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Returns a rich, live CRM data snapshot for the current user.
    The frontend injects this as context into every Copilot chat message
    so the AI can answer data-aware questions like 'which leads should I call today?'
    """
    from app.models.lead import Lead
    from app.models.deal import Deal
    from app.models.activity import Activity
    from app.models.contact import Contact

    tid = current_user.tenant_id
    today = date.today()
    now = datetime.utcnow()
    week_from_now = today + timedelta(days=7)

    # ── Aggregate stats ──────────────────────────────────────────────────────
    # Total leads
    total_leads_r = await db.execute(
        select(func.count()).where(Lead.tenant_id == tid)
    )
    total_leads = total_leads_r.scalar() or 0

    # Converted leads
    converted_leads_r = await db.execute(
        select(func.count()).where(Lead.tenant_id == tid, Lead.status == "converted")
    )
    converted_leads = converted_leads_r.scalar() or 0

    # Qualified leads
    qualified_leads_r = await db.execute(
        select(func.count()).where(Lead.tenant_id == tid, Lead.status == "qualified")
    )
    qualified_leads = qualified_leads_r.scalar() or 0

    # Total open leads (excluding converted, lost, disqualified)
    open_leads_r = await db.execute(
        select(func.count()).where(Lead.tenant_id == tid, Lead.status.notin_(["converted", "lost", "disqualified"]))
    )
    open_leads = open_leads_r.scalar() or 0

    # Hot leads (score >= 70, not converted/lost)
    hot_leads_r = await db.execute(
        select(Lead)
        .where(Lead.tenant_id == tid, Lead.score >= 70, Lead.status.notin_(["converted", "lost", "disqualified"]))
        .order_by(Lead.score.desc())
        .limit(5)
    )
    hot_leads_rows = hot_leads_r.scalars().all()

    # New leads today
    new_today_r = await db.execute(
        select(func.count()).where(
            Lead.tenant_id == tid,
            func.date(Lead.created_at) == today,
        )
    )
    new_today = new_today_r.scalar() or 0

    # Open deals value
    open_deals_r = await db.execute(
        select(func.count(), func.sum(Deal.value)).where(
            Deal.tenant_id == tid, Deal.status == "open", Deal.is_deleted == False
        )
    )
    deal_count, deal_value = open_deals_r.one()
    deal_count = deal_count or 0
    deal_value = float(deal_value or 0)

    # Deals closing this week
    closing_r = await db.execute(
        select(Deal)
        .where(
            Deal.tenant_id == tid,
            Deal.status == "open",
            Deal.is_deleted == False,
            Deal.expected_close_date != None,
            Deal.expected_close_date <= week_from_now,
        )
        .order_by(Deal.expected_close_date)
        .limit(5)
    )
    closing_deals = closing_r.scalars().all()

    # Overdue activities (due_date < today, not completed)
    overdue_r = await db.execute(
        select(Activity)
        .where(
            Activity.tenant_id == tid,
            Activity.is_completed == False,
            Activity.due_date != None,
            Activity.due_date < now,
        )
        .order_by(Activity.due_date)
        .limit(8)
    )
    overdue_acts = overdue_r.scalars().all()

    # Due today (not yet overdue)
    due_today_r = await db.execute(
        select(func.count()).where(
            Activity.tenant_id == tid,
            Activity.is_completed == False,
            Activity.due_date != None,
            func.date(Activity.due_date) == today,
        )
    )
    due_today = due_today_r.scalar() or 0

    # Total contacts
    contacts_r = await db.execute(select(func.count()).where(Contact.tenant_id == tid))
    total_contacts = contacts_r.scalar() or 0

    # ── Build structured data ────────────────────────────────────────────────
    stats = {
        "open_leads": open_leads,
        "new_leads_today": new_today,
        "hot_leads_count": len(hot_leads_rows),
        "open_deals": deal_count,
        "pipeline_value_usd": round(deal_value, 2),
        "deals_closing_this_week": len(closing_deals),
        "overdue_activities": len(overdue_acts),
        "activities_due_today": due_today,
        "total_contacts": total_contacts,
    }

    hot_leads_list = [
        {
            "name": l.name,
            "company": l.company or "N/A",
            "score": l.score,
            "status": l.status,
            "email": l.email or "N/A",
        }
        for l in hot_leads_rows
    ]

    overdue_list = [
        {
            "subject": a.subject,
            "type": a.activity_type,
            "due_date": str(a.due_date)[:16] if a.due_date else "N/A",
        }
        for a in overdue_acts
    ]

    closing_list = [
        {
            "title": d.title,
            "value_usd": float(d.value or 0),
            "close_date": str(d.expected_close_date),
            "status": d.status,
        }
        for d in closing_deals
    ]

    # ── Pre-formatted context string for system prompt injection ─────────────
    hot_lead_txt = "\n".join(
        f"  • {l['name']} ({l['company']}) — Score {l['score']}, Email: {l['email']}"
        for l in hot_leads_list
    ) or "  None"

    overdue_txt = "\n".join(
        f"  • [{a['type']}] {a['subject']} — was due {a['due_date']}"
        for a in overdue_list
    ) or "  None"

    closing_txt = "\n".join(
        f"  • {d['title']} — ${d['value_usd']:,.0f}, closes {d['close_date']}"
        for d in closing_list
    ) or "  None"

    context_text = f"""=== LIVE CRM DATA for {current_user.full_name} (as of {today}) ===

PIPELINE OVERVIEW:
- Total leads: {total_leads} (Open: {open_leads}, Converted: {converted_leads}, Qualified: {qualified_leads}, {new_today} new today, {len(hot_leads_rows)} HOT)
- Open deals: {deal_count} | Total pipeline value: ${deal_value:,.0f}
- Deals closing this week: {len(closing_deals)}
- Total contacts in CRM: {total_contacts}

HOT LEADS (score ≥ 70):
{hot_lead_txt}

OVERDUE TASKS / ACTIVITIES:
{overdue_txt}

DEALS CLOSING THIS WEEK:
{closing_txt}

ACTIVITY TODAY:
- Activities due today: {due_today}
- Overdue activities: {len(overdue_acts)}

Use this data to give specific, actionable answers. Reference lead names, deal titles, and real numbers when relevant.
"""

    return CRMContext(
        generated_at=now.isoformat(),
        user_name=current_user.full_name,
        today=str(today),
        stats=stats,
        hot_leads=hot_leads_list,
        overdue_activities=overdue_list,
        deals_closing_soon=closing_list,
        context_text=context_text,
    )


# ─────────────────────────────────────────────
# Email Draft Generation
# ─────────────────────────────────────────────

class EmailDraftRequest(BaseModel):
    recipient_id: str
    recipient_type: Literal["lead", "contact"]
    email_type: Optional[str] = "initial"
    tone: Optional[str] = "professional"
    extra_context: Optional[str] = None


class EmailDraftResponse(BaseModel):
    subject: str
    body: str


class AdaptedRecipient:
    def __init__(self, name, company, email, status, score, source=None, industry=None):
        self.name = name
        self.company = company
        self.email = email
        self.status = status
        self.score = score
        self.source = source or "N/A"
        self.industry = industry or "N/A"


@router.post("/email/draft", response_model=EmailDraftResponse)
async def ai_email_draft(
    body: EmailDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Generate a personalized email draft for a lead or contact using the AI service.
    """
    client = AIService.get_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI service unavailable: GROQ_API_KEY not configured.")

    from app.models.activity import Activity

    recipient_name = ""
    recipient_email = ""
    recipient_company = ""
    recipient_status = ""
    recipient_score = 0
    recipient_source = ""
    recipient_industry = ""

    activities = []

    if body.recipient_type == "lead":
        from app.models.lead import Lead
        result = await db.execute(
            select(Lead).where(Lead.id == body.recipient_id, Lead.tenant_id == current_user.tenant_id)
        )
        lead = result.scalar_one_or_none()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        recipient_name = lead.name
        recipient_email = lead.email or "N/A"
        recipient_company = lead.company or lead.company_name or "N/A"
        recipient_status = lead.status
        recipient_score = lead.score
        recipient_source = lead.source or "N/A"
        recipient_industry = getattr(lead, "industry", None) or "N/A"

        acts_result = await db.execute(
            select(Activity)
            .where(Activity.lead_id == body.recipient_id)
            .order_by(Activity.created_at.desc())
            .limit(5)
        )
        activities = acts_result.scalars().all()

    else:
        from app.models.contact import Contact
        result = await db.execute(
            select(Contact).where(Contact.id == body.recipient_id, Contact.tenant_id == current_user.tenant_id)
        )
        contact = result.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        recipient_name = f"{contact.first_name} {contact.last_name}"
        recipient_email = contact.email or "N/A"
        recipient_company = contact.company_name or (contact.account.name if contact.account else "N/A")
        recipient_status = contact.status
        recipient_score = contact.lead_score
        recipient_source = contact.source or "N/A"
        recipient_industry = "N/A"

        acts_result = await db.execute(
            select(Activity)
            .where(Activity.contact_id == body.recipient_id)
            .order_by(Activity.created_at.desc())
            .limit(5)
        )
        activities = acts_result.scalars().all()

    recipient = AdaptedRecipient(
        name=recipient_name,
        company=recipient_company,
        email=recipient_email,
        status=recipient_status,
        score=recipient_score,
        source=recipient_source,
        industry=recipient_industry
    )

    try:
        draft = await AIService.generate_outreach_email(
            lead=recipient,
            activities=activities,
            email_type=body.email_type,
            tone=body.tone,
            context=body.extra_context
        )
        return EmailDraftResponse(
            subject=draft.get("subject", "Quick follow up"),
            body=draft.get("body", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate email draft: {str(e)}")

