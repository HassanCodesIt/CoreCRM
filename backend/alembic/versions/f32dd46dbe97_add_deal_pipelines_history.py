"""add_deal_pipelines_history

Revision ID: f32dd46dbe97
Revises: p0_5_contact_custom_fields
Create Date: 2026-05-05 17:49:36.437761

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f32dd46dbe97'
down_revision: Union[str, None] = 'p0_5_contact_custom_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table, column):
    conn = op.get_bind()
    result = conn.execute(sa.text(f"PRAGMA table_info({table})"))
    return any(row[1] == column for row in result)


def _table_exists(table):
    conn = op.get_bind()
    result = conn.execute(sa.text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'"))
    return result.fetchone() is not None


def upgrade() -> None:
    if not _column_exists('deals', 'closed_at'):
        op.add_column('deals', sa.Column('closed_at', sa.DateTime(), nullable=True))
    if not _column_exists('deals', 'close_reason'):
        op.add_column('deals', sa.Column('close_reason', sa.Text(), nullable=True))
    if not _column_exists('deals', 'amount_final'):
        op.add_column('deals', sa.Column('amount_final', sa.Numeric(precision=15, scale=2), nullable=True))
    if not _column_exists('deals', 'is_rotting'):
        op.add_column('deals', sa.Column('is_rotting', sa.Boolean(), nullable=False, server_default=sa.text('0')))
    if not _column_exists('pipelines', 'rotting_days'):
        op.add_column('pipelines', sa.Column('rotting_days', sa.Integer(), nullable=False, server_default='14'))
    if not _table_exists('deal_stage_history'):
        op.create_table('deal_stage_history',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('tenant_id', sa.String(length=36), nullable=False),
            sa.Column('deal_id', sa.String(length=36), nullable=False),
            sa.Column('pipeline_id', sa.String(length=36), nullable=False),
            sa.Column('from_stage_id', sa.String(length=36), nullable=True),
            sa.Column('to_stage_id', sa.String(length=36), nullable=False),
            sa.Column('changed_by', sa.String(length=36), nullable=True),
            sa.Column('changed_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
            sa.ForeignKeyConstraint(['deal_id'], ['deals.id'], ),
            sa.ForeignKeyConstraint(['from_stage_id'], ['pipeline_stages.id'], ),
            sa.ForeignKeyConstraint(['pipeline_id'], ['pipelines.id'], ),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.ForeignKeyConstraint(['to_stage_id'], ['pipeline_stages.id'], ),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    op.drop_table('deal_stage_history')
    op.drop_column('pipelines', 'rotting_days')
    op.drop_column('deals', 'is_rotting')
    op.drop_column('deals', 'amount_final')
    op.drop_column('deals', 'close_reason')
    op.drop_column('deals', 'closed_at')
