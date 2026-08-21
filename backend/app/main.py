from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import Base, async_engine
from app.routers import auth, users, contacts, accounts, deals, activities, tickets, dashboard, campaigns, attachments, notifications, leads, pipelines, ai, email_role_mappings
from app.routers.public import leads as public_leads
from uuid import uuid4
from sqlalchemy import select, text
from app.models.pipeline import Pipeline, PipelineStage
from app.scheduler.lead_sla_scheduler import start_sla_scheduler
from app.services.rotting_job import start_rotting_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            # Create default pipeline if none exist
            from sqlalchemy import select
            from app.models.pipeline import Pipeline, PipelineStage

            result = await conn.execute(select(Pipeline))
            if result.first() is None:
                default_pipeline = Pipeline(
                    id=str(uuid4()),
                    name="Default Pipeline",
                    is_default=True,
                    currency="INR"
                )
                stages = [
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Prospecting", order=0, probability=10, is_closed_won=False, is_closed_lost=False),
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Qualified", order=1, probability=25, is_closed_won=False, is_closed_lost=False),
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Proposal", order=2, probability=50, is_closed_won=False, is_closed_lost=False),
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Negotiation", order=3, probability=75, is_closed_won=False, is_closed_lost=False),
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Closed Won", order=4, probability=100, is_closed_won=True, is_closed_lost=False),
                    PipelineStage(id=str(uuid4()), pipeline_id=default_pipeline.id, name="Closed Lost", order=5, probability=0, is_closed_won=False, is_closed_lost=True),
                ]
                conn.add(default_pipeline)
                conn.add_all(stages)
                await conn.commit()
                print("Created default pipeline with stages")
        except Exception as e:
            print(f"Failed to create default pipeline: {e}")

    # Run migrations using individual connections and transactions so one failing alter table doesn't poison others
    async with async_engine.connect() as conn:
        # Very lightweight migration: ensure status_changed_at column exists for SQLite/Postgres
        try:
            dialect_name = getattr(conn.dialect, "name", "")
            alter_sql = None
            if dialect_name == "sqlite":
                alter_sql = "ALTER TABLE leads ADD COLUMN status_changed_at DATETIME"
            elif dialect_name in ("postgresql", "postgres"):
                alter_sql = "ALTER TABLE leads ADD COLUMN status_changed_at TIMESTAMP WITHOUT TIME ZONE"
            if alter_sql:
                async with conn.begin():
                    await conn.execute(text(alter_sql))
                print("Migration: added leads.status_changed_at column (dialect) ->", dialect_name)
        except Exception:
            pass

        # Ensure activities table has opens and clicks columns
        for col_name, col_type in [
            ("opens", "INTEGER DEFAULT 0"),
            ("clicks", "INTEGER DEFAULT 0"),
            ("location", "VARCHAR(255)"),
            ("meeting_type", "VARCHAR(50)"),
            ("meeting_status", "VARCHAR(50) DEFAULT 'scheduled'"),
            ("meeting_outcome", "TEXT"),
            ("reminder_trigger_minutes", "INTEGER"),
            ("reminder_sent", "BOOLEAN DEFAULT 0"),
        ]:
            try:
                async with conn.begin():
                    await conn.execute(text(f"ALTER TABLE activities ADD COLUMN {col_name} {col_type}"))
                print(f"Migration: added activities.{col_name} column")
            except Exception:
                pass

        # Ensure tickets table has email column
        try:
            async with conn.begin():
                await conn.execute(text("ALTER TABLE tickets ADD COLUMN email VARCHAR(255)"))
            print("Migration: added tickets.email column")
        except Exception:
            pass

        # Ensure attachments table has ticket_id column
        try:
            async with conn.begin():
                await conn.execute(text("ALTER TABLE attachments ADD COLUMN ticket_id VARCHAR(36)"))
            print("Migration: added attachments.ticket_id column")
        except Exception:
            pass

        # Update default admin user email from admin@crm.com to admin@lead.crm
        try:
            async with conn.begin():
                await conn.execute(text("UPDATE users SET email = 'admin@lead.crm' WHERE email = 'admin@crm.com'"))
            print("Migration: updated admin user email to admin@lead.crm")
        except Exception:
            pass

    # Start SLA monitoring in background
    try:
        start_sla_scheduler()
    except Exception:
        pass
    try:
        start_rotting_scheduler()
        print("Started deal rotting scheduler")
    except Exception:
        pass
    yield


import time
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 15):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.ip_records = {}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/api/v1/public") or path == "/api/v1/scheduler/book":
            ip = request.client.host if request.client else "unknown"
            now = time.time()
            if ip in self.ip_records:
                self.ip_records[ip] = [ts for ts in self.ip_records[ip] if now - ts < 60]
            else:
                self.ip_records[ip] = []
            if len(self.ip_records[ip]) >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again in a minute."}
                )
            self.ip_records[ip].append(now)
        return await call_next(request)


app = FastAPI(
    title="CoreCRM API",
    version="1.0.0",
    description="AI-native CRM — REST API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "auth", "description": "Authentication & user session"},
        {"name": "contacts", "description": "Contact management"},
        {"name": "accounts", "description": "Account / company management"},
        {"name": "leads", "description": "Lead capture and conversion"},
        {"name": "pipelines", "description": "Sales pipeline and stage management"},
        {"name": "deals", "description": "Deal tracking and progression"},
        {"name": "activities", "description": "Calls, emails, meetings, tasks"},
        {"name": "tickets", "description": "Support ticket management"},
        {"name": "campaigns", "description": "Email campaign management"},
        {"name": "dashboard", "description": "Aggregated stats and KPIs"},
        {"name": "users", "description": "User and role management"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, requests_per_minute=15)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(contacts.router, prefix=PREFIX)
app.include_router(accounts.router, prefix=PREFIX)
app.include_router(leads.router, prefix=PREFIX)
app.include_router(pipelines.router, prefix=PREFIX)
app.include_router(deals.router, prefix=PREFIX)
app.include_router(activities.router, prefix=PREFIX)
app.include_router(tickets.router, prefix=PREFIX)
app.include_router(campaigns.router, prefix=PREFIX)
app.include_router(attachments.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
from app.routers import reports
app.include_router(reports.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(ai.router, prefix=PREFIX)
app.include_router(email_role_mappings.router, prefix=PREFIX)
from app.routers.public import leads as public_leads, tickets as public_tickets
from app.routers import scheduler
app.include_router(scheduler.router, prefix=PREFIX)
app.include_router(public_leads.router, prefix=PREFIX)
app.include_router(public_tickets.router, prefix=PREFIX)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    error_msg = str(exc.orig) if exc.orig else str(exc)
    detail = "Database integrity constraint violation."
    
    if "UNIQUE" in error_msg or "unique" in error_msg:
        if "email" in error_msg:
            detail = "A record with this email already exists."
        else:
            detail = "A record with these unique details already exists."
    elif "FOREIGN KEY" in error_msg or "foreign key" in error_msg:
        detail = "Referenced relation does not exist."
    elif "NOT NULL" in error_msg or "not null" in error_msg:
        detail = "Required fields are missing."
        
    return JSONResponse(
        status_code=400,
        content={"detail": detail}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Database error: {str(exc)}"}
    )


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}
