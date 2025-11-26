import os
import sys
import logging
from sqlalchemy import inspect, text
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.configuration.extensions import db
from app.models.contact_cta_model import ContactCTA

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_contact_cta():
    """Seed the Contact CTA table with initial data."""
    app = create_app()
    
    with app.app_context():
        try:
            table_name = getattr(ContactCTA, '__tablename__', 'contact_cta_slides')
            inspector = inspect(db.engine)
            
            # Ensure table exists
            if not inspector.has_table(table_name):
                logger.info(f"Table '{table_name}' does not exist - creating tables")
                db.create_all()
                inspector = inspect(db.engine)  # refresh
            
            # Expected columns we plan to seed/use
            expected_cols = {
                'subtitle': "VARCHAR",
                'image': "TEXT",
                'gradient': "TEXT",
                'icon': "VARCHAR",
                'title': "VARCHAR",
                'accent_color': "VARCHAR",
                'is_active': "BOOLEAN",
                'sort_order': "INTEGER",
                'created_at': "TIMESTAMP WITHOUT TIME ZONE",
                'updated_at': "TIMESTAMP WITHOUT TIME ZONE"
            }
            
            # Get existing columns
            try:
                existing_cols = {c['name'] for c in inspector.get_columns(table_name)}
            except SQLAlchemyError as e:
                # If inspector fails (rare), ensure session clean and re-create inspector
                logger.warning(f"Inspector failed to get columns: {e}. Attempting to recover.")
                try:
                    db.session.rollback()
                except Exception:
                    pass
                inspector = inspect(db.engine)
                existing_cols = {c['name'] for c in inspector.get_columns(table_name)}
            
            # Add any missing columns safely (each in its own transaction)
            missing = [c for c in expected_cols if c not in existing_cols]
            for col in missing:
                sql_type = expected_cols[col]
                logger.warning(f"Column '{col}' missing on '{table_name}'. Attempting to add it ({sql_type}).")
                try:
                    # Ensure session is clean before DDL
                    try:
                        db.session.rollback()
                    except Exception:
                        pass
                    # Use engine.begin() so DDL is executed and committed independently
                    with db.engine.begin() as conn:
                        conn.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {col} {sql_type}'))
                    logger.info(f"✅ Added '{col}' column successfully")
                except Exception as e:
                    # If a single column addition fails, log and continue (we may still be able to seed other cols)
                    logger.error(f"❌ Failed to add column '{col}': {e}")
                    try:
                        db.session.rollback()
                    except Exception:
                        pass

            # Robust count: try ORM first, otherwise use engine connect (clean connection)
            existing_count = 0
            try:
                existing_count = ContactCTA.query.count()
            except ProgrammingError as e:
                logger.warning(f"Model query failed when counting ContactCTA rows: {e}. Falling back to raw SQL count.")
                try:
                    # Clear session state before raw SQL
                    try:
                        db.session.rollback()
                    except Exception:
                        pass
                    with db.engine.connect() as conn:
                        res = conn.execute(text(f"SELECT COUNT(*) AS cnt FROM {table_name}"))
                        existing_count = int(res.scalar() or 0)
                except Exception as inner:
                    logger.error(f"Failed to get raw table count: {inner}")
                    existing_count = 0  # proceed to seed if uncertain

            if existing_count > 0:
                logger.info("Contact CTA slides already exist. Skipping seed.")
                return

            logger.info("Seeding Contact CTA slides...")

            slides = [
                {
                    "icon": "phone",
                    "title": "Exclusive Offer",
                    "subtitle": "Hii nayo, ni yako",
                    "image": "/uploads/product_images/watch-cta.png",
                    "gradient": "from-slate-900 via-slate-800 to-black",
                    "accent_color": "text-white",
                    "sort_order": 0,
                    "is_active": True
                },
                {
                    "icon": "headphones",
                    "title": "Top Audio",
                    "subtitle": "Premium Sound Quality",
                    "image": "/uploads/product_images/headphones-cta.png",
                    "gradient": "from-blue-900 via-slate-900 to-black",
                    "accent_color": "text-blue-400",
                    "sort_order": 1,
                    "is_active": True
                },
                {
                    "icon": "shoe",
                    "title": "Comfort Series",
                    "subtitle": "Step into Comfort",
                    "image": "/uploads/product_images/shoes-cta.png",
                    "gradient": "from-emerald-900 via-slate-900 to-black",
                    "accent_color": "text-emerald-400",
                    "sort_order": 2,
                    "is_active": True
                }
            ]

            # Defensive: only pass keys that exist on the mapped model
            model_cols = {c.name for c in ContactCTA.__table__.columns}
            for slide_data in slides:
                kwargs = {k: v for k, v in slide_data.items() if k in model_cols}
                db.session.add(ContactCTA(**kwargs))

            # Commit and finish
            db.session.commit()
            logger.info("✅ Successfully seeded Contact CTA slides!")
            
        except Exception as e:
            try:
                db.session.rollback()
            except Exception:
                pass
            logger.error(f"❌ Error seeding Contact CTA slides: {str(e)}")
            raise

if __name__ == "__main__":
    seed_contact_cta()
