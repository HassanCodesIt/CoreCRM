from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
from uuid import uuid4
from typing import Optional

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models.account import Account
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.schemas.account import AccountCreate, AccountUpdate, AccountRead
from app.services.audit_service import log_event

router = APIRouter(prefix="/accounts")



@router.get("/", response_model=dict)
async def list_accounts(
    skip: int = 0,
    limit: int = Query(50, le=200),
    industry: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    query = select(Account).where(Account.tenant_id == current_user.tenant_id).order_by(Account.created_at.desc())
    if industry:
        query = query.where(Account.industry == industry)
    if q:
        query = query.where(Account.name.ilike(f"%{q}%"))
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    accounts = result.scalars().all()
    return {"items": [AccountRead.model_validate(a) for a in accounts], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=AccountRead, status_code=201)
async def create_account(
    account_in: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    account = Account(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        **account_in.model_dump()
    )
    db.add(account)
    await log_event(db, current_user.tenant_id, current_user.id, "account", account.id, "created", new_values=account_in.model_dump())
    await db.commit()
    await db.refresh(account)
    return account

@router.get("/{account_id}", response_model=AccountRead)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")
    return account

@router.patch("/{account_id}", response_model=AccountRead)
async def update_account(
    account_id: str,
    account_in: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")
    if account.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this account")
    old_values = {k: getattr(account, k) for k in account_in.model_dump(exclude_unset=True).keys()}
    update_data = account_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)
    account.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "account", account.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(account)
    return account

@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")
    if account.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this account")
    await db.delete(account)
    await log_event(db, current_user.tenant_id, current_user.id, "account", account.id, "deleted")
    await db.commit()
    return

@router.get("/{account_id}/contacts", response_model=dict)
async def list_account_contacts(
    account_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")
    query = select(Contact).where(
        Contact.account_id == account_id,
        Contact.is_deleted == False,
        Contact.tenant_id == current_user.tenant_id
    )
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    contacts = result.scalars().all()
    from app.schemas.contact import ContactRead
    return {"items": [ContactRead.model_validate(c) for c in contacts], "total": total, "skip": skip, "limit": limit}

@router.get("/{account_id}/deals", response_model=dict)
async def list_account_deals(
    account_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")
    query = select(Deal).where(Deal.account_id == account_id, Deal.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    deals = result.scalars().all()
    from app.schemas.deal import DealRead
    return {"items": [DealRead.model_validate(d) for d in deals], "total": total, "skip": skip, "limit": limit}


@router.get("/{account_id}/timeline", response_model=list[dict])
async def get_account_timeline(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.tenant_id == current_user.tenant_id))
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account not found")

    timeline = [
        {
            "type": "account",
            "data": {"id": account.id, "name": account.name, "status": account.status, "event": "Account created"},
            "timestamp": account.created_at.isoformat(),
        }
    ]
    if account.updated_at and account.updated_at != account.created_at:
        timeline.append({
            "type": "account",
            "data": {"id": account.id, "name": account.name, "status": account.status, "event": "Account updated"},
            "timestamp": account.updated_at.isoformat(),
        })

    activities = (await db.execute(
        select(Activity).where(
            Activity.tenant_id == current_user.tenant_id,
            (Activity.account_id == account_id) | ((Activity.entity_type == "account") & (Activity.entity_id == account_id)),
        )
    )).scalars().all()
    for activity in activities:
        timeline.append({
            "type": "activity",
            "data": {"id": activity.id, "subject": activity.subject, "body": activity.body, "activity_type": activity.activity_type},
            "timestamp": (activity.completed_at or activity.created_at).isoformat(),
        })

    deals = (await db.execute(select(Deal).where(Deal.tenant_id == current_user.tenant_id, Deal.account_id == account_id))).scalars().all()
    for deal in deals:
        timeline.append({
            "type": "deal",
            "data": {"id": deal.id, "title": deal.title, "status": deal.status, "value": float(deal.value or 0)},
            "timestamp": deal.created_at.isoformat(),
        })

    tickets = (await db.execute(select(Ticket).where(Ticket.tenant_id == current_user.tenant_id, Ticket.account_id == account_id))).scalars().all()
    for ticket in tickets:
        timeline.append({
            "type": "ticket",
            "data": {"id": ticket.id, "subject": ticket.subject, "status": ticket.status, "priority": ticket.priority},
            "timestamp": ticket.created_at.isoformat(),
        })

    return sorted(timeline, key=lambda item: item["timestamp"], reverse=True)
