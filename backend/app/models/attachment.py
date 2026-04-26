import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    contact_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=True)
    deal_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("deals.id"), nullable=True)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    owner: Mapped["User"] = relationship("User")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="attachments")
    deal: Mapped["Deal"] = relationship("Deal", back_populates="attachments")
