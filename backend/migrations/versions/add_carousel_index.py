"""
Migration: Add composite index on carousel_banners for homepage queries.
Improves query performance for filtering by (is_active, position) and ordering by sort_order.
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add composite index on (is_active, position, sort_order) for homepage carousel queries
    op.create_index(
        'idx_carousel_banners_homepage_query',
        'carousel_banners',
        ['is_active', 'position', 'sort_order'],
        unique=False,
        mysql_length={'is_active': 1, 'position': 50, 'sort_order': 4}
    )
    print("✅ Created composite index idx_carousel_banners_homepage_query on (is_active, position, sort_order)")

def downgrade():
    op.drop_index('idx_carousel_banners_homepage_query', table_name='carousel_banners')
    print("⬇️  Dropped composite index idx_carousel_banners_homepage_query")
