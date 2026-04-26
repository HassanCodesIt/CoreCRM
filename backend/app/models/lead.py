import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    job_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new", nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    source_detail: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    campaign_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("campaigns.id"), nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_qualification: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_insights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_next_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    activities: Mapped[list["Activity"]] = relationship("Activity", back_populates="lead", foreign_keys="Activity.lead_id")
    score_events: Mapped[list["LeadScoreEvent"]] = relationship("LeadScoreEvent", back_populates="lead")
    owner: Mapped["User"] = relationship(lazy="selectin")
    campaign: Mapped["Campaign"] = relationship(lazy="selectin")


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id"), nullable=False)
    activity_type: Mapped[str] = mapped_column(String(30), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    lead: Mapped["Lead"] = relationship(lazy="selectin")
    creator: Mapped["User"] = relationship(lazy="selectin")


class LeadScoreEvent(Base):
    __tablename__ = "lead_score_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id: Mapped[str] = mapped_column(String(36), ForeignKey("leads.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    score_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    lead: Mapped["Lead"] = relationship(lazy="selectin")
