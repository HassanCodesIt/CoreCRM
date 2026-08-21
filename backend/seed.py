"""
Seed script — run from backend/:
    python seed.py
"""

import asyncio
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import text

sys.path.insert(0, os.path.dirname(__file__))

from app.core.auth import get_password_hash
from app.database import AsyncSessionLocal, init_db
from app.models.account import Account
from app.models.activity import Activity
from app.models.attachment import Attachment
from app.models.audit_event import AuditEvent
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.deal_stage_history import DealStageHistory
from app.models.lead import Lead, LeadActivity, LeadScoreEvent
from app.models.note import Note
from app.models.notification import Notification
from app.models.ticket import Ticket
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.tenant import Tenant
from app.models.pipeline import Pipeline, PipelineStage


FIRST_NAMES = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth",
    "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
]

INDUSTRIES = [
    "Technology", "Healthcare", "Finance", "Retail", "Manufacturing", "Education", "Real Estate", "Logistics",
]

CITY_POOL = ["New York", "San Francisco", "Chicago", "Austin", "Seattle", "Boston", "Denver", "Miami"]

ACCOUNT_TYPES = ["prospect", "customer", "partner"]
CONTACT_STAGES = ["lead", "prospect", "customer", "churned"]
CONTACT_SOURCES = ["web", "referral", "social", "cold", "event", "other", "inbound", "partner"]

DEAL_STAGES = ["prospecting", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]

TICKET_PRIORITIES = ["low", "medium", "high", "urgent"]
TICKET_STATUSES = ["open", "pending", "resolved", "closed"]
TICKET_CATEGORIES = ["technical", "billing", "general", "feature_request", "onboarding"]

ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task"]

CAMPAIGN_TYPES = ["email", "ads", "social", "webinar"]
CAMPAIGN_STATUSES = ["active", "draft", "completed", "planning"]

LEAD_STATUSES = ["new", "contacted", "qualified", "nurturing", "unqualified", "converted"]
LEAD_SOURCES = ["organic", "paid_search", "social_media", "email", "referral", "campaign", "api", "manual", "imported"]

LEAD_SCORE_ACTIONS = [
    ("email_opened", 10),
    ("link_clicked", 20),
    ("demo_requested", 50),
    ("inactive", -10),
]


def rand_name() -> tuple[str, str]:
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)


def rand_company(i: int) -> str:
    prefix = random.choice(["Apex", "Nova", "Quantum", "Nexus", "Prime", "Global", "Stellar"])
    suffix = random.choice(["Solutions", "Systems", "Technologies", "Logistics", "Ventures", "Group"])
    return f"{prefix} {suffix} {i}"


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        print("Clearing existing data...")
        tables = [
            "audit_events",
            "attachments",
            "notes",
            "notifications",
            "deal_stage_history",
            "lead_score_events",
            "lead_activities",
            "leads",
            "activities",
            "tickets",
            "deals",
            "contacts",
            "campaigns",
            "accounts",
            "pipeline_stages",
            "pipelines",
            "users",
            "tenants",
        ]
        for table in tables:
            await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()
        print("Database cleared.")

        print("Creating tenant...")
        tenant_id = str(uuid.uuid4())
        tenant = Tenant(
            id=tenant_id,
            name="Demo Company",
            slug="demo",
            is_active=True,
            plan="starter"
        )
        db.add(tenant)
        await db.flush()
        print("Tenant created.")

        print("Creating pipelines and stages...")
        pipeline_configs = [
            {
                "name": "New Business",
                "currency": "INR",
                "rotting_days": 14,
                "is_default": True,
                "stages": [
                    ("Prospecting", 1, 10, False, False),
                    ("Discovery", 2, 25, False, False),
                    ("Solution Fit", 3, 45, False, False),
                    ("Proposal", 4, 65, False, False),
                    ("Negotiation", 5, 85, False, False),
                    ("Closed Won", 6, 100, True, False),
                    ("Closed Lost", 7, 0, False, True),
                ],
            },
            {
                "name": "Expansion",
                "currency": "INR",
                "rotting_days": 10,
                "is_default": False,
                "stages": [
                    ("Identify Expansion", 1, 20, False, False),
                    ("Stakeholder Review", 2, 40, False, False),
                    ("Business Case", 3, 60, False, False),
                    ("Procurement", 4, 80, False, False),
                    ("Closed Won", 5, 100, True, False),
                    ("Closed Lost", 6, 0, False, True),
                ],
            },
            {
                "name": "Partner Sales",
                "currency": "INR",
                "rotting_days": 21,
                "is_default": False,
                "stages": [
                    ("Partner Sourced", 1, 15, False, False),
                    ("Qualified Partner Lead", 2, 35, False, False),
                    ("Joint Demo", 3, 55, False, False),
                    ("Commercial Review", 4, 75, False, False),
                    ("Closed Won", 5, 100, True, False),
                    ("Closed Lost", 6, 0, False, True),
                ],
            },
        ]

        pipeline_records: list[dict] = []
        for config in pipeline_configs:
            pipeline_id = str(uuid.uuid4())
            pipeline = Pipeline(
                id=pipeline_id,
                tenant_id=tenant_id,
                name=config["name"],
                is_default=config["is_default"],
                currency=config["currency"],
                rotting_days=config["rotting_days"],
            )
            db.add(pipeline)
            await db.flush()

            stages = []
            for name, order, probability, is_won, is_lost in config["stages"]:
                stages.append(
                    PipelineStage(
                        id=str(uuid.uuid4()),
                        pipeline_id=pipeline_id,
                        name=name,
                        order=order,
                        probability=probability,
                        is_closed_won=is_won,
                        is_closed_lost=is_lost,
                    )
                )
            db.add_all(stages)
            await db.flush()

            stage_by_name = {s.name: s for s in stages}
            open_stages = [s for s in stages if not s.is_closed_won and not s.is_closed_lost]
            pipeline_records.append({
                "pipeline": pipeline,
                "stages": stages,
                "stage_by_name": stage_by_name,
                "open_stages": open_stages,
                "won_stage": next(s for s in stages if s.is_closed_won),
                "lost_stage": next(s for s in stages if s.is_closed_lost),
            })
        print("Pipelines and stages created.")

        print("Creating users...")
        admin_id = str(uuid.uuid4())
        manager_id = str(uuid.uuid4())
        rep_id = str(uuid.uuid4())

        users = [
            User(
                id=admin_id,
                tenant_id=tenant_id,
                email="admin@lead.crm",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
                is_verified=True,
            ),
            User(
                id=manager_id,
                tenant_id=tenant_id,
                email="manager@crm.com",
                full_name="Sarah Manager",
                hashed_password=get_password_hash("manager123"),
                role="manager",
                is_active=True,
                is_verified=True,
            ),
            User(
                id=rep_id,
                tenant_id=tenant_id,
                email="rep@crm.com",
                full_name="John Rep",
                hashed_password=get_password_hash("rep123"),
                role="rep",
                is_active=True,
                is_verified=True,
            ),
        ]
        db.add_all(users)
        await db.flush()
        user_ids = [admin_id, manager_id, rep_id]

        print("Creating accounts...")
        account_ids: list[str] = []
        for i in range(1, 31):
            acc_id = str(uuid.uuid4())
            account_ids.append(acc_id)
            name = rand_company(i)
            db.add(
                Account(
                    id=acc_id,
                    tenant_id=tenant_id,
                    name=name,
                    industry=random.choice(INDUSTRIES),
                    website=f"https://www.{name.lower().replace(' ', '')}.com",
                    phone=f"+1-555-{random.randint(1000, 9999)}",
                    city=random.choice(CITY_POOL),
                    country="USA",
                    annual_revenue=round(random.uniform(100000, 5000000), 2),
                    employee_count=random.randint(10, 1000),
                    status=random.choice(["prospect", "customer", "partner"]),
                    owner_id=random.choice(user_ids),
                    description=f"{name} is a {random.choice(INDUSTRIES)} organization.",
                )
            )
        await db.flush()

        print("Creating campaigns...")
        campaign_ids: list[str] = []
        for i in range(1, 11):
            campaign_id = str(uuid.uuid4())
            campaign_ids.append(campaign_id)
            start_offset = random.randint(-60, 20)
            duration = random.randint(10, 60)
            db.add(
                Campaign(
                    id=campaign_id,
                    tenant_id=tenant_id,
                    name=f"Campaign {i}: {random.choice(['Growth', 'Launch', 'Retention', 'Expansion'])}",
                    subject=f"Campaign {i} Subject",
                    body=f"Campaign {i} body content.",
                    status=random.choice(CAMPAIGN_STATUSES),
                    campaign_type=random.choice(CAMPAIGN_TYPES),
                    scheduled_at=datetime.utcnow() + timedelta(days=start_offset),
                    sent_at=datetime.utcnow() + timedelta(days=start_offset + random.randint(1, 5)) if random.random() > 0.5 else None,
                    recipient_count=random.randint(100, 10000),
                    open_count=random.randint(10, 5000),
                    click_count=random.randint(5, 2000),
                    owner_id=random.choice(user_ids),
                    description="Marketing outreach campaign targeting primary contacts and leads.",
                )
            )
        await db.flush()

        print("Creating contacts...")
        contact_ids: list[str] = []
        contact_account: dict[str, str] = {}
        for i in range(1, 71):
            contact_id = str(uuid.uuid4())
            contact_ids.append(contact_id)
            account_id = random.choice(account_ids)
            contact_account[contact_id] = account_id
            first, last = rand_name()
            db.add(
                Contact(
                    id=contact_id,
                    tenant_id=tenant_id,
                    first_name=first,
                    last_name=last,
                    email=f"{first.lower()}.{last.lower()}.{i}@example.com",
                    phone=f"+1-555-{random.randint(1000, 9999)}",
                    mobile=f"+1-444-{random.randint(1000, 9999)}",
                    job_title=random.choice(["CEO", "CTO", "VP", "Director", "Manager", "Engineer"]),
                    department=random.choice(["Sales", "Marketing", "Operations", "IT"]),
                    account_id=account_id,
                    owner_id=random.choice(user_ids),
                    lead_score=random.randint(0, 100),
                    contact_stage=random.choice(CONTACT_STAGES),
                    source=random.choice(CONTACT_SOURCES),
                    lead_source=random.choice(LEAD_SOURCES),
                    city=random.choice(CITY_POOL),
                    country="USA",
                    linkedin_url=f"https://linkedin.com/in/{first.lower()}{last.lower()}{i}",
                    notes="Primary point of contact. Expressed interest in platform features.",
                    last_contacted_at=datetime.utcnow() - timedelta(days=random.randint(0, 45)),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 120)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                )
            )
        await db.flush()

        print("Creating deals and stage histories...")
        deal_ids: list[str] = []
        deal_mix = {
            "New Business": {"open": 28, "won": 18, "lost": 10, "value_range": (18000, 240000)},
            "Expansion": {"open": 18, "won": 14, "lost": 8, "value_range": (9000, 125000)},
            "Partner Sales": {"open": 14, "won": 10, "lost": 6, "value_range": (12000, 180000)},
        }
        deal_titles = [
            "Platform rollout",
            "Automation suite",
            "Data migration",
            "Support consolidation",
            "Regional expansion",
            "Compliance upgrade",
            "Executive dashboard",
            "Integration package",
            "Customer success program",
            "Analytics workspace",
        ]
        loss_reasons = [
            "Budget deferred",
            "Chose competitor",
            "Timing mismatch",
            "No executive sponsor",
            "Procurement stalled",
        ]
        won_reasons = ["Executive alignment", "Strong ROI case", "Incumbent replacement", "Expansion approved"]

        deal_counter = 1
        for record in pipeline_records:
            pipeline = record["pipeline"]
            open_stages = record["open_stages"]
            mix = deal_mix[pipeline.name]
            statuses = (
                ["open"] * mix["open"]
                + ["won"] * mix["won"]
                + ["lost"] * mix["lost"]
            )
            random.shuffle(statuses)
            open_stage_sequence = []
            for stage_index, stage_obj in enumerate(open_stages):
                remaining_weight = max(len(open_stages) - stage_index, 1)
                open_stage_sequence.extend([stage_obj] * remaining_weight)

            for status in statuses:
                deal_id = str(uuid.uuid4())
                deal_ids.append(deal_id)
                contact_id = random.choice(contact_ids)
                account_id = contact_account[contact_id]
                owner_id = random.choice(user_ids)
                value_min, value_max = mix["value_range"]
                value = round(random.uniform(value_min, value_max), 2)
                created_at = datetime.utcnow() - timedelta(days=random.randint(18, 180))
                expected_close_date = (created_at + timedelta(days=random.randint(35, 130))).date()
                loss_reason = None
                close_reason = None
                amount_final = None
                closed_at = None
                actual_close_date = None

                if status == "open":
                    current_stage = random.choice(open_stage_sequence)
                    current_index = open_stages.index(current_stage)
                    stage_path = open_stages[:current_index + 1]
                    days_in_current_stage = random.randint(2, 35)
                    updated_at = datetime.utcnow() - timedelta(days=days_in_current_stage)
                    is_rotting = days_in_current_stage > pipeline.rotting_days
                    health_score = random.randint(35, 95)
                else:
                    created_at = datetime.utcnow() - timedelta(days=random.randint(70, 220))
                    close_stage = record["won_stage"] if status == "won" else record["lost_stage"]
                    reached_index = random.randint(max(1, len(open_stages) - 3), len(open_stages) - 1)
                    stage_path = open_stages[:reached_index + 1] + [close_stage]
                    closed_at = created_at + timedelta(days=random.randint(len(stage_path) * 6, len(stage_path) * 18 + 20))
                    if closed_at > datetime.utcnow() - timedelta(days=1):
                        closed_at = datetime.utcnow() - timedelta(days=random.randint(1, 21))
                        created_at = closed_at - timedelta(days=random.randint(len(stage_path) * 6, len(stage_path) * 18 + 20))
                    actual_close_date = closed_at.date()
                    updated_at = closed_at + timedelta(hours=random.randint(1, 36))
                    is_rotting = False
                    health_score = random.randint(70, 98) if status == "won" else random.randint(15, 55)
                    if status == "won":
                        close_reason = random.choice(won_reasons)
                        amount_final = round(value * random.uniform(0.92, 1.08), 2)
                    else:
                        loss_reason = random.choice(loss_reasons)
                        close_reason = loss_reason

                title_prefix = random.choice(["Enterprise", "Mid-market", "Strategic", "Commercial", "Growth"])
                deal = Deal(
                    id=deal_id,
                    tenant_id=tenant_id,
                    title=f"{title_prefix} {random.choice(deal_titles)} {deal_counter}",
                    value=value,
                    currency=pipeline.currency,
                    stage_id=stage_path[-1].id,
                    pipeline_id=pipeline.id,
                    expected_close_date=expected_close_date,
                    actual_close_date=actual_close_date,
                    closed_at=closed_at,
                    status=status,
                    loss_reason=loss_reason,
                    close_reason=close_reason,
                    amount_final=amount_final,
                    is_rotting=is_rotting,
                    notes=f"Opportunity tracked under the {pipeline.name} pipeline.",
                    ai_health_score=health_score,
                    contact_id=contact_id,
                    account_id=account_id,
                    owner_id=owner_id,
                    created_at=created_at,
                    updated_at=updated_at,
                )
                db.add(deal)

                previous_stage = stage_path[0]
                changed_at = created_at
                for next_stage in stage_path[1:]:
                    changed_at = changed_at + timedelta(days=random.randint(3, 18), hours=random.randint(2, 22))
                    if closed_at and next_stage.id == stage_path[-1].id:
                        final_transition_at = closed_at - timedelta(days=random.randint(0, 2), hours=random.randint(1, 8))
                        changed_at = max(changed_at, final_transition_at)
                    db.add(
                        DealStageHistory(
                            id=str(uuid.uuid4()),
                            tenant_id=tenant_id,
                            deal_id=deal_id,
                            pipeline_id=pipeline.id,
                            from_stage_id=previous_stage.id,
                            to_stage_id=next_stage.id,
                            changed_by=owner_id,
                            changed_at=changed_at,
                        )
                    )
                    previous_stage = next_stage
                deal_counter += 1
        await db.flush()

        print("Creating tickets...")
        ticket_ids: list[str] = []
        for i in range(1, 41):
            ticket_id = str(uuid.uuid4())
            ticket_ids.append(ticket_id)
            status = random.choice(TICKET_STATUSES)
            resolved_at = None
            if status in ["resolved", "closed"]:
                resolved_at = datetime.utcnow() - timedelta(days=random.randint(1, 30))
            db.add(
                Ticket(
                    id=ticket_id,
                    tenant_id=tenant_id,
                    ticket_number=f"TKT-{1000 + i}",
                    subject=f"{random.choice(['Billing', 'Access', 'Integration', 'Performance'])} issue #{i}",
                    description="Customer reported a technical issue regarding product settings and operations.",
                    status=status,
                    priority=random.choice(TICKET_PRIORITIES),
                    channel=random.choice(["email", "phone", "chat", "web"]),
                    contact_id=random.choice(contact_ids),
                    account_id=random.choice(account_ids),
                    owner_id=random.choice(user_ids),
                    resolved_at=resolved_at,
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 15)),
                )
            )
        await db.flush()

        print("Creating leads module data...")
        lead_ids: list[str] = []
        for i in range(1, 81):
            lead_id = str(uuid.uuid4())
            lead_ids.append(lead_id)
            first, last = rand_name()
            full_name = f"{first} {last}"
            status = random.choice(LEAD_STATUSES)
            base_score = random.randint(0, 80)
            db.add(
                Lead(
                    id=lead_id,
                    tenant_id=tenant_id,
                    owner_id=random.choice(user_ids),
                    first_name=first,
                    last_name=last,
                    name=full_name,
                    email=f"{first.lower()}.{last.lower()}.{1000 + i}@leadmail.com",
                    phone=f"+1-666-{random.randint(1000, 9999)}",
                    company_name=rand_company(100 + i),
                    company=rand_company(100 + i),
                    title=random.choice(["Founder", "VP Sales", "Head of Ops", "Director", "Manager"]),
                    source=random.choice(LEAD_SOURCES),
                    status=status,
                    score=base_score,
                    notes="Inbound lead captured via product landing page webform.",
                    converted=True if status == "converted" else False,
                    converted_contact_id=random.choice(contact_ids) if status == "converted" else None,
                    converted_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if status == "converted" else None,
                    ai_summary="Potential fit with medium intent based on early touchpoints.",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 100)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 15)),
                )
            )
        await db.flush()

        for lead_id in lead_ids:
            for j in range(random.randint(2, 5)):
                action, delta = random.choice(LEAD_SCORE_ACTIONS)
                db.add(
                    LeadScoreEvent(
                        id=str(uuid.uuid4()),
                        lead_id=lead_id,
                        action=action,
                        score_delta=delta,
                        description=f"Scoring update based on {action.replace('_', ' ')}",
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23)),
                    )
                )

            for j in range(random.randint(2, 6)):
                db.add(
                    LeadActivity(
                        id=str(uuid.uuid4()),
                        lead_id=lead_id,
                        activity_type=random.choice(["email", "call", "meeting", "note"]),
                        subject=random.choice([
                            "Intro outreach sent",
                            "Discovery call completed",
                            "Demo requested",
                            "Pricing follow-up",
                            "No response check-in",
                        ]),
                        content="Follow-up contact initiated regarding core CRM solutions and integration steps.",
                        event_metadata={"channel": random.choice(["email", "phone", "linkedin"])},
                        created_by=random.choice(user_ids),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23)),
                    )
                )

        await db.flush()

        print("Creating activities...")
        for i in range(1, 91):
            created_at = datetime.utcnow() - timedelta(days=random.randint(0, 90))
            due_at = datetime.utcnow() + timedelta(days=random.randint(-10, 20))
            due_at = due_at.replace(hour=random.randint(9, 17), minute=random.choice([0, 30]), second=0, microsecond=0)
            is_completed = random.choice([True, False])
            entity_type = random.choice(["contact", "deal", "lead", "account", "ticket"])
            contact_id = None
            deal_id = None
            lead_id = None
            account_id = None
            ticket_id = None
            if entity_type == "contact":
                entity_id = random.choice(contact_ids)
                contact_id = entity_id
            elif entity_type == "deal":
                entity_id = random.choice(deal_ids)
                deal_id = entity_id
            elif entity_type == "lead":
                entity_id = random.choice(lead_ids)
                lead_id = entity_id
            elif entity_type == "account":
                entity_id = random.choice(account_ids)
                account_id = entity_id
            else:
                entity_id = random.choice(ticket_ids)
                ticket_id = entity_id

            act_type = random.choice(ACTIVITY_TYPES)
            m_type = None
            m_status = None
            m_loc = None
            dur = random.randint(15, 90)
            reminder = 0
            subject = f"{random.choice(['Follow-up', 'Call', 'Demo', 'Email'])} activity {i}"

            if act_type == "meeting":
                m_type = random.choice(['discovery', 'demo', 'follow_up', 'internal', 'success'])
                m_status = 'completed' if is_completed else random.choice(['scheduled', 'cancelled'])
                m_loc = random.choice(['Google Meet', 'Zoom Meeting', 'Conference Room A', 'HQ Office'])
                dur = random.choice([15, 30, 45, 60, 90])
                reminder = random.choice([0, 15, 30, 60])
                type_label = m_type.replace('_', ' ').title()
                subject = f"{type_label} Discussion {i}"

            db.add(
                Activity(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    created_by=random.choice(user_ids),
                    entity_type=entity_type,
                    entity_id=entity_id,
                    activity_type=act_type,
                    subject=subject,
                    body="Task completed successfully and logged into target customer timeline.",
                    due_date=due_at,
                    completed_at=created_at + timedelta(hours=random.randint(1, 48)) if is_completed else None,
                    is_completed=is_completed,
                    duration_minutes=dur,
                    contact_id=contact_id,
                    deal_id=deal_id,
                    lead_id=lead_id,
                    account_id=account_id,
                    ticket_id=ticket_id,
                    assigned_to=random.choice(user_ids),
                    meeting_type=m_type,
                    meeting_status=m_status,
                    location=m_loc,
                    reminder_trigger_minutes=reminder,
                    created_at=created_at,
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                )
            )
        

        print("Creating notes...")
        for i in range(1, 61):
            db.add(
                Note(
                    id=str(uuid.uuid4()),
                    content=f"Internal note {i}: follow-up and context details.",
                    is_pinned=(i % 10 == 0),
                    contact_id=random.choice(contact_ids) if random.random() > 0.5 else None,
                    deal_id=random.choice(deal_ids) if random.random() > 0.5 else None,
                    account_id=random.choice(account_ids) if random.random() > 0.5 else None,
                    ticket_id=random.choice(ticket_ids) if random.random() > 0.5 else None,
                    created_by=random.choice(user_ids),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                )
            )

        print("Creating attachments...")
        for i in range(1, 41):
            db.add(
                Attachment(
                    id=str(uuid.uuid4()),
                    filename=f"attachment_{i}.pdf",
                    file_url=f"/uploads/attachment_{i}.pdf",
                    file_size=random.randint(15000, 4000000),
                    mime_type="application/pdf",
                    contact_id=random.choice(contact_ids) if random.random() > 0.5 else None,
                    deal_id=random.choice(deal_ids) if random.random() > 0.5 else None,
                    uploaded_by=random.choice(user_ids),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 100)),
                )
            )

        print("Creating notifications...")
        for i in range(1, 61):
            ref_type = random.choice(["contact", "deal", "ticket", None])
            if ref_type == "contact":
                ref_id = random.choice(contact_ids)
            elif ref_type == "deal":
                ref_id = random.choice(deal_ids)
            elif ref_type == "ticket":
                ref_id = random.choice(ticket_ids)
            else:
                ref_id = None

            title = random.choice([
                "Lead assigned",
                "Deal updated",
                "Ticket assigned",
                "Status changed",
            ])
            body_map = {
                "Lead assigned": "A new inbound lead has been assigned to your workspace queue.",
                "Deal updated": "The opportunity status has been updated to the next active stage.",
                "Ticket assigned": "Support ticket has been successfully assigned to you for resolution.",
                "Status changed": "The status of the associated record has been modified."
            }
            db.add(
                Notification(
                    id=str(uuid.uuid4()),
                    user_id=random.choice(user_ids),
                    title=title,
                    body=body_map[title],
                    type=random.choice(["lead_assigned", "status_changed", "deal_updated", "ticket_assigned"]),
                    reference_id=ref_id,
                    reference_type=ref_type,
                    is_read=random.choice([True, False]),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23)),
                )
            )

        await db.commit()

    print("Dummy data created successfully across all modules.")
    print("Users:")
    print("  admin@lead.crm  / admin123")
    print("  manager@crm.com / manager123")
    print("  rep@crm.com     / rep123")
    print("")
    print("Tenant: Demo Company (slug: demo)")


if __name__ == "__main__":
    asyncio.run(seed())
