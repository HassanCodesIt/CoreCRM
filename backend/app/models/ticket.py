import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)
    category: Mapped[str] = mapped_column(String(30), default="general", nullable=False)
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
