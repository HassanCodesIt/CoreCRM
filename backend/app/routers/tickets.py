from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.services.ticket_service import TicketService
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketStatusUpdate, TicketAssignUpdate
from app.schemas.common import PaginatedResponse
from app.models.user import User

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/", response_model=PaginatedResponse[TicketResponse])
async def list_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assigned_to: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets, total = await TicketService.get_tickets(
        db, page, limit, status, priority, assigned_to
    )
    return PaginatedResponse(data=tickets, total=total, page=page, limit=limit)


@router.post("/", response_model=TicketResponse, status_code=201)
async def create_ticket(data: TicketCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await TicketService.create_ticket(db, data)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = await TicketService.get_ticket_by_id(db, ticket_id)
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: str, data: TicketUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = await TicketService.update_ticket(db, ticket_id, data)
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(ticket_id: str, data: TicketStatusUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = await TicketService.update_status(db, ticket_id, data)
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket


@router.patch("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(ticket_id: str, data: TicketAssignUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = await TicketService.update_assignment(db, ticket_id, data)
    if not ticket:
        raise NotFoundError("Ticket not found")
    return ticket


@router.delete("/{ticket_id}")
async def delete_ticket(ticket_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = await TicketService.delete_ticket(db, ticket_id)
    if not success:
        raise NotFoundError("Ticket not found")
    return {"message": "Ticket deleted"}
