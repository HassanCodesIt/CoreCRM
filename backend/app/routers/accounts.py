from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.models.account import Account
from app.services.account_service import AccountService
from app.schemas.account import AccountCreate, AccountUpdate, AccountResponse
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=PaginatedResponse[AccountResponse])
async def list_accounts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    industry: Optional[str] = None,
    type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts, total = await AccountService.get_accounts(
        db, page, limit, search, industry, type
    )
    return PaginatedResponse(data=accounts, total=total, page=page, limit=limit)


@router.post("/", response_model=AccountResponse, status_code=201)
async def create_account(data: AccountCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await AccountService.create_account(db, data, current_user.id)


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = await AccountService.get_account_by_id(db, account_id)
    if not account:
        raise NotFoundError("Account not found")
    return account


@router.put("/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, data: AccountUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    account = await AccountService.update_account(db, account_id, data)
    if not account:
        raise NotFoundError("Account not found")
    return account


@router.delete("/{account_id}")
async def delete_account(account_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = await AccountService.delete_account(db, account_id)
    if not success:
        raise NotFoundError("Account not found")
    return {"message": "Account deleted"}


@router.get("/{account_id}/contacts")
async def get_account_contacts(account_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contact).where(Contact.account_id == account_id, Contact.is_deleted == False))
    return result.scalars().all()


@router.get("/{account_id}/deals")
async def get_account_deals(account_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Deal).where(Deal.account_id == account_id, Deal.is_deleted == False))
    return result.scalars().all()


@router.get("/{account_id}/activities")
async def get_account_activities(account_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Activity).where(Activity.account_id == account_id).order_by(Activity.created_at.desc()))
    return result.scalars().all()
