import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, DateTime, Date, Numeric, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="email")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    budget: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
