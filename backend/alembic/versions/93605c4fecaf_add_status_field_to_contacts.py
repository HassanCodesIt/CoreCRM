"""Add status field to contacts

Revision ID: 93605c4fecaf
Revises: 343473d206b0
Create Date: 2026-04-29 20:50:42.986390

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93605c4fecaf'
down_revision: Union[str, None] = '343473d206b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add status column with server_default for SQLite compatibility
    op.add_column('contacts', sa.Column('status', sa.String(length=50), server_default='active', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contacts', 'status')
