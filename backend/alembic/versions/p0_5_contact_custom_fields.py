"""p0_5_contact_custom_fields

Revision ID: p0_5_contact_custom_fields
Revises: 93605c4fecaf, add_revoked_at
Create Date: 2026-05-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "p0_5_contact_custom_fields"
down_revision: Union[str, tuple[str, str], None] = ("93605c4fecaf", "add_revoked_at")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_custom_fields",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contact_custom_fields_tenant_id"), "contact_custom_fields", ["tenant_id"])

    op.create_table(
        "contact_custom_values",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("contact_id", sa.String(length=36), nullable=False),
        sa.Column("field_id", sa.String(length=36), nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
        sa.ForeignKeyConstraint(["field_id"], ["contact_custom_fields.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("contact_id", "field_id", name="uq_contact_custom_values_contact_field"),
    )
    op.create_index(op.f("ix_contact_custom_values_contact_id"), "contact_custom_values", ["contact_id"])
    op.create_index(op.f("ix_contact_custom_values_field_id"), "contact_custom_values", ["field_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_contact_custom_values_field_id"), table_name="contact_custom_values")
    op.drop_index(op.f("ix_contact_custom_values_contact_id"), table_name="contact_custom_values")
    op.drop_table("contact_custom_values")
    op.drop_index(op.f("ix_contact_custom_fields_tenant_id"), table_name="contact_custom_fields")
    op.drop_table("contact_custom_fields")
