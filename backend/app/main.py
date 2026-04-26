from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.routers import auth, users, contacts, accounts, deals, activities, tickets, dashboard, campaigns, attachments, notifications, leads


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="CRM API",
    version="1.0.0",
    description="Full-Stack CRM REST API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(contacts.router, prefix=PREFIX)
app.include_router(accounts.router, prefix=PREFIX)
app.include_router(deals.router, prefix=PREFIX)
app.include_router(activities.router, prefix=PREFIX)
app.include_router(tickets.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(campaigns.router, prefix=PREFIX)
app.include_router(leads.router, prefix=PREFIX)
app.include_router(notifications.router, prefix=PREFIX)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
