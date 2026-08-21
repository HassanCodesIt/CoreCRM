from difflib import SequenceMatcher
from typing import Iterable

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.contact_custom_value import ContactCustomValue
from app.models.deal import Deal
from app.models.ticket import Ticket


class ContactMergeService:
    @staticmethod
    def _full_name(contact: Contact) -> str:
        return f"{contact.first_name or ''} {contact.last_name or ''}".strip().lower()

    @staticmethod
    def _is_fuzzy_name_match(left: Contact, right: Contact, threshold: float = 0.86) -> bool:
        left_name = ContactMergeService._full_name(left)
        right_name = ContactMergeService._full_name(right)
        if not left_name or not right_name:
            return False
        return SequenceMatcher(None, left_name, right_name).ratio() >= threshold

    @staticmethod
    async def detect_duplicates(
        db: AsyncSession,
        tenant_id: str,
        contact_id: str | None = None,
        include_fuzzy_name: bool = True,
    ) -> dict[str, list[str]]:
        if contact_id:
            result = await db.execute(
                select(Contact).where(
                    Contact.id == contact_id,
                    Contact.tenant_id == tenant_id,
                    Contact.is_deleted == False,
                )
            )
            contact = result.scalar_one_or_none()
            if not contact:
                raise NotFoundError("Contact not found")

            conditions = []
            if contact.email:
                conditions.append(Contact.email == contact.email)
            if contact.phone:
                conditions.append(Contact.phone == contact.phone)
            if not conditions and not include_fuzzy_name:
                return {"duplicates": []}

            query = select(Contact).where(
                Contact.tenant_id == tenant_id,
                Contact.id != contact.id,
                Contact.is_deleted == False,
            )
            if conditions:
                query = query.where(or_(*conditions))

            result = await db.execute(query)
            matches = list(result.scalars().all())

            if include_fuzzy_name:
                fuzzy_result = await db.execute(
                    select(Contact).where(
                        Contact.tenant_id == tenant_id,
                        Contact.id != contact.id,
                        Contact.is_deleted == False,
                    )
                )
                for candidate in fuzzy_result.scalars().all():
                    if candidate not in matches and ContactMergeService._is_fuzzy_name_match(contact, candidate):
                        matches.append(candidate)

            return {"duplicates": [match.id for match in matches]}

        result = await db.execute(
            select(Contact).where(Contact.tenant_id == tenant_id, Contact.is_deleted == False)
        )
        contacts = result.scalars().all()
        duplicates: set[str] = set()
        for index, contact in enumerate(contacts):
            for candidate in contacts[index + 1:]:
                same_email = bool(contact.email and candidate.email and contact.email == candidate.email)
                same_phone = bool(contact.phone and candidate.phone and contact.phone == candidate.phone)
                fuzzy_name = include_fuzzy_name and ContactMergeService._is_fuzzy_name_match(contact, candidate)
                if same_email or same_phone or fuzzy_name:
                    duplicates.update({contact.id, candidate.id})
        return {"duplicates": sorted(duplicates)}

    @staticmethod
    async def merge_contacts(
        db: AsyncSession,
        tenant_id: str,
        primary_id: str,
        secondary_ids: Iterable[str],
    ) -> dict[str, object]:
        secondary_ids = list(dict.fromkeys(secondary_ids))
        if primary_id in secondary_ids:
            raise BadRequestError("Primary contact cannot also be a secondary contact")
        if not secondary_ids:
            raise BadRequestError("At least one secondary contact is required")

        result = await db.execute(
            select(Contact).where(
                Contact.id.in_([primary_id, *secondary_ids]),
                Contact.tenant_id == tenant_id,
                Contact.is_deleted == False,
            )
        )
        contacts = {contact.id: contact for contact in result.scalars().all()}
        primary = contacts.get(primary_id)
        if not primary:
            raise NotFoundError("Primary contact not found")
        missing = [contact_id for contact_id in secondary_ids if contact_id not in contacts]
        if missing:
            raise NotFoundError("One or more secondary contacts were not found")

        for model in (Deal, Ticket):
            result = await db.execute(
                select(model).where(model.tenant_id == tenant_id, model.contact_id.in_(secondary_ids))
            )
            for record in result.scalars().all():
                record.contact_id = primary_id

        result = await db.execute(
            select(Activity).where(
                Activity.tenant_id == tenant_id,
                or_(Activity.contact_id.in_(secondary_ids), Activity.entity_id.in_(secondary_ids)),
            )
        )
        for activity in result.scalars().all():
            if activity.contact_id in secondary_ids:
                activity.contact_id = primary_id
            if activity.entity_type == "contact" and activity.entity_id in secondary_ids:
                activity.entity_id = primary_id

        primary_values_result = await db.execute(
            select(ContactCustomValue).where(ContactCustomValue.contact_id == primary_id)
        )
        primary_field_ids = {value.field_id for value in primary_values_result.scalars().all()}
        secondary_values_result = await db.execute(
            select(ContactCustomValue).where(ContactCustomValue.contact_id.in_(secondary_ids))
        )
        for custom_value in secondary_values_result.scalars().all():
            if custom_value.field_id in primary_field_ids:
                await db.delete(custom_value)
            else:
                custom_value.contact_id = primary_id
                primary_field_ids.add(custom_value.field_id)

        for secondary_id in secondary_ids:
            secondary = contacts[secondary_id]
            secondary.is_deleted = True
            secondary.status = "deleted"

        await db.commit()
        return {"primary_id": primary.id, "merged_ids": secondary_ids}
