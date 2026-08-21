from pydantic import BaseModel, EmailStr
from typing import Optional
from .user import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead

    model_config = {"from_attributes": True}


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str       # user_id
    tenant_id: str
    role: str
    exp: int


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# resolve forward ref at bottom of file:
from .user import UserRead
TokenResponse.model_rebuild()
