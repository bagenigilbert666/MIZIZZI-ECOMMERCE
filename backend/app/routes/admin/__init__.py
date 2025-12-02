"""
Admin routes package initialization.
Exports all admin blueprints for easy importing.
"""

from .admin_auth import log_admin_activity, is_token_blacklisted

# Then import the Google auth routes
try:
    from .admin_google_auth import admin_google_auth_routes
except ImportError as e:
    import logging
    logging.warning(f"Could not import admin_google_auth: {e}")
    admin_google_auth_routes = None

try:
    from .admin_categories_routes import admin_categories_bp
except ImportError:
    admin_categories_bp = None

# Export all available items
__all__ = ['log_admin_activity', 'is_token_blacklisted']

if admin_google_auth_routes:
    __all__.append('admin_google_auth_routes')
    
if admin_categories_bp:
    __all__.append('admin_categories_bp')
