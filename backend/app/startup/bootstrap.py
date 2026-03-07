"""
Bootstrap initialization module for database and hook setup.

This module ensures critical initialization tasks (db.create_all, admin tables, hooks)
run exactly once per process, preventing duplicate work during Werkzeug debug reloader restarts.
"""

import logging
from sqlalchemy.exc import OperationalError as SQLOperationalError

logger = logging.getLogger(__name__)

# Track which initializations have been completed this process
_bootstrap_complete = False
_order_hooks_registered = set()


def _can_connect_to_db(app):
    """Check if database connection can be established."""
    try:
        from app.configuration.extensions import db
        with app.app_context():
            conn = db.engine.connect()
            conn.close()
        return True
    except (SQLOperationalError, Exception):
        return False


def initialize_database(app):
    """Initialize database tables if connection available."""
    from app.configuration.extensions import db
    
    if not _can_connect_to_db(app):
        app.logger.debug("Database not reachable - skipping table creation")
        return
    
    try:
        with app.app_context():
            db.create_all()
        app.logger.info("[Bootstrap] Database tables created")
    except Exception as e:
        app.logger.error(f"[Bootstrap] Failed to create DB tables: {e}")


def initialize_admin_tables(app):
    """Initialize admin-related database tables."""
    with app.app_context():
        # Mapping of (import_path, function_name, log_name)
        admin_inits = [
            ('app.routes.admin.admin_auth', 'init_admin_auth_tables', 'Admin Auth'),
            ('app.routes.admin.admin_google_auth', 'init_admin_google_auth_tables', 'Admin Google Auth'),
            ('app.routes.admin.admin_email_routes', 'init_admin_email_tables', 'Admin Email'),
        ]
        
        for module_path, func_name, label in admin_inits:
            try:
                module = __import__(module_path, fromlist=[func_name])
                if hasattr(module, func_name):
                    getattr(module, func_name)()
                    app.logger.debug(f"[Bootstrap] {label} tables initialized")
            except ImportError:
                pass
            except Exception as e:
                app.logger.error(f"[Bootstrap] Failed to init {label}: {e}")


def initialize_feature_tables(app):
    """Initialize feature-specific database tables."""
    with app.app_context():
        feature_inits = [
            ('app.routes.footer.footer_routes', 'init_footer_tables', 'Footer', True),
            ('app.models.side_panel_model', 'SidePanel', 'Side Panel', False),
            ('app.routes.contact_cta.contact_cta_routes', 'init_contact_cta_tables', 'Contact CTA', True),
            ('app.routes.products.featured_routes', 'init_featured_routes_tables', 'Featured Routes', True),
            ('app.routes.meilisearch.meilisearch_routes', 'init_meilisearch_tables', 'Meilisearch', True),
            ('app.routes.flash_sale.flash_sale_routes', 'init_flash_sale_tables', 'Flash Sale', True),
        ]
        
        for module_path, attr_name, label, is_callable in feature_inits:
            try:
                module = __import__(module_path, fromlist=[attr_name])
                if hasattr(module, attr_name):
                    attr = getattr(module, attr_name)
                    if is_callable:
                        attr()
                    app.logger.debug(f"[Bootstrap] {label} initialized")
            except ImportError:
                pass
            except Exception as e:
                app.logger.error(f"[Bootstrap] Failed to init {label}: {e}")


def setup_order_completion_hooks(app):
    """Setup order completion hooks with idempotency guard."""
    global _order_hooks_registered
    
    app_id = id(app)
    if app_id in _order_hooks_registered:
        return
    
    try:
        module = None
        for path in ['app.routes.order.order_completion_handler', 'routes.order.order_completion_handler']:
            try:
                module = __import__(path, fromlist=['setup_order_completion_hooks'])
                if hasattr(module, 'setup_order_completion_hooks'):
                    break
            except ImportError:
                continue
        
        if module:
            module.setup_order_completion_hooks(app)
            _order_hooks_registered.add(app_id)
            app.logger.debug("[Bootstrap] Order completion hooks registered")
    except Exception as e:
        app.logger.error(f"[Bootstrap] Failed to setup order hooks: {e}")


def run_bootstrap(app):
    """
    Run bootstrap initialization exactly once per process.
    
    Initializes:
    - Database tables
    - Admin tables
    - Feature tables
    - Order completion hooks
    """
    global _bootstrap_complete
    
    if _bootstrap_complete:
        return
    
    try:
        app.logger.info("[Bootstrap] Starting initialization")
        initialize_database(app)
        initialize_admin_tables(app)
        initialize_feature_tables(app)
        setup_order_completion_hooks(app)
        _bootstrap_complete = True
        app.logger.info("[Bootstrap] Completed successfully")
    except Exception as e:
        app.logger.error(f"[Bootstrap] Failed: {e}")
        raise
