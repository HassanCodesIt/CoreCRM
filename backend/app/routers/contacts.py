from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import uuid

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.core.exceptions import NotFoundError
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.models.activity import Activity
from app.models.note import Note
from app.models.user import User
from app.services.contact_service import ContactService
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse, ContactBulkUpdate, ContactImport
from app.schemas.activity import ActivityResponse
from app.schemas.note import NoteCreate, NoteResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("/", response_model=PaginatedResponse[ContactResponse])
async def list_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    source: Optional[str] = None,
    owner_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Reps only see their own contacts
    effective_owner_id = current_user.id if current_user.role == "rep" else owner_id
    
    contacts, total = await ContactService.get_contacts(
        db, page, limit, search, stage, source, effective_owner_id, sort_by, sort_dir
    )
    return PaginatedResponse(data=contacts, total=total, page=page, limit=limit)


@router.post("/", response_model=ContactResponse, status_code=201)
async def create_contact(data: ContactCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await ContactService.create_contact(db, data, current_user.id)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = await ContactService.get_contact_by_id(db, contact_id)
    if not contact:
        raise NotFoundError("Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, data: ContactUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    contact = await ContactService.update_contact(db, contact_id, data)
    if not contact:
        raise NotFoundError("Contact not found")
    return contact


@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_manager_or_admin)):
    success = await ContactService.delete_contact(db, contact_id)
    if not success:
        raise NotFoundError("Contact not found")
    return {"message": "Contact deleted"}


@router.patch("/bulk-update")
async def bulk_update_contacts(
    data: ContactBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    count = await ContactService.bulk_update(db, data.ids, data.action, data.value)
    return {"message": f"Updated {count} contacts"}


@router.get("/{contact_id}/activities", response_model=PaginatedResponse[ActivityResponse])
async def get_contact_activities(contact_id: str, page: int = Query(1, ge=1), limit: int = Query(20), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Activity).where(Activity.contact_id == contact_id).order_by(Activity.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    activities = (await db.execute(query.offset((page - 1) * limit).limit(limit))).scalars().all()
    return PaginatedResponse(data=activities, total=total, page=page, limit=limit)


@router.get("/{contact_id}/deals")
async def get_contact_deals(contact_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Deal).where(Deal.contact_id == contact_id, Deal.is_deleted == False))
    return result.scalars().all()


@router.get("/{contact_id}/tickets")
async def get_contact_tickets(contact_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).where(Ticket.contact_id == contact_id, Ticket.is_deleted == False))
    return result.scalars().all()


@router.post("/{contact_id}/notes", response_model=NoteResponse, status_code=201)
async def add_note(contact_id: str, data: NoteCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = Note(id=str(uuid.uuid4()), contact_id=contact_id, created_by=current_user.id, **data.model_dump(exclude={"contact_id", "deal_id", "account_id", "ticket_id"}))
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note
@router.post("/import")
async def import_contacts(
    data: ContactImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    count = await ContactService.create_contacts_bulk(db, data.contacts, current_user.id)
    return {"message": f"Successfully imported {count} contacts"}
