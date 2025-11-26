"""
Migration script to change carousel_banners.image_url from VARCHAR(500) to TEXT
This allows storing base64 encoded images or very long URLs.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.configuration.extensions import db

def migrate_image_url_column():
    """Alter image_url column from VARCHAR(500) to TEXT"""
    app = create_app()
    
    with app.app_context():
        try:
            # Use raw SQL to alter the column type
            sql = "ALTER TABLE carousel_banners ALTER COLUMN image_url TYPE TEXT;"
            db.session.execute(db.text(sql))
            db.session.commit()
            
            print("✅ Successfully migrated image_url column to TEXT type")
            print("   This column can now store base64 encoded images and long URLs")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate_image_url_column()
