"""merge multiple heads

Revision ID: 02ebd12fb586
Revises: c3f9b1d4e2a3, fix_order_status_enum
Create Date: 2025-11-24 14:19:39.089764

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '02ebd12fb586'
down_revision = ('c3f9b1d4e2a3', 'fix_order_status_enum')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
