from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import uuid4
from datetime import datetime

from app.core.dependencies import get_current_active_user, get_db, require_manager
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.email_role_mapping import EmailRoleMapping
from app.schemas.email_role_mapping import EmailRoleMappingCreate, EmailRoleMappingRead

router = APIRouter(prefix="/email-role-mappings")

@router.get("/", response_model=dict)
@router.get("", response_model=dict)
async def list_mappings(
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    query = select(EmailRoleMapping).where(EmailRoleMapping.tenant_id == current_user.tenant_id)
    count_query = select(func.count()).select_from(query.alias())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    mappings = result.scalars().all()
    return {
        "items": [EmailRoleMappingRead.model_validate(m) for m in mappings],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=EmailRoleMappingRead, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=EmailRoleMappingRead, status_code=status.HTTP_201_CREATED)
async def create_mapping(
    mapping_in: EmailRoleMappingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    # Check if a mapping for this email already exists
    existing = await db.execute(
        select(EmailRoleMapping).where(func.lower(EmailRoleMapping.email) == func.lower(mapping_in.email))
    )
    if existing.scalar_one_or_none() is not None:
        raise BadRequestError("A role mapping for this email already exists")

    mapping = EmailRoleMapping(
        id=str(uuid4()),
        email=mapping_in.email,
        role=mapping_in.role,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id
    )
    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)
    return mapping

@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{mapping_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_manager)
):
    result = await db.execute(
        select(EmailRoleMapping).where(
            EmailRoleMapping.id == mapping_id,
            EmailRoleMapping.tenant_id == current_user.tenant_id
        )
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise NotFoundError("Mapping not found")
    
    await db.delete(mapping)
    await db.commit()
    return
