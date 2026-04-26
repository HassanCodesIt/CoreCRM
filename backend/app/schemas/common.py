from pydantic import BaseModel
from typing import Optional, List, Generic, TypeVar
from datetime import datetime


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    page: int
    limit: int


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
