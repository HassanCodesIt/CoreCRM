"""add_revoked_at_to_refresh_tokens

Revision ID: add_revoked_at
Revises: 343473d206b0
Create Date: 2026-05-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_revoked_at'
down_revision: Union[str, None] = '343473d206b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('refresh_tokens', sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('refresh_tokens', 'revoked_at')
