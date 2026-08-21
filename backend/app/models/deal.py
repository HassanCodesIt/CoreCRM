import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, generate_uuid


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True, index=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True, index=True)
    pipeline_id: Mapped[str] = mapped_column(String(36), ForeignKey("pipelines.id"), nullable=False, index=True)
    stage_id: Mapped[str] = mapped_column(String(36), ForeignKey("pipeline_stages.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False)
    loss_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    close_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount_final: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    is_rotting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_health_score: Mapped[int] = mapped_column(Integer, default=50)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tenant: Mapped["Tenant"] = relationship(lazy="selectin")
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="deal")
    account: Mapped["Account"] = relationship(lazy="selectin")
    owner: Mapped["User"] = relationship(lazy="selectin")
    stage: Mapped["PipelineStage"] = relationship(lazy="selectin")

