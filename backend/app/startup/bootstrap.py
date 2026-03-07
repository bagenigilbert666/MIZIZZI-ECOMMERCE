"""
Bootstrap initialization module for heavy database and hook setup.
Ensures single execution per process to avoid duplicate initialization during debug reload.
"""

import os
import logging
from datetime import datetime
from sqlalchemy.exc import OperationalError as SAOperationalError

# Try to import psycopg2 error for database handling
try:
    from psycopg2 import OperationalError as PsycopgOperationalError
except (ImportError, ModuleNotFoundError):
    PsycopgOperationalError = None

logger = logging.getLogger(__name__)

# Track which initializations have been completed this process
_bootstrap_complete = False
_order_hooks_registered = set()


def _can_connect_to_db(app, timeout_seconds=3):
    """
    Return True if a DB connection can be established using the app's SQLAlchemy engine.
    This is a lightweight check to avoid raising during app startup when the database is not yet available.
    """
    try:
        from app.configuration.extensions import db
        with app.app_context():
            # Use SQLAlchemy engine connect; this will raise if DB unreachable
            conn = db.engine.connect()
            conn.close()
        return True
    except Exception as e:
        app.logger.warning(f"Database connectivity check failed: {str(e)}")
        return False


def initialize_database(app):
    """Initialize database tables with guarded execution."""
    from app.configuration.extensions import db
    
    with app.app_context():
        if _can_connect_to_db(app):
            try:
                db.create_all()
                app.logger.info("Database tables created successfully")
            except Exception as e:
                app.logger.error(f"Error creating database tables: {str(e)}")
        else:
            app.logger.warning(
                "Database is not reachable - skipping db.create_all().\n"
                "If you intend the app to manage DB schema at startup, ensure DATABASE_URL/SQLALCHEMY_DATABASE_URI is set\n"
                "and the database is reachable from this host. Otherwise this is expected (DB provision happens separately)."
            )


def initialize_admin_tables(app):
    """Initialize all admin-related tables."""
    with app.app_context():
        # Admin auth tables
        try:
            from app.routes.admin.admin_auth import init_admin_auth_tables
            init_admin_auth_tables()
            app.logger.info("Admin authentication tables initialized successfully")
        except ImportError:
            app.logger.warning("Admin authentication tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing admin auth tables: {str(e)}")

        # Admin Google auth tables
        try:
            from app.routes.admin.admin_google_auth import init_admin_google_auth_tables
            init_admin_google_auth_tables()
            app.logger.info("Admin Google authentication tables initialized successfully")
        except ImportError:
            app.logger.warning("Admin Google authentication tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing admin Google auth tables: {str(e)}")

        # Admin email tables
        try:
            from app.routes.admin.admin_email_routes import init_admin_email_tables
            init_admin_email_tables()
            app.logger.info("Admin email tables initialized successfully")
        except ImportError:
            app.logger.warning("Admin email tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing admin email tables: {str(e)}")


def initialize_feature_tables(app):
    """Initialize all feature-specific tables."""
    with app.app_context():
        # Footer tables
        try:
            from app.routes.footer.footer_routes import init_footer_tables
            init_footer_tables(app)
            app.logger.info("Footer tables initialized successfully")
        except ImportError:
            app.logger.warning("Footer tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing footer tables: {str(e)}")

        # Side panel model
        try:
            from app.models.side_panel_model import SidePanel
            app.logger.info("Side panel model imported successfully")
        except ImportError:
            app.logger.warning("Side panel model not found - side panel system will not be available")
        except Exception as e:
            app.logger.error(f"Error importing side panel model: {str(e)}")

        # Contact CTA tables
        try:
            from app.routes.contact_cta.contact_cta_routes import init_contact_cta_tables
            init_contact_cta_tables()
            app.logger.info("Contact CTA tables initialized successfully")
        except ImportError:
            app.logger.warning("Contact CTA tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing contact CTA tables: {str(e)}")

        # Featured routes tables
        try:
            from app.routes.products.featured_routes import init_featured_routes_tables
            init_featured_routes_tables()
            app.logger.info("Featured routes tables initialized successfully")
        except ImportError:
            app.logger.warning("Featured routes tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing featured routes tables: {str(e)}")

        # Meilisearch tables
        try:
            from app.routes.meilisearch.meilisearch_routes import init_meilisearch_tables
            init_meilisearch_tables()
            app.logger.info("Meilisearch tables initialized successfully")
        except ImportError:
            app.logger.warning("Meilisearch tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing Meilisearch tables: {str(e)}")

        # Flash sale tables
        try:
            from app.routes.flash_sale.flash_sale_routes import init_flash_sale_tables
            init_flash_sale_tables()
            app.logger.info("Flash sale tables initialized successfully")
        except ImportError:
            app.logger.warning("Flash sale tables initialization skipped - module not found")
        except Exception as e:
            app.logger.error(f"Error initializing flash sale tables: {str(e)}")


def setup_order_completion_hooks(app):
    """Setup order completion hooks with idempotency guard."""
    global _order_hooks_registered
    
    # Use app id as key to track per-app hook registration
    app_id = id(app)
    
    if app_id in _order_hooks_registered:
        app.logger.debug("Order completion hooks already registered for this app instance")
        return
    
    try:
        order_completion_handler = None
        import_paths = [
            'app.routes.order.order_completion_handler',
            '.routes.order.order_completion_handler',
            'routes.order.order_completion_handler'
        ]
        
        for import_path in import_paths:
            try:
                module = __import__(import_path, fromlist=['setup_order_completion_hooks'])
                if hasattr(module, 'setup_order_completion_hooks'):
                    order_completion_handler = module
                    break
            except ImportError:
                continue
        
        if order_completion_handler:
            order_completion_handler.setup_order_completion_hooks(app)
            _order_hooks_registered.add(app_id)
            app.logger.info("Order completion hooks set up successfully")
        else:
            app.logger.warning("Order completion handler not found - hooks will not be registered")
            
    except Exception as e:
        app.logger.error(f"Error setting up order completion hooks: {str(e)}")


def run_bootstrap(app):
    """
    Run all bootstrap initialization tasks exactly once per process.
    
    This function:
    1. Initializes database tables
    2. Initializes admin tables
    3. Initializes feature-specific tables
    4. Sets up order completion hooks
    
    The guard ensures this runs only once per process, preventing duplicate work
    during Werkzeug debug reloader restarts.
    """
    global _bootstrap_complete
    
    # Only run bootstrap once per process
    if _bootstrap_complete:
        app.logger.debug("Bootstrap already completed for this process")
        return
    
    try:
        app.logger.info("Starting bootstrap initialization...")
        
        # Initialize database
        initialize_database(app)
        
        # Initialize admin tables (depends on db connection)
        initialize_admin_tables(app)
        
        # Initialize feature tables (depends on db connection)
        initialize_feature_tables(app)
        
        # Setup order hooks
        setup_order_completion_hooks(app)
        
        _bootstrap_complete = True
        app.logger.info("Bootstrap initialization completed successfully")
        
    except Exception as e:
        app.logger.error(f"Bootstrap initialization failed: {str(e)}")
        # Don't mark as complete if there was an error - allow retry
        raise
