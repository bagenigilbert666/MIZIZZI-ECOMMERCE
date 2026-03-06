#!/bin/bash
# Deployment startup script for Render
# This script runs before the app starts to initialize database indexes

set -e

echo "=========================================="
echo "MIZIZZI E-COMMERCE DEPLOYMENT SETUP"
echo "=========================================="

# Run database migrations
echo "[1/2] Running database migrations..."
python -m flask db upgrade || echo "No migrations to run or Flask context issue"

# Initialize database indexes for optimized performance
echo "[2/2] Initializing database indexes for products and featured sections..."
python -c "
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError, OperationalError

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print('ERROR: DATABASE_URL not set')
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check if products table exists
        result = conn.execute(text('''
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'products'
            )
        '''))
        
        if not result.scalar():
            print('WARNING: products table does not exist yet')
            sys.exit(0)
        
        # List of indexes to create
        indexes = [
            ('idx_products_category_active_visible', 'CREATE INDEX IF NOT EXISTS idx_products_category_active_visible ON products(category_id, is_active, is_visible)'),
            ('idx_products_brand_price_discount', 'CREATE INDEX IF NOT EXISTS idx_products_brand_price_discount ON products(brand_id, price, discount_percentage DESC NULLS LAST)'),
            ('idx_products_active_visible_created', 'CREATE INDEX IF NOT EXISTS idx_products_active_visible_created ON products(is_active, is_visible, created_at DESC)'),
            ('idx_products_category_price_range', 'CREATE INDEX IF NOT EXISTS idx_products_category_price_range ON products(category_id, price ASC) WHERE is_active = true AND is_visible = true'),
            ('idx_products_trending', 'CREATE INDEX IF NOT EXISTS idx_products_trending ON products(is_trending, sort_order ASC) WHERE is_active = true AND is_visible = true'),
            ('idx_products_flash_sale', 'CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON products(is_flash_sale, discount_percentage DESC NULLS LAST) WHERE is_active = true'),
            ('idx_products_new_arrivals', 'CREATE INDEX IF NOT EXISTS idx_products_new_arrivals ON products(is_new_arrival, created_at DESC) WHERE is_active = true AND is_visible = true'),
            ('idx_products_top_pick', 'CREATE INDEX IF NOT EXISTS idx_products_top_pick ON products(is_top_pick, sort_order ASC) WHERE is_active = true AND is_visible = true'),
            ('idx_products_daily_find', 'CREATE INDEX IF NOT EXISTS idx_products_daily_find ON products(is_daily_find, created_at DESC) WHERE is_active = true'),
            ('idx_products_luxury_deal', 'CREATE INDEX IF NOT EXISTS idx_products_luxury_deal ON products(is_luxury_deal, discount_percentage DESC) WHERE is_active = true AND is_visible = true'),
            ('idx_products_featured_category', 'CREATE INDEX IF NOT EXISTS idx_products_featured_category ON products(is_featured, category_id) WHERE is_active = true AND is_visible = true'),
            ('idx_products_slug', 'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE is_active = true'),
            ('idx_product_images_product_id', 'CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)'),
            ('idx_product_images_primary', 'CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true'),
            ('idx_product_reviews_product_id', 'CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON reviews(product_id, rating DESC)'),
        ]
        
        print('Creating database indexes...')
        created = 0
        for index_name, sql in indexes:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f'  ✓ {index_name}')
                created += 1
            except ProgrammingError as e:
                if 'already exists' in str(e).lower():
                    print(f'  ~ {index_name} (already exists)')
                else:
                    print(f'  ✗ {index_name}: {e}')
            except Exception as e:
                print(f'  ✗ {index_name}: {e}')
        
        # Update table statistics
        try:
            conn.execute(text('ANALYZE products'))
            conn.commit()
            print('  ✓ Updated table statistics')
        except Exception as e:
            print(f'  ✗ ANALYZE failed: {e}')
        
        print(f'\nIndexes created: {created}')
        
except OperationalError as e:
    print(f'ERROR: Could not connect to database: {e}')
    sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
"

echo ""
echo "=========================================="
echo "Setup complete! Starting application..."
echo "=========================================="
