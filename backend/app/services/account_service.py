from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate
import uuid
from datetime import datetime

class AccountService:
    @staticmethod
    async def get_accounts(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20,
        search: Optional[str] = None,
        industry: Optional[str] = None,
        account_type: Optional[str] = None
    ) -> Tuple[List[Account], int]:
        offset = (page - 1) * limit
        query = select(Account).where(Account.is_deleted == False)
        
        if search:
            query = query.where(or_(
                Account.name.ilike(f"%{search}%"),
                Account.email.ilike(f"%{search}%"),
            ))
        if industry:
            query = query.where(Account.industry == industry)
        if account_type:
            query = query.where(Account.account_type == account_type)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Account.name).offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_account_by_id(db: AsyncSession, account_id: str) -> Optional[Account]:
        result = await db.execute(select(Account).where(Account.id == account_id, Account.is_deleted == False))
        return result.scalar_one_or_none()

    @staticmethod
    async def create_account(db: AsyncSession, data: AccountCreate, owner_id: str) -> Account:
        account = Account(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            **data.model_dump()
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def update_account(db: AsyncSession, account_id: str, data: AccountUpdate) -> Optional[Account]:
        account = await AccountService.get_account_by_id(db, account_id)
        if not account:
            return None
        
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(account, k, v)
        
        account.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def delete_account(db: AsyncSession, account_id: str) -> bool:
        account = await AccountService.get_account_by_id(db, account_id)
        if not account:
            return False
        
        account.is_deleted = True
        account.updated_at = datetime.utcnow()
        await db.commit()
        return True
