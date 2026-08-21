from pydantic import BaseModel, EmailStr
from datetime import datetime

class EmailRoleMappingBase(BaseModel):
    email: EmailStr
    role: str

class EmailRoleMappingCreate(EmailRoleMappingBase):
    pass

class EmailRoleMappingRead(EmailRoleMappingBase):
    id: str
    tenant_id: str
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
