from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, generate_uuid


class DealStageHistory(Base):
    __tablename__ = "deal_stage_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), nullable=False, index=True)
    pipeline_id: Mapped[str] = mapped_column(String(36), ForeignKey("pipelines.id"), nullable=False, index=True)
    from_stage_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("pipeline_stages.id"), nullable=True, index=True)
    to_stage_id: Mapped[str] = mapped_column(String(36), ForeignKey("pipeline_stages.id"), nullable=False, index=True)
    changed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    deal: Mapped["Deal"] = relationship("Deal", lazy="selectin")
    pipeline: Mapped["Pipeline"] = relationship("Pipeline", lazy="selectin")
