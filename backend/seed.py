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
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.lead import Lead, LeadActivity, LeadScoreEvent
from app.models.note import Note
from app.models.notification import Notification
from app.models.ticket import Ticket
from app.models.user import User


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
        # SQLite create_all won't alter existing tables. Ensure newly added columns exist.
        existing_cols = await db.execute(text("PRAGMA table_info(activities)"))
        activity_columns = {row[1] for row in existing_cols.fetchall()}
        if "lead_id" not in activity_columns:
            await db.execute(text("ALTER TABLE activities ADD COLUMN lead_id VARCHAR(36)"))
            await db.commit()

        print("Clearing existing data...")
        tables = [
            "attachments",
            "notes",
            "notifications",
            "lead_score_events",
            "lead_activities",
            "leads",
            "activities",
            "tickets",
            "deals",
            "contacts",
            "campaigns",
            "accounts",
            "users",
        ]
        for table in tables:
            await db.execute(text(f"DELETE FROM {table}"))
        await db.commit()
        print("Database cleared.")

        print("Creating users...")
        admin_id = str(uuid.uuid4())
        manager_id = str(uuid.uuid4())
        rep_id = str(uuid.uuid4())

        users = [
            User(
                id=admin_id,
                email="admin@crm.com",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True,
            ),
            User(
                id=manager_id,
                email="manager@crm.com",
                full_name="Sarah Manager",
                hashed_password=get_password_hash("manager123"),
                role="manager",
                is_active=True,
            ),
            User(
                id=rep_id,
                email="rep@crm.com",
                full_name="John Rep",
                hashed_password=get_password_hash("rep123"),
                role="rep",
                is_active=True,
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
                    name=name,
                    industry=random.choice(INDUSTRIES),
                    website=f"https://www.{name.lower().replace(' ', '')}.com",
                    phone=f"+1-555-{random.randint(1000, 9999)}",
                    email=f"contact@{name.lower().replace(' ', '')}.com",
                    city=random.choice(CITY_POOL),
                    country="USA",
                    annual_revenue=round(random.uniform(100000, 5000000), 2),
                    employee_count=random.randint(10, 1000),
                    account_type=random.choice(ACCOUNT_TYPES),
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
                    name=f"Campaign {i}: {random.choice(['Growth', 'Launch', 'Retention', 'Expansion'])}",
                    type=random.choice(CAMPAIGN_TYPES),
                    status=random.choice(CAMPAIGN_STATUSES),
                    start_date=date.today() + timedelta(days=start_offset),
                    end_date=date.today() + timedelta(days=start_offset + duration),
                    budget=round(random.uniform(5000, 75000), 2),
                    owner_id=random.choice(user_ids),
                    description="Automated dummy campaign for CRM demo.",
                )
            )
        await db.flush()

        print("Creating contacts...")
        contact_ids: list[str] = []
        for i in range(1, 71):
            contact_id = str(uuid.uuid4())
            contact_ids.append(contact_id)
            first, last = rand_name()
            db.add(
                Contact(
                    id=contact_id,
                    first_name=first,
                    last_name=last,
                    email=f"{first.lower()}.{last.lower()}.{i}@example.com",
                    phone=f"+1-555-{random.randint(1000, 9999)}",
                    mobile=f"+1-444-{random.randint(1000, 9999)}",
                    job_title=random.choice(["CEO", "CTO", "VP", "Director", "Manager", "Engineer"]),
                    department=random.choice(["Sales", "Marketing", "Operations", "IT"]),
                    account_id=random.choice(account_ids),
                    owner_id=random.choice(user_ids),
                    lead_score=random.randint(0, 100),
                    contact_stage=random.choice(CONTACT_STAGES),
                    source=random.choice(CONTACT_SOURCES),
                    city=random.choice(CITY_POOL),
                    country="USA",
                    linkedin_url=f"https://linkedin.com/in/{first.lower()}{last.lower()}{i}",
                    notes="Auto-generated contact for development and testing.",
                    last_contacted_at=datetime.utcnow() - timedelta(days=random.randint(0, 45)),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 120)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                )
            )
        await db.flush()

        print("Creating deals...")
        deal_ids: list[str] = []
        for i in range(1, 51):
            deal_id = str(uuid.uuid4())
            deal_ids.append(deal_id)
            db.add(
                Deal(
                    id=deal_id,
                    title=f"{random.choice(['Enterprise', 'Mid-market', 'Standard', 'Custom'])} Deal {i}",
                    value=round(random.uniform(5000, 200000), 2),
                    currency="USD",
                    stage=random.choice(DEAL_STAGES),
                    close_date=date.today() + timedelta(days=random.randint(-15, 120)),
                    probability=random.randint(5, 95),
                    contact_id=random.choice(contact_ids),
                    account_id=random.choice(account_ids),
                    owner_id=random.choice(user_ids),
                    pipeline_id=1,
                    description="Demo pipeline opportunity.",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 120)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
                )
            )
        await db.flush()

        print("Creating tickets...")
        ticket_ids: list[str] = []
        for i in range(1, 41):
            ticket_id = str(uuid.uuid4())
            ticket_ids.append(ticket_id)
            db.add(
                Ticket(
                    id=ticket_id,
                    ticket_number=f"TKT-{1000 + i}",
                    subject=f"{random.choice(['Billing', 'Access', 'Integration', 'Performance'])} issue #{i}",
                    description="This ticket was generated as part of dummy CRM data.",
                    status=random.choice(TICKET_STATUSES),
                    priority=random.choice(TICKET_PRIORITIES),
                    category=random.choice(TICKET_CATEGORIES),
                    contact_id=random.choice(contact_ids),
                    account_id=random.choice(account_ids),
                    assigned_to=random.choice(user_ids),
                    first_response_at=datetime.utcnow() - timedelta(hours=random.randint(1, 96)),
                    sla_due_at=datetime.utcnow() + timedelta(hours=random.randint(12, 120)),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 15)),
                )
            )
        await db.flush()

        print("Creating activities...")
        for i in range(1, 91):
            created_at = datetime.utcnow() - timedelta(days=random.randint(0, 90))
            due_at = datetime.utcnow() + timedelta(days=random.randint(-10, 20))
            is_completed = random.choice([True, False])
            db.add(
                Activity(
                    id=str(uuid.uuid4()),
                    activity_type=random.choice(ACTIVITY_TYPES),
                    subject=f"{random.choice(['Follow-up', 'Call', 'Demo', 'Email'])} activity {i}",
                    description="Activity event created for module coverage.",
                    outcome=random.choice(["Positive", "Neutral", "Needs follow-up", None]),
                    due_date=due_at,
                    completed_at=created_at + timedelta(hours=random.randint(1, 48)) if is_completed else None,
                    is_completed=is_completed,
                    contact_id=random.choice(contact_ids),
                    deal_id=random.choice(deal_ids),
                    account_id=random.choice(account_ids),
                    ticket_id=random.choice(ticket_ids),
                    created_by=random.choice(user_ids),
                    assigned_to=random.choice(user_ids),
                    created_at=created_at,
                    updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 10)),
                )
            )

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
                    name=full_name,
                    email=f"{first.lower()}.{last.lower()}.{1000 + i}@leadmail.com",
                    phone=f"+1-666-{random.randint(1000, 9999)}",
                    company=rand_company(100 + i),
                    job_title=random.choice(["Founder", "VP Sales", "Head of Ops", "Director", "Manager"]),
                    website=f"https://www.leadco{i}.com",
                    industry=random.choice(INDUSTRIES),
                    status=status,
                    score=base_score,
                    source=random.choice(LEAD_SOURCES),
                    source_detail="Auto-generated source detail",
                    owner_id=random.choice(user_ids),
                    campaign_id=random.choice(campaign_ids) if random.random() > 0.3 else None,
                    tags=random.sample(["saas", "mid-market", "urgent", "enterprise", "webinar", "trial"], k=random.randint(1, 3)),
                    notes="Lead generated for development validation.",
                    ai_summary="Potential fit with medium intent based on early touchpoints.",
                    ai_qualification=random.choice(["HOT", "WARM", "COLD"]),
                    ai_insights={"conversion_probability": random.randint(20, 85), "preferred_channel": random.choice(["Email", "Phone", "LinkedIn"])},
                    ai_next_action=random.choice(["Follow up in 2 days", "Send pricing sheet", "Schedule discovery call"]),
                    last_activity_at=datetime.utcnow() - timedelta(days=random.randint(0, 20)),
                    converted_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if status == "converted" else None,
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
                        description=f"Dummy scoring event ({action})",
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
                        content="Dummy lead activity generated for timeline rendering.",
                        event_metadata={"channel": random.choice(["email", "phone", "linkedin"])},
                        created_by=random.choice(user_ids),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23)),
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
                    file_size=random.randint(15_000, 4_000_000),
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

            db.add(
                Notification(
                    id=str(uuid.uuid4()),
                    user_id=random.choice(user_ids),
                    title=random.choice([
                        "Lead assigned",
                        "Deal updated",
                        "Ticket assigned",
                        "Status changed",
                    ]),
                    body="This is a dummy notification generated for module coverage.",
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
    print("  admin@crm.com   / admin123")
    print("  manager@crm.com / manager123")
    print("  rep@crm.com     / rep123")


if __name__ == "__main__":
    asyncio.run(seed())
