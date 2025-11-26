"""add carousel columns to theme_settings

Revision ID: c3f9b1d4e2a3
Revises: 6078b820d67e
Create Date: 2025-11-10 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c3f9b1d4e2a3'
down_revision = '6078b820d67e'
branch_labels = None
depends_on = None


def upgrade():
    # Add carousel-related columns with safe server defaults so existing rows get populated
    with op.batch_alter_table('theme_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('carousel_background', sa.String(length=7), nullable=False, server_default='#7C2D12'))
        batch_op.add_column(sa.Column('carousel_overlay_dark', sa.String(length=50), nullable=False, server_default='rgba(0, 0, 0, 0.7)'))
        batch_op.add_column(sa.Column('carousel_overlay_light', sa.String(length=50), nullable=False, server_default='rgba(0, 0, 0, 0.4)'))
        batch_op.add_column(sa.Column('carousel_badge_bg', sa.String(length=7), nullable=False, server_default='#DC2626'))
        batch_op.add_column(sa.Column('carousel_badge_text', sa.String(length=7), nullable=False, server_default='#FFFFFF'))


def downgrade():
    with op.batch_alter_table('theme_settings', schema=None) as batch_op:
        batch_op.drop_column('carousel_badge_text')
        batch_op.drop_column('carousel_badge_bg')
        batch_op.drop_column('carousel_overlay_light')
        batch_op.drop_column('carousel_overlay_dark')
        batch_op.drop_column('carousel_background')
