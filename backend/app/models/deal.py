import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    stage: Mapped[str] = mapped_column(String(30), default="prospecting", nullable=False, index=True)
    close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    probability: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    pipeline_id: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    lost_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="deal")

    # Relationships
    account: Mapped["Account"] = relationship(lazy="selectin")
    owner: Mapped["User"] = relationship(lazy="selectin")
