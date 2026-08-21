import json
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder
from ..models.audit_event import AuditEvent

async def log_event(
    db: AsyncSession,
    tenant_id: str,
    user_id: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    new_values: dict | None = None,
    old_values: dict | None = None,
) -> None:
    event = AuditEvent(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        new_values=json.dumps(jsonable_encoder(new_values)) if new_values else None,
        old_values=json.dumps(jsonable_encoder(old_values)) if old_values else None,
    )
    db.add(event)
