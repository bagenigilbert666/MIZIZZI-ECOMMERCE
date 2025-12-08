"""
Database Index Migration Script for Mizizzi E-commerce
Run this script AFTER your Flask app has created the tables.

Usage:
    python scripts/run_indexes.py

Or run from Flask shell:
    flask shell
    >>> exec(open('scripts/run_indexes.py').read())
"""
import os
import sys
from urllib.parse import urlparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError, OperationalError

# Get database URL from environment or use default
DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://neondb_owner:npg_0gMwASZYo9pJ@ep-shiny-term-adlossxs-pooler.c-2.us-east-1.aws.neon.tech/mizizzi_project?sslmode=require'
)

# New/changed: read schema from env and use schema-qualified table names
PGSCHEMA = os.environ.get("PGSCHEMA", "public")


def qualified_table_name(table_name: str) -> str:
    """
    Return schema-qualified table name. Uses double quotes to be safe with mixed-case identifiers.
    Examples:
      public.products -> "public"."products"
    """
    return f'"{PGSCHEMA}"."{table_name}"'


# List of indexes to create
INDEXES = [
    # Basic column indexes
    ("idx_products_category_id", "CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)"),
    ("idx_products_brand_id", "CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id)"),
    ("idx_products_price", "CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)"),
    ("idx_products_discount", "CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percentage DESC NULLS LAST)"),
    ("idx_products_created_at", "CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)"),
    ("idx_products_is_active", "CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)"),
    ("idx_products_is_visible", "CREATE INDEX IF NOT EXISTS idx_products_is_visible ON products(is_visible)"),
    ("idx_products_slug", "CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)"),
    ("idx_products_sort_order", "CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order)"),

    # Partial indexes for boolean flags (PostgreSQL specific)
    ("idx_products_is_featured", "CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(id) WHERE is_featured = true"),
    ("idx_products_is_new", "CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(id) WHERE is_new = true"),
    ("idx_products_is_sale", "CREATE INDEX IF NOT EXISTS idx_products_is_sale ON products(id) WHERE is_sale = true"),
    ("idx_products_is_flash_sale", "CREATE INDEX IF NOT EXISTS idx_products_is_flash_sale ON products(id) WHERE is_flash_sale = true"),
    ("idx_products_is_luxury_deal", "CREATE INDEX IF NOT EXISTS idx_products_is_luxury_deal ON products(id) WHERE is_luxury_deal = true"),
    ("idx_products_is_trending", "CREATE INDEX IF NOT EXISTS idx_products_is_trending ON products(id) WHERE is_trending = true"),
    ("idx_products_is_top_pick", "CREATE INDEX IF NOT EXISTS idx_products_is_top_pick ON products(id) WHERE is_top_pick = true"),
    ("idx_products_is_daily_find", "CREATE INDEX IF NOT EXISTS idx_products_is_daily_find ON products(id) WHERE is_daily_find = true"),
    ("idx_products_is_new_arrival", "CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON products(id) WHERE is_new_arrival = true"),

    # Composite indexes for common queries
    ("idx_products_active_visible", "CREATE INDEX IF NOT EXISTS idx_products_active_visible ON products(is_active, is_visible)"),
    ("idx_products_flash_sale_discount", "CREATE INDEX IF NOT EXISTS idx_products_flash_sale_discount ON products(is_flash_sale, discount_percentage DESC NULLS LAST) WHERE is_active = true AND is_visible = true"),
    ("idx_products_luxury_created", "CREATE INDEX IF NOT EXISTS idx_products_luxury_created ON products(is_luxury_deal, created_at DESC) WHERE is_active = true AND is_visible = true"),

    # Product images indexes
    ("idx_product_images_product_id", "CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id)"),
    ("idx_product_images_is_primary", "CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(product_id, is_primary DESC)"),
]


def run_indexes():
    """Create all indexes on the database."""
    print(f"Connecting to database...")
    print(f"Database: {DATABASE_URL[:50]}...")

    try:
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            # First check if products table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'products'
                )
            """))
            table_exists = result.scalar()

            if not table_exists:
                print("ERROR: 'products' table does not exist!")
                print("Please run your Flask app first to create the database tables.")
                print("Example: flask db upgrade")
                return False

            print("Found 'products' table. Creating indexes...\n")

            created = 0
            skipped = 0
            errors = 0

            for index_name, sql in INDEXES:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"  ✓ {index_name}")
                    created += 1
                except ProgrammingError as e:
                    if "already exists" in str(e).lower():
                        print(f"  - {index_name} (already exists)")
                        skipped += 1
                    else:
                        print(f"  ✗ {index_name}: {e}")
                        errors += 1
                except Exception as e:
                    print(f"  ✗ {index_name}: {e}")
                    errors += 1

            # Run ANALYZE to update statistics
            print("\nUpdating table statistics...")
            try:
                conn.execute(text("ANALYZE products"))
                conn.commit()
                print("  ✓ ANALYZE products")
            except Exception as e:
                print(f"  ✗ ANALYZE failed: {e}")

            print(f"\n--- Summary ---")
            print(f"Created: {created}")
            print(f"Skipped: {skipped}")
            print(f"Errors: {errors}")

            return errors == 0

    except OperationalError as e:
        print(f"ERROR: Could not connect to database: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def show_existing_indexes():
    """Show all existing indexes on the products table."""
    print("Fetching existing indexes on 'products' table...\n")

    try:
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'products' 
                ORDER BY indexname
            """))

            indexes = result.fetchall()

            if indexes:
                for idx in indexes:
                    print(f"  {idx[0]}")
            else:
                print("  No indexes found.")

    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Database index management for Mizizzi")
    parser.add_argument("--show", action="store_true", help="Show existing indexes")
    args = parser.parse_args()

    if args.show:
        show_existing_indexes()
    else:
        success = run_indexes()
        sys.exit(0 if success else 1)
