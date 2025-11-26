"""Fix order status enum

Revision ID: fix_order_status_enum
Revises: YOUR_PREVIOUS_REVISION_ID  # Replace this with your actual previous revision ID
Create Date: 2025-11-06 05:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_order_status_enum'
down_revision = None  # Replace with previous revision id when adding to your migrations
branch_labels = None
depends_on = None

def upgrade():
    # Change status column
    op.alter_column('orders', 'status',
        type_=sa.String(20),
        nullable=False,
        postgresql_using="status::text")

    # Change payment_status column
    op.alter_column('orders', 'payment_status',
        type_=sa.String(20),
        nullable=False,
        postgresql_using="payment_status::text")

def downgrade():
    # Convert back to ENUM type
    op.execute('CREATE TYPE orderstatus AS ENUM ' +
        "('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned')")
    op.execute('CREATE TYPE paymentstatus AS ENUM ' +
        "('pending', 'paid', 'completed', 'failed', 'refunded')")

    # Change status column
    op.alter_column('orders', 'status',
        type_=postgresql.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned', name='orderstatus'),
        nullable=False,
        postgresql_using="status::orderstatus")

    # Change payment_status column
    op.alter_column('orders', 'payment_status',
        type_=postgresql.ENUM('pending', 'paid', 'completed', 'failed', 'refunded', name='paymentstatus'),
        nullable=False,
        postgresql_using="payment_status::paymentstatus")