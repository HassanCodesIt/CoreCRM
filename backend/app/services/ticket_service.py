from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketStatusUpdate, TicketAssignUpdate
import uuid
from datetime import datetime

class TicketService:
    @staticmethod
    async def get_tickets(
        db: AsyncSession, 
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        q: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assignee_id: Optional[str] = None,
        contact_id: Optional[str] = None
    ) -> Tuple[List[Ticket], int]:
        query = select(Ticket).where(Ticket.is_deleted == False, Ticket.tenant_id == tenant_id)
        
        if q:
            query = query.where(or_(
                Ticket.subject.ilike(f"%{q}%"),
                Ticket.description.ilike(f"%{q}%")
            ))
        if status:
            query = query.where(Ticket.status == status)
        if priority:
            query = query.where(Ticket.priority == priority)
        if assignee_id:
            query = query.where(Ticket.assigned_to == assignee_id)
        if contact_id:
            query = query.where(Ticket.contact_id == contact_id)
            
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        query = query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_ticket_by_id(db: AsyncSession, ticket_id: str, tenant_id: str = None) -> Optional[Ticket]:
        query = select(Ticket).where(Ticket.id == ticket_id, Ticket.is_deleted == False)
        if tenant_id:
            query = query.where(Ticket.tenant_id == tenant_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_ticket(db: AsyncSession, data: TicketCreate) -> Ticket:
        # Generate ticket number (just a random hex or serial)
        ticket_number = f"TKT-{uuid.uuid4().hex[:6].upper()}"
        
        ticket = Ticket(
            id=str(uuid.uuid4()),
            ticket_number=ticket_number,
            **data.model_dump()
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def update_ticket(db: AsyncSession, ticket_id: str, data: TicketUpdate) -> Optional[Ticket]:
        ticket = await TicketService.get_ticket_by_id(db, ticket_id)
        if not ticket:
            return None
        
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(ticket, k, v)
        
        ticket.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def update_status(db: AsyncSession, ticket_id: str, data: TicketStatusUpdate) -> Optional[Ticket]:
        ticket = await TicketService.get_ticket_by_id(db, ticket_id)
        if not ticket:
            return None
        
        ticket.status = data.status
        if data.status == "resolved":
            ticket.resolved_at = datetime.utcnow()
        
        ticket.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def update_assignment(db: AsyncSession, ticket_id: str, data: TicketAssignUpdate) -> Optional[Ticket]:
        ticket = await TicketService.get_ticket_by_id(db, ticket_id)
        if not ticket:
            return None
        
        ticket.assigned_to = data.assigned_to
        ticket.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def delete_ticket(db: AsyncSession, ticket_id: str) -> bool:
        ticket = await TicketService.get_ticket_by_id(db, ticket_id)
        if not ticket:
            return False
        
        ticket.is_deleted = True
        ticket.updated_at = datetime.utcnow()
        await db.commit()
        return True
