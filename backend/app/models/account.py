import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    annual_revenue: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    employee_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    account_type: Mapped[str] = mapped_column(String(20), default="prospect", nullable=False)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    parent_account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
