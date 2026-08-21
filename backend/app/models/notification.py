import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
import enum

class NotificationType(str, enum.Enum):
    LEAD_ASSIGNED = "lead_assigned"
    STATUS_CHANGED = "status_changed"
    DEAL_UPDATED = "deal_updated"
    TICKET_ASSIGNED = "ticket_assigned"

class ReferenceType(str, enum.Enum):
    CONTACT = "contact"
    DEAL = "deal"
    TICKET = "ticket"

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(String(50), nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    reference_type: Mapped[ReferenceType | None] = mapped_column(String(50), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

