"""
Database migration script to add image storage columns to categories table.
This allows storing images directly in the database as binary data (BLOB).
Run this script to enable database-based image storage for categories.
"""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate_add_image_storage_fields():
    """Add image storage columns to categories table"""
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
            
            # List of new columns to add
            new_columns = {
                'image_data': 'BYTEA',
                'image_filename': 'VARCHAR(255)',
                'image_mimetype': 'VARCHAR(100)',
                'banner_data': 'BYTEA',
                'banner_filename': 'VARCHAR(255)',
                'banner_mimetype': 'VARCHAR(100)'
            }
            
            # Check if columns already exist
            existing_new_columns = [col for col in new_columns.keys() if col in columns]
            if len(existing_new_columns) == len(new_columns):
                print("✅ [Migration] Image storage columns already exist in categories table")
                return True
            
            # Add missing columns
            with db.engine.connect() as conn:
                for column_name, column_type in new_columns.items():
                    if column_name not in columns:
                        print(f"📝 [Migration] Adding {column_name} column...")
                        
                        # Create SQL statement based on column type
                        if column_type == 'BYTEA':
                            sql = text(f"ALTER TABLE categories ADD COLUMN {column_name} {column_type}")
                        else:
                            sql = text(f"ALTER TABLE categories ADD COLUMN {column_name} {column_type}")
                        
                        conn.execute(sql)
                        conn.commit()
                        print(f"✅ [Migration] Added {column_name} column")
            
            # Verify columns were added
            inspector = inspect(db.engine)
            new_columns_list = [c['name'] for c in inspector.get_columns('categories')]
            print(f"✅ [Migration] Updated categories table columns: {new_columns_list}")
            
            print("✅ [Migration] Migration completed successfully!")
            print("\n📋 Summary:")
            print("  - Added image_data (BYTEA) - stores category image as binary data")
            print("  - Added image_filename (VARCHAR) - stores original filename")
            print("  - Added image_mimetype (VARCHAR) - stores image MIME type")
            print("  - Added banner_data (BYTEA) - stores banner image as binary data")
            print("  - Added banner_filename (VARCHAR) - stores original banner filename")
            print("  - Added banner_mimetype (VARCHAR) - stores banner MIME type")
            print("\n🎯 Next steps:")
            print("  1. Update your Category model in models.py to include these columns")
            print("  2. Update your routes to save images to database instead of filesystem")
            print("  3. Create endpoints to serve images from database")
            
            return True
            
    except Exception as e:
        print(f"❌ [Migration] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("DATABASE MIGRATION: Add Image Storage to Categories")
    print("=" * 70)
    print()
    
    success = migrate_add_image_storage_fields()
    
    print()
    print("=" * 70)
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed. Please check the error messages above.")
    print("=" * 70)
    
    sys.exit(0 if success else 1)
