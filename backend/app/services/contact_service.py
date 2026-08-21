from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple
from app.models.contact import Contact
from app.models.notification import Notification, NotificationType, ReferenceType
from app.schemas.contact import ContactCreate, ContactUpdate
import uuid
from datetime import datetime

class ContactService:
    @staticmethod
    async def get_contacts(
        db: AsyncSession, 
        tenant_id: str,
        page: int = 1, 
        limit: int = 20,
        search: Optional[str] = None,
        stage: Optional[str] = None,
        source: Optional[str] = None,
        owner_id: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc"
    ) -> Tuple[List[Contact], int]:
        offset = (page -1) * limit
        query = select(Contact).where(Contact.is_deleted == False, Contact.tenant_id == tenant_id)
        
        if search:
            query = query.where(or_(
                Contact.first_name.ilike(f"%{search}%"),
                Contact.last_name.ilike(f"%{search}%"),
                Contact.email.ilike(f"%{search}%"),
            ))
        if stage:
            query = query.where(Contact.contact_stage == stage)
        if source:
            sources = source.split(',')
            query = query.where(Contact.source.in_(sources))
        if owner_id:
            query = query.where(Contact.owner_id == owner_id)
            
        # Count total
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar()
        
        # Sort and Page
        col = getattr(Contact, sort_by, Contact.created_at)
        order = col.desc() if sort_dir == "desc" else col.asc()
        query = query.order_by(order).offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all(), total

    @staticmethod
    async def get_contact_by_id(db: AsyncSession, contact_id: str, tenant_id: str = None) -> Optional[Contact]:
        query = select(Contact).where(Contact.id == contact_id, Contact.is_deleted == False)
        if tenant_id:
            query = query.where(Contact.tenant_id == tenant_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_contact(db: AsyncSession, data: ContactCreate, owner_id: str, tenant_id: str) -> Contact:
        contact = Contact(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            tenant_id=tenant_id,
            **data.model_dump()
        )
        db.add(contact)
        await db.commit()
        await db.refresh(contact)
        return contact

    @staticmethod
    async def update_contact(db: AsyncSession, contact_id: str, data: ContactUpdate, tenant_id: str) -> Optional[Contact]:
        contact = await ContactService.get_contact_by_id(db, contact_id, tenant_id)
        if not contact:
            return None
        
        old_values = {k: getattr(contact, k) for k, v in data.model_dump(exclude_none=True).items()}
        old_owner_id = contact.owner_id
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(contact, k, v)
        
        # Trigger notification if owner changed
        new_owner_id = contact.owner_id
        if new_owner_id != old_owner_id and new_owner_id:
            notification = Notification(
                user_id=new_owner_id,
                title="Lead Assigned",
                body=f"You have been assigned a new lead: {contact.full_name}",
                type="lead_assigned",
                reference_id=contact.id,
                reference_type="contact"
            )
            db.add(notification)

        contact.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(contact)
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, contact.owner_id, "contact", contact.id, "updated", new_values=data.model_dump(exclude_none=True), old_values=old_values)
        return contact

    @staticmethod
    async def delete_contact(db: AsyncSession, contact_id: str, tenant_id: str) -> bool:
        contact = await ContactService.get_contact_by_id(db, contact_id, tenant_id)
        if not contact:
            return False
        
        contact.is_deleted = True
        contact.updated_at = datetime.utcnow()
        await db.commit()
        # Audit
        from app.services.audit_service import log_event
        await log_event(db, tenant_id, contact.owner_id, "contact", contact.id, "deleted")
        return True

    @staticmethod
    async def bulk_update(db: AsyncSession, ids: List[str], action: str, value: Optional[str] = None, tenant_id: str = None) -> int:
        query = select(Contact).where(Contact.id.in_(ids), Contact.is_deleted == False)
        if tenant_id:
            query = query.where(Contact.tenant_id == tenant_id)
        result = await db.execute(query)
        contacts = result.scalars().all()
        
        count = 0
        for contact in contacts:
            if action == "change_status" and value:
                contact.contact_stage = value
                count += 1
            elif action == "assign_owner" and value:
                contact.owner_id = value
                count += 1
            elif action == "delete":
                contact.is_deleted = True
                count += 1
            contact.updated_at = datetime.utcnow()
        
        await db.commit()
        return count
    @staticmethod
    async def create_contacts_bulk(db: AsyncSession, data: List[ContactCreate], owner_id: str, tenant_id: str) -> int:
        contacts = []
        for contact_data in data:
            contact = Contact(
                id=str(uuid.uuid4()),
                owner_id=owner_id,
                tenant_id=tenant_id,
                **contact_data.model_dump()
            )
            db.add(contact)
            contacts.append(contact)
        
        await db.commit()
        return len(contacts)
