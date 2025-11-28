"""
Admin routes package initialization
"""



from .admin import admin_routes
from .admin_cart_routes import admin_cart_routes
from .admin_settings_routes import admin_settings_routes

"""
Admin routes package initialization.
Exports all admin blueprints for easy importing.
"""
from .admin_google_auth import *

try:
    from .admin_categories_routes import admin_categories_bp
except ImportError:
    pass


__all__ = ['admin_routes', 'admin_cart_routes', 'admin_settings_routes']
