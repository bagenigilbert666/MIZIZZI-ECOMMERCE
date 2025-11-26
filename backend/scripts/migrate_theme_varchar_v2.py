"""
Database migration script to fix VARCHAR size for theme colors
Migrates from VARCHAR(7) to VARCHAR(500) for background_color to support gradients
Migrates from VARCHAR(19) to VARCHAR(300) for carousel overlays
"""

import psycopg2
from psycopg2 import sql
import os
from datetime import datetime
import argparse
try:
    from dotenv import load_dotenv
    _HAS_DOTENV = True
except Exception:
    _HAS_DOTENV = False


def get_column_info(cursor, table, column):
    """Return (data_type, character_maximum_length) or None if column not found."""
    cursor.execute(
        """
        SELECT data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        """,
        (table, column)
    )
    return cursor.fetchone()


def run_migration(db_url, dry_run=False):
    """Execute the migration to fix theme color VARCHAR sizes"""
    if not db_url:
        print("ERROR: No database URL provided. Use --database-url or set DATABASE_URL.")
        return False

    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        print("Starting theme VARCHAR migration...")
        print(f"Timestamp: {datetime.now()}")

        migrations = [
            ("theme_settings", "background_color", 500),
            ("theme_settings", "carousel_overlay_dark", 300),
            ("theme_settings", "carousel_overlay_light", 300),
        ]

        for idx, (table, col, target_len) in enumerate(migrations, start=1):
            print(f"\n{idx}. Checking {table}.{col} -> VARCHAR({target_len})...")
            info = get_column_info(cursor, table, col)
            if not info:
                print(f"   ! Column not found: {table}.{col} — skipping")
                continue

            data_type, current_len = info
            # current_len is None for text/unlimited
            if current_len is None:
                print(f"   • Current type is {data_type} (unlimited) — no change needed")
                continue

            try:
                current_len = int(current_len)
            except Exception:
                print(f"   ! Unable to parse current length ({current_len}) — skipping")
                continue

            if current_len >= target_len:
                print(f"   ✓ Current length {current_len} >= {target_len} — skipping")
                continue

            alter_sql = sql.SQL(
                "ALTER TABLE {table} ALTER COLUMN {col} TYPE VARCHAR({size}) USING LEFT({col}::text, {size})::varchar"
            ).format(
                table=sql.Identifier(table),
                col=sql.Identifier(col),
                size=sql.SQL(str(target_len)),
            )

            if dry_run:
                print(f"   ~ DRY RUN: would execute: {alter_sql.as_string(cursor)}")
            else:
                print(f"   → Altering {table}.{col} ({current_len} -> {target_len})...")
                cursor.execute(alter_sql)
                print(f"   ✓ {col} migrated successfully")

        if dry_run:
            print("\nDry-run complete. No changes were committed.")
            return True

        conn.commit()
        print("\n" + "="*60)
        print("✓ Migration completed successfully!")
        print("="*60)
        return True

    except psycopg2.Error as e:
        print(f"\nERROR: Database migration failed")
        print(f"Error: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    except Exception as e:
        print(f"\nERROR: Unexpected error during migration")
        print(f"Error: {e}")
        return False
    finally:
        try:
            if cursor:
                cursor.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate theme VARCHAR sizes")
    parser.add_argument("--database-url", "-d", help="Database URL (overrides DATABASE_URL env var)")
    parser.add_argument("--dry-run", action="store_true", help="Show actions without executing")
    args = parser.parse_args()

    # Attempt to load .env if python-dotenv is installed
    if _HAS_DOTENV:
        load_dotenv()  # silently ignore if no .env

    db_url = args.database_url or os.environ.get("DATABASE_URL")

    if not db_url:
        print("ERROR: DATABASE_URL environment variable not set and --database-url not provided.")
        print("Example: export DATABASE_URL='postgres://user:pass@host:5432/dbname'")
        exit(1)

    success = run_migration(db_url, dry_run=args.dry_run)
    exit(0 if success else 1)
