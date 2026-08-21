from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Integer, ForeignKey
from app.models.base import Base, generate_uuid


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR")
    rotting_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)

    stages: Mapped[list["PipelineStage"]] = relationship("PipelineStage", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    pipeline_id: Mapped[str] = mapped_column(String(36), ForeignKey("pipelines.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)
    probability: Mapped[int] = mapped_column(Integer, default=0)
    is_closed_won: Mapped[bool] = mapped_column(Boolean, default=False)
    is_closed_lost: Mapped[bool] = mapped_column(Boolean, default=False)

    pipeline: Mapped["Pipeline"] = relationship("Pipeline", back_populates="stages")
