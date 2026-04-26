import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.attachment import Attachment
from app.models.user import User
from datetime import datetime

router = APIRouter(prefix="/attachments", tags=["attachments"])

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    contact_id: Optional[str] = Form(None),
    deal_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
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
        mime_type=file.content_type,
        contact_id=contact_id,
        deal_id=deal_id,
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Attachment)
    if contact_id:
        query = query.where(Attachment.contact_id == contact_id)
    if deal_id:
        query = query.where(Attachment.deal_id == deal_id)
        
    result = await db.execute(query.order_by(Attachment.created_at.desc()))
    return result.scalars().all()

@router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Attachment).where(Attachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    
    if not attachment:
        return {"error": "Not found"}
        
    # Delete physical file
    file_path = attachment.file_url.lstrip("/")
    if os.path.exists(file_path):
        os.remove(file_path)
        
    await db.delete(attachment)
    await db.commit()
    
    return {"message": "Attachment deleted"}
