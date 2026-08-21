from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, generate_uuid


class ContactCustomValue(Base):
    __tablename__ = "contact_custom_values"
    __table_args__ = (
        UniqueConstraint("contact_id", "field_id", name="uq_contact_custom_values_contact_field"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    contact_id: Mapped[str] = mapped_column(String(36), ForeignKey("contacts.id"), nullable=False, index=True)
    field_id: Mapped[str] = mapped_column(String(36), ForeignKey("contact_custom_fields.id"), nullable=False, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)

    contact: Mapped["Contact"] = relationship(lazy="selectin")
    field: Mapped["ContactCustomField"] = relationship("ContactCustomField", back_populates="values", lazy="selectin")
