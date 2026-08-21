import csv
import json
from io import StringIO
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact


IMPORT_DIR = Path("uploads/contact_imports")


class ContactImportService:
    CONTACT_FIELDS = {
        "first_name",
        "last_name",
        "email",
        "phone",
        "mobile",
        "job_title",
        "department",
        "contact_stage",
        "source",
        "lead_source",
        "status",
        "city",
        "country",
        "linkedin_url",
        "notes",
    }

    @staticmethod
    def _parse_csv(text: str) -> tuple[list[str], list[dict[str, str]]]:
        reader = csv.DictReader(StringIO(text))
        headers = reader.fieldnames or []
        rows = [{key: (value or "").strip() for key, value in row.items()} for row in reader]
        return headers, rows

    @staticmethod
    def _guess_mapping(headers: list[str]) -> dict[str, str]:
        normalized = {header.lower().replace(" ", "_").replace("-", "_"): header for header in headers}
        mapping: dict[str, str] = {}
        aliases = {
            "first_name": ["first_name", "firstname", "first"],
            "last_name": ["last_name", "lastname", "last"],
            "email": ["email", "email_address"],
            "phone": ["phone", "phone_number", "work_phone"],
            "job_title": ["job_title", "title", "role"],
            "lead_source": ["lead_source", "source"],
            "contact_stage": ["contact_stage", "stage", "status"],
        }
        for field, candidates in aliases.items():
            for candidate in candidates:
                if candidate in normalized:
                    mapping[field] = normalized[candidate]
                    break
        return mapping

    @staticmethod
    async def upload_csv(contents: bytes, filename: str) -> dict[str, object]:
        text = contents.decode("utf-8-sig")
        headers, rows = ContactImportService._parse_csv(text)
        upload_id = str(uuid4())
        IMPORT_DIR.mkdir(parents=True, exist_ok=True)
        (IMPORT_DIR / f"{upload_id}.json").write_text(
            json.dumps({"filename": filename, "headers": headers, "rows": rows}),
            encoding="utf-8",
        )
        return {
            "upload_id": upload_id,
            "headers": headers,
            "mapping": ContactImportService._guess_mapping(headers),
            "preview": rows[:5],
            "total": len(rows),
        }

    @staticmethod
    def _load_upload(upload_id: str) -> dict[str, object]:
        path = IMPORT_DIR / f"{upload_id}.json"
        if not path.exists():
            raise FileNotFoundError(upload_id)
        return json.loads(path.read_text(encoding="utf-8"))

    @staticmethod
    def _normalize_contact_data(row: dict[str, str], mapping: dict[str, str]) -> dict[str, object]:
        data: dict[str, object] = {}
        for contact_field, csv_header in mapping.items():
            if contact_field not in ContactImportService.CONTACT_FIELDS or not csv_header:
                continue
            value = row.get(csv_header, "").strip()
            if value:
                data[contact_field] = value
        if "contact_stage" not in data:
            data["contact_stage"] = "lead"
        if "status" not in data:
            data["status"] = "active"
        if "email" in data and data["email"] == "":
            data["email"] = None
        return data

    @staticmethod
    async def confirm_import(
        db: AsyncSession,
        tenant_id: str,
        owner_id: str,
        upload_id: str,
        mapping: dict[str, str],
    ) -> dict[str, object]:
        payload = ContactImportService._load_upload(upload_id)
        rows = payload["rows"]
        created = 0
        skipped: list[dict[str, object]] = []

        for index, row in enumerate(rows, start=2):
            data = ContactImportService._normalize_contact_data(row, mapping)
            if not data.get("first_name") or not data.get("last_name"):
                skipped.append({"row": index, "reason": "first_name and last_name are required"})
                continue

            email = data.get("email")
            if email:
                existing = await db.execute(
                    select(Contact.id).where(
                        Contact.tenant_id == tenant_id,
                        Contact.email == email,
                        Contact.is_deleted == False,
                    )
                )
                if existing.scalar_one_or_none():
                    skipped.append({"row": index, "reason": "email already exists"})
                    continue

            db.add(Contact(id=str(uuid4()), tenant_id=tenant_id, owner_id=owner_id, **data))
            created += 1

        await db.commit()
        return {"created": created, "skipped": skipped, "total": len(rows)}

    @staticmethod
    async def import_contacts(
        db: AsyncSession,
        tenant_id: str,
        owner_id: str,
        contacts: list[dict[str, object]],
    ) -> dict[str, object]:
        created = 0
        skipped: list[dict[str, object]] = []
        for index, raw in enumerate(contacts, start=1):
            data = {
                key: value
                for key, value in raw.items()
                if key in ContactImportService.CONTACT_FIELDS and value not in ("", None)
            }
            if "title" in raw and raw["title"] and "job_title" not in data:
                data["job_title"] = raw["title"]
            data.setdefault("contact_stage", "lead")
            data.setdefault("status", "active")
            if not data.get("first_name") or not data.get("last_name"):
                skipped.append({"row": index, "reason": "first_name and last_name are required"})
                continue
            email = data.get("email")
            if email:
                existing = await db.execute(
                    select(Contact.id).where(
                        Contact.tenant_id == tenant_id,
                        Contact.email == email,
                        Contact.is_deleted == False,
                    )
                )
                if existing.scalar_one_or_none():
                    skipped.append({"row": index, "reason": "email already exists"})
                    continue
            db.add(Contact(id=str(uuid4()), tenant_id=tenant_id, owner_id=owner_id, **data))
            created += 1
        await db.commit()
        return {"created": created, "skipped": skipped, "total": len(contacts)}
