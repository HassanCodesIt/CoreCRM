from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.core.exceptions import NotFoundError
from app.models.deal import Deal
from app.services.deal_service import DealService
from app.schemas.deal import DealCreate, DealUpdate, DealResponse, DealStageUpdate
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("/", response_model=PaginatedResponse[DealResponse])
async def list_deals(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    owner_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_owner_id = current_user.id if current_user.role == "rep" else owner_id
    deals, total = await DealService.get_deals(db, page, limit, search, stage, effective_owner_id)
    return PaginatedResponse(data=deals, total=total, page=page, limit=limit)


@router.get("/pipeline", response_model=List[DealResponse])
async def get_pipeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    owner_id = current_user.id if current_user.role == "rep" else None
    return await DealService.get_deals_by_stage(db, owner_id)


@router.post("/", response_model=DealResponse, status_code=201)
async def create_deal(data: DealCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await DealService.create_deal(db, data, current_user.id)


@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    deal = await DealService.get_deal_by_id(db, deal_id)
    if not deal:
        raise NotFoundError("Deal not found")
    return deal


@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(deal_id: str, data: DealUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    deal = await DealService.update_deal(db, deal_id, data)
    if not deal:
        raise NotFoundError("Deal not found")
    return deal


@router.patch("/{deal_id}/stage", response_model=DealResponse)
async def update_deal_stage(deal_id: str, data: DealStageUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    deal = await DealService.update_deal_stage(db, deal_id, data)
    if not deal:
        raise NotFoundError("Deal not found")
    return deal


@router.delete("/{deal_id}")
async def delete_deal(deal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_manager_or_admin)):
    success = await DealService.delete_deal(db, deal_id)
    if not success:
        raise NotFoundError("Deal not found")
    return {"message": "Deal deleted"}
