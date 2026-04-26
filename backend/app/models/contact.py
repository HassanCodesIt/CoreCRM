import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    account_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("accounts.id"), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    lead_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contact_stage: Mapped[str] = mapped_column(String(20), default="lead", nullable=False)
    source: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="contact")
    account: Mapped["Account"] = relationship(lazy="selectin")
    owner: Mapped["User"] = relationship(lazy="selectin")
