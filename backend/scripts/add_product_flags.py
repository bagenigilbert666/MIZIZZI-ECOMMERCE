#!/usr/bin/env python3
"""
Migration script to add is_trending, is_top_pick, and is_daily_find columns to the products table.
"""

import sys
import os
import logging

# Robust app package locator: try APP_PATH env var, then walk up directories to find "app"
def locate_app_parent(start_dir=None, max_levels=6):
    """
    Return path to the parent directory that contains the 'app' package (so 'import app' works),
    or None if not found.
    """
    start = start_dir or os.path.dirname(os.path.abspath(__file__))
    # If user provided a specific path via env var, prefer it
    env_path = os.environ.get('APP_PATH') or os.environ.get('APP_MODULE_PATH')
    if env_path:
        env_path = os.path.abspath(env_path)
        # If env_path points to the 'app' directory itself, return its parent
        if os.path.basename(env_path) == 'app':
            parent = os.path.dirname(env_path)
            if os.path.isdir(env_path):
                return parent
        # If env_path points to a repo root that contains 'app'
        if os.path.isdir(os.path.join(env_path, 'app')):
            return env_path

    current = start
    for _ in range(max_levels):
        candidate = os.path.join(current, 'app')
        # Accept if there's an 'app' directory (package) or a single-file module app.py
        if os.path.isdir(candidate) and (os.path.exists(os.path.join(candidate, '__init__.py')) or True):
            return current
        if os.path.exists(os.path.join(current, 'app.py')):
            return current
        # move one level up
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return None

# Attempt to locate and add the app parent to sys.path
app_parent = locate_app_parent()
if app_parent:
    sys.path.insert(0, app_parent)
else:
    # Last-resort: also add repository root guesses (two levels up) to help local runs
    script_dir = os.path.dirname(os.path.abspath(__file__))
    guess = os.path.abspath(os.path.join(script_dir, '..'))
    sys.path.insert(0, guess)
    logging.getLogger(__name__).warning(
        "Could not locate an 'app' package automatically. Added fallback path: %s. "
        "If import still fails, set APP_PATH to your repo root or the path that contains the 'app' package.",
        guess
    )

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    try:
        logger.info("Starting product flags migration...")
        
        # Import after path setup
        from app import create_app
        from app.configuration.extensions import db
        from sqlalchemy import text, inspect
        
        # Create app and get database connection
        app = create_app()
        
        with app.app_context():
            # Check if table exists
            inspector = inspect(db.engine)
            if 'products' not in inspector.get_table_names():
                logger.error("❌ products table does not exist!")
                return False
            
            logger.info("products table exists, checking columns...")
            
            # Get current columns
            current_columns = {col['name'] for col in inspector.get_columns('products')}
            
            # Define columns to add
            columns_to_add = [
                ('is_trending', 'BOOLEAN DEFAULT FALSE'),
                ('is_top_pick', 'BOOLEAN DEFAULT FALSE'),
                ('is_daily_find', 'BOOLEAN DEFAULT FALSE')
            ]
            
            added_count = 0
            
            for col_name, col_def in columns_to_add:
                if col_name not in current_columns:
                    try:
                        logger.info(f"Adding column {col_name}...")
                        sql = f"ALTER TABLE products ADD COLUMN {col_name} {col_def}"
                        db.session.execute(text(sql))
                        added_count += 1
                        logger.info(f"✅ Added column: {col_name}")
                    except Exception as e:
                        logger.error(f"❌ Failed to add column {col_name}: {e}")
                        raise e
                else:
                    logger.info(f"ℹ️  Column {col_name} already exists")
            
            if added_count > 0:
                db.session.commit()
                logger.info(f"✅ Successfully added {added_count} columns to products table")
            else:
                logger.info("✅ No changes needed, all columns already exist")
                
            return True
            
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
