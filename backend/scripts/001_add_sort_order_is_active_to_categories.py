"""
Database migration script to add sort_order and is_active columns to categories table.
Run this script if migrations have not been initialized yet.
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate_add_category_fields():
    """Add sort_order and is_active columns to categories table"""
    try:
        # Import app
        from app import create_app
        from app.configuration.extensions import db
        from app.models.models import Category
        
        app = create_app()
        
        with app.app_context():
            # Inspect the current table structure
            inspector = inspect(db.engine)
            columns = [c['name'] for c in inspector.get_columns('categories')]
            
            print(f"[Migration] Current categories table columns: {columns}")
            
            # Check if columns already exist
            if 'sort_order' in columns and 'is_active' in columns:
                print("✅ [Migration] Columns 'sort_order' and 'is_active' already exist in categories table")
                return True
            
            # Add missing columns using transactional connection and text()
            with db.engine.begin() as conn:
                # Add sort_order column if missing
                if 'sort_order' not in columns:
                    print("📝 [Migration] Adding sort_order column...")
                    conn.execute(text("ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0"))
                    print("✅ [Migration] Added sort_order column")
                
                # Add is_active column if missing
                if 'is_active' not in columns:
                    print("📝 [Migration] Adding is_active column...")
                    conn.execute(text("ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                    print("✅ [Migration] Added is_active column")
            
            # Verify columns were added
            inspector = inspect(db.engine)
            new_columns = [c['name'] for c in inspector.get_columns('categories')]
            print(f"✅ [Migration] Updated categories table columns: {new_columns}")
            
            # Set default values for existing rows using transactional connection
            with db.engine.begin() as conn:
                conn.execute(text("UPDATE categories SET sort_order = 0 WHERE sort_order IS NULL"))
                conn.execute(text("UPDATE categories SET is_active = TRUE WHERE is_active IS NULL"))
            
            print("✅ [Migration] Migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ [Migration] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = migrate_add_category_fields()
    sys.exit(0 if success else 1)
