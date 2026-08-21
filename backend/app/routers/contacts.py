from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from datetime import datetime
from uuid import uuid4
from typing import Optional
import json
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_active_user, get_db
from app.core.exceptions import BadRequestError, NotFoundError, ForbiddenError
from app.models.contact import Contact
from app.models.contact_custom_field import ContactCustomField
from app.models.contact_custom_value import ContactCustomValue
from app.models.activity import Activity
from app.models.deal import Deal
from app.models.ticket import Ticket
from app.schemas.contact import (
    ContactCreate,
    ContactCustomFieldCreate,
    ContactCustomFieldRead,
    ContactCustomValuesUpsert,
    ContactCustomValueRead,
    ContactImportConfirm,
    ContactLegacyImport,
    ContactMergeRequest,
    ContactRead,
    ContactUpdate,
)
from app.services.audit_service import log_event
from app.services.contact_import_service import ContactImportService
from app.services.contact_merge_service import ContactMergeService

router = APIRouter(prefix="/contacts")


def _normalize_contact_payload(data: dict) -> dict:
    normalized = data.copy()
    title = normalized.pop("title", None)
    normalized.pop("company_name", None)
    if title and not normalized.get("job_title"):
        normalized["job_title"] = title
    if normalized.get("email") == "":
        normalized["email"] = None
    if normalized.get("tags") is not None:
        normalized["tags"] = json.dumps(normalized["tags"])
    return normalized

@router.get("/", response_model=dict)
async def list_contacts(
    skip: int = 0,
    limit: int = Query(50, le=1000),
    page: Optional[int] = None,
    status: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    if page is not None:
        skip = max(page - 1, 0) * limit
    q = q or search
    query = select(Contact).where(Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False).order_by(Contact.created_at.desc())
    if status:
        query = query.where(Contact.status == status)
    if stage:
        query = query.where(Contact.contact_stage == stage)
    if source:
        query = query.where(Contact.source.in_(source.split(",")) | Contact.lead_source.in_(source.split(",")))
    if q:
        query = query.where(
            or_(
                Contact.first_name.ilike(f"%{q}%"),
                Contact.last_name.ilike(f"%{q}%"),
                Contact.email.ilike(f"%{q}%"),
                Contact.phone.ilike(f"%{q}%"),
            )
        )
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    contacts = result.scalars().all()
    return {"items": [ContactRead.model_validate(c) for c in contacts], "total": total, "skip": skip, "limit": limit}

@router.post("/", response_model=ContactRead, status_code=201)
async def create_contact(
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    contact_data = _normalize_contact_payload(contact_in.model_dump())
    contact = Contact(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        owner_id=current_user.id,
        **contact_data
    )
    db.add(contact)
    await log_event(db, current_user.tenant_id, current_user.id, "contact", contact.id, "created", new_values=contact_in.model_dump())
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/custom-fields", response_model=list[ContactCustomFieldRead])
async def list_custom_fields(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(
        select(ContactCustomField)
        .where(ContactCustomField.tenant_id == current_user.tenant_id)
        .order_by(ContactCustomField.created_at.asc())
    )
    return result.scalars().all()


@router.post("/custom-fields", response_model=ContactCustomFieldRead, status_code=201)
async def create_custom_field(
    field_in: ContactCustomFieldCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    field = ContactCustomField(
        id=str(uuid4()),
        tenant_id=current_user.tenant_id,
        **field_in.model_dump(),
    )
    db.add(field)
    await db.commit()
    await db.refresh(field)
    return field


@router.get("/duplicates", response_model=dict)
async def detect_duplicates(
    contact_id: Optional[str] = None,
    include_fuzzy_name: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    return await ContactMergeService.detect_duplicates(
        db,
        current_user.tenant_id,
        contact_id=contact_id,
        include_fuzzy_name=include_fuzzy_name,
    )


@router.post("/merge", response_model=dict)
async def merge_contacts(
    merge_in: ContactMergeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await ContactMergeService.merge_contacts(
        db,
        current_user.tenant_id,
        merge_in.primary_id,
        merge_in.secondary_ids,
    )
    await log_event(
        db,
        current_user.tenant_id,
        current_user.id,
        "contact",
        merge_in.primary_id,
        "merged",
        new_values={"secondary_ids": merge_in.secondary_ids},
    )
    await db.commit()
    return result


@router.post("/import/upload", response_model=dict)
async def upload_contacts_csv(
    file: UploadFile = File(...),
    current_user=Depends(get_current_active_user)
):
    if not (file.filename or "").lower().endswith(".csv"):
        raise BadRequestError("Only CSV files are supported")
    return await ContactImportService.upload_csv(await file.read(), file.filename)


@router.post("/import/confirm", response_model=dict)
async def confirm_contacts_import(
    import_in: ContactImportConfirm,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    try:
        result = await ContactImportService.confirm_import(
            db,
            current_user.tenant_id,
            current_user.id,
            import_in.upload_id,
            import_in.mapping,
        )
    except FileNotFoundError:
        raise NotFoundError("Import upload not found")
    return result


@router.post("/import/", response_model=dict)
async def legacy_contacts_import(
    import_in: ContactLegacyImport,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    return await ContactImportService.import_contacts(
        db,
        current_user.tenant_id,
        current_user.id,
        import_in.contacts,
    )


@router.patch("/bulk-update/", response_model=dict)
async def bulk_update_contacts(
    bulk_in: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    ids = bulk_in.get("ids") or []
    action = bulk_in.get("action")
    value = bulk_in.get("value")
    if not ids or not action:
        raise BadRequestError("ids and action are required")

    result = await db.execute(
        select(Contact).where(
            Contact.id.in_(ids),
            Contact.tenant_id == current_user.tenant_id,
            Contact.is_deleted == False,
        )
    )
    contacts = result.scalars().all()
    for contact in contacts:
        if action == "change_status":
            contact.contact_stage = value
        elif action == "assign_owner":
            contact.owner_id = value
        elif action == "delete":
            contact.is_deleted = True
            contact.status = "deleted"
        else:
            raise BadRequestError("Unsupported bulk action")
        contact.updated_at = datetime.utcnow()
    await db.commit()
    return {"updated": len(contacts)}

@router.get("/{contact_id}", response_model=ContactRead)
async def get_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
            Contact.is_deleted == False,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    return contact

@router.patch("/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: str,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(
        select(Contact).where(
            Contact.id == contact_id,
            Contact.tenant_id == current_user.tenant_id,
            Contact.is_deleted == False,
        )
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    if contact.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to update this contact")
    update_data = _normalize_contact_payload(contact_in.model_dump(exclude_unset=True))
    old_values = {k: getattr(contact, k) for k in update_data.keys() if hasattr(contact, k)}
    for key, value in update_data.items():
        setattr(contact, key, value)
    contact.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "contact", contact.id, "updated", new_values=update_data, old_values=old_values)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.put("/{contact_id}", response_model=ContactRead)
async def replace_contact(
    contact_id: str,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    return await update_contact(contact_id, contact_in, db, current_user)

@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    if contact.owner_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise ForbiddenError("Not authorized to delete this contact")
    contact.status = "deleted"
    contact.is_deleted = True
    contact.updated_at = datetime.utcnow()
    await log_event(db, current_user.tenant_id, current_user.id, "contact", contact.id, "deleted")
    await db.commit()
    return


@router.get("/{contact_id}/custom-values", response_model=list[ContactCustomValueRead])
async def list_contact_custom_values(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    if not result.scalar_one_or_none():
        raise NotFoundError("Contact not found")
    result = await db.execute(
        select(ContactCustomValue)
        .options(selectinload(ContactCustomValue.field))
        .join(ContactCustomField, ContactCustomField.id == ContactCustomValue.field_id)
        .where(ContactCustomValue.contact_id == contact_id, ContactCustomField.tenant_id == current_user.tenant_id)
    )
    return result.scalars().all()


@router.put("/{contact_id}/custom-values", response_model=list[ContactCustomValueRead])
async def upsert_contact_custom_values(
    contact_id: str,
    values_in: ContactCustomValuesUpsert,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    if not result.scalar_one_or_none():
        raise NotFoundError("Contact not found")

    field_ids = [item.field_id for item in values_in.values]
    fields_result = await db.execute(
        select(ContactCustomField.id).where(
            ContactCustomField.id.in_(field_ids),
            ContactCustomField.tenant_id == current_user.tenant_id,
        )
    )
    allowed_field_ids = set(fields_result.scalars().all())
    if len(allowed_field_ids) != len(set(field_ids)):
        raise BadRequestError("One or more custom fields are invalid")

    existing_result = await db.execute(select(ContactCustomValue).where(ContactCustomValue.contact_id == contact_id))
    existing = {value.field_id: value for value in existing_result.scalars().all()}
    for item in values_in.values:
        if item.field_id in existing:
            existing[item.field_id].value = item.value
        else:
            db.add(ContactCustomValue(id=str(uuid4()), contact_id=contact_id, field_id=item.field_id, value=item.value))
    await db.commit()
    return await list_contact_custom_values(contact_id, db, current_user)


@router.get("/{contact_id}/timeline", response_model=list[dict])
async def get_contact_timeline(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    if not result.scalar_one_or_none():
        raise NotFoundError("Contact not found")

    timeline = []
    activities = (await db.execute(
        select(Activity).where(
            Activity.tenant_id == current_user.tenant_id,
            or_(Activity.contact_id == contact_id, (Activity.entity_type == "contact") & (Activity.entity_id == contact_id)),
        )
    )).scalars().all()
    for activity in activities:
        timeline.append({
            "type": "activity",
            "data": {
                "id": activity.id,
                "activity_type": activity.activity_type,
                "subject": activity.subject,
                "body": activity.body,
                "is_completed": activity.is_completed,
            },
            "timestamp": (activity.completed_at or activity.created_at).isoformat(),
        })

    deals = (await db.execute(select(Deal).where(Deal.tenant_id == current_user.tenant_id, Deal.contact_id == contact_id))).scalars().all()
    for deal in deals:
        timeline.append({
            "type": "deal",
            "data": {"id": deal.id, "title": deal.title, "status": deal.status, "value": float(deal.value or 0)},
            "timestamp": deal.created_at.isoformat(),
        })

    tickets = (await db.execute(select(Ticket).where(Ticket.tenant_id == current_user.tenant_id, Ticket.contact_id == contact_id))).scalars().all()
    for ticket in tickets:
        timeline.append({
            "type": "ticket",
            "data": {"id": ticket.id, "subject": ticket.subject, "status": ticket.status, "priority": ticket.priority},
            "timestamp": ticket.created_at.isoformat(),
        })

    return sorted(timeline, key=lambda item: item["timestamp"], reverse=True)

@router.get("/{contact_id}/activities", response_model=dict)
async def list_contact_activities(
    contact_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    query = select(Activity).where(
        Activity.entity_type == "contact",
        Activity.entity_id == contact_id,
        Activity.tenant_id == current_user.tenant_id
    ).order_by(Activity.created_at.desc())
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()
    from app.schemas.activity import ActivityRead
    return {"items": [ActivityRead.model_validate(a) for a in activities], "total": total, "skip": skip, "limit": limit}

@router.get("/{contact_id}/deals", response_model=dict)
async def list_contact_deals(
    contact_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    query = select(Deal).where(Deal.contact_id == contact_id, Deal.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    deals = result.scalars().all()
    from app.schemas.deal import DealRead
    return {"items": [DealRead.model_validate(d) for d in deals], "total": total, "skip": skip, "limit": limit}

@router.get("/{contact_id}/tickets", response_model=dict)
async def list_contact_tickets(
    contact_id: str,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    query = select(Ticket).where(Ticket.contact_id == contact_id, Ticket.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    tickets = result.scalars().all()
    from app.schemas.ticket import TicketRead
    return {"items": [TicketRead.model_validate(t) for t in tickets], "total": total, "skip": skip, "limit": limit}

from app.models.note import Note
from app.schemas.note import NoteCreate, NoteResponse

@router.get("/{contact_id}/notes", response_model=dict)
@router.get("/{contact_id}/notes/", response_model=dict)
async def list_contact_notes(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    notes_result = await db.execute(
        select(Note)
        .where(Note.contact_id == contact_id)
        .order_by(Note.created_at.desc())
    )
    notes = notes_result.scalars().all()
    return {"items": [NoteResponse.model_validate(n) for n in notes]}

@router.post("/{contact_id}/notes", response_model=NoteResponse, status_code=201)
@router.post("/{contact_id}/notes/", response_model=NoteResponse, status_code=201)
async def create_contact_note(
    contact_id: str,
    note_in: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    result = await db.execute(select(Contact).where(Contact.id == contact_id, Contact.tenant_id == current_user.tenant_id, Contact.is_deleted == False))
    contact = result.scalar_one_or_none()
    if not contact:
        raise NotFoundError("Contact not found")
    note = Note(
        id=str(uuid4()),
        content=note_in.content,
        is_pinned=note_in.is_pinned,
        contact_id=contact_id,
        created_by=current_user.id
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note
