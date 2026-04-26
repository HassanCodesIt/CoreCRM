import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    activity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(500), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True)
    lead_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("leads.id"), nullable=True)
    deal_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("deals.id"), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    ticket_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tickets.id"), nullable=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lead: Mapped["Lead"] = relationship(lazy="selectin", back_populates="activities")
