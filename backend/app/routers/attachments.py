import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.attachment import Attachment
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.user import User

router = APIRouter(prefix="/attachments", tags=["attachments"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


async def _resolve_reference(
    reference_type: Optional[str],
    reference_id: Optional[str],
    contact_id: Optional[str],
    deal_id: Optional[str],
    ticket_id: Optional[str],
    db: AsyncSession,
    current_user: User,
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if reference_type and reference_id:
        if reference_type == "contact":
            contact_id = reference_id
        elif reference_type == "deal":
            deal_id = reference_id
        elif reference_type == "ticket":
            ticket_id = reference_id
        else:
            raise BadRequestError("Attachments support contacts, deals, and tickets")

    if not contact_id and not deal_id and not ticket_id:
        raise BadRequestError("A contact, deal, or ticket reference is required")

    if contact_id:
        result = await db.execute(
            select(Contact.id).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id)
        )
        if not result.scalar_one_or_none():
            raise NotFoundError("Contact not found")

    if deal_id:
        result = await db.execute(
            select(Deal.id).where(Deal.id == deal_id, Deal.tenant_id == current_user.tenant_id)
        )
        if not result.scalar_one_or_none():
            raise NotFoundError("Deal not found")

    if ticket_id:
        from app.models.ticket import Ticket
        result = await db.execute(
            select(Ticket.id).where(Ticket.id == ticket_id, Ticket.tenant_id == current_user.tenant_id)
        )
        if not result.scalar_one_or_none():
            raise NotFoundError("Ticket not found")

    return contact_id, deal_id, ticket_id


@router.post("/upload")
@router.post("")
async def upload_attachment(
    file: UploadFile = File(...),
    reference_type: Optional[str] = Form(None),
    reference_id: Optional[str] = Form(None),
    contact_id: Optional[str] = Form(None),
    deal_id: Optional[str] = Form(None),
    ticket_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact_id, deal_id, ticket_id = await _resolve_reference(reference_type, reference_id, contact_id, deal_id, ticket_id, db, current_user)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1]
    save_name = f"{file_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_name)
    
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(save_path)
    
    attachment = Attachment(
        id=file_id,
        filename=file.filename,
        file_url=f"/uploads/{save_name}",
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        contact_id=contact_id,
        deal_id=deal_id,
        ticket_id=ticket_id,
        uploaded_by=current_user.id
    )
    
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    
    return attachment

@router.get("/")
async def list_attachments(
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    ticket_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Attachment)
    if contact_id:
        query = query.where(Attachment.contact_id == contact_id)
    if deal_id:
        query = query.where(Attachment.deal_id == deal_id)
    if ticket_id:
        query = query.where(Attachment.ticket_id == ticket_id)
        
    result = await db.execute(query.order_by(Attachment.created_at.desc()))
    return result.scalars().all()


@router.get("/{reference_type}/{reference_id}")
async def list_attachments_by_reference(
    reference_type: str,
    reference_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        contact_id, deal_id, ticket_id = await _resolve_reference(reference_type, reference_id, None, None, None, db, current_user)
    except NotFoundError:
        # If parent entity not found, return empty attachments gracefully
        return []
    return await list_attachments(contact_id=contact_id, deal_id=deal_id, ticket_id=ticket_id, db=db, current_user=current_user)

@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        raise NotFoundError("Attachment not found")
        
    # Delete physical file
    file_path = attachment.file_url.lstrip("/")
    if os.path.exists(file_path):
        os.remove(file_path)
        
    await db.delete(attachment)
    await db.commit()
    
    return {"message": "Attachment deleted"}
