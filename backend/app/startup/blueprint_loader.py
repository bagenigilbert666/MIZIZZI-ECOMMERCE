"""
Blueprint loader - handles registration of all application blueprints.
Keeps blueprint logic separate from main app initialization.
"""

import logging
from flask import Blueprint as _Blueprint

logger = logging.getLogger(__name__)


def register_blueprints(app):
    """
    Register all blueprints from the registry into the Flask application.
    
    Args:
        app: Flask application instance
    
    Returns:
        Tuple of (registered_count, failed_blueprints_list)
    """
    from app.routes.blueprint_registry import BLUEPRINT_ROUTES
    
    registered_count = 0
    failed_blueprints = []
    
    # Register each blueprint from the registry
    for module_path, blueprint_name, url_prefix in BLUEPRINT_ROUTES:
        try:
            module = __import__(module_path, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name, None)
            
            # Try to find any Blueprint in the module if not found by name
            if blueprint is None:
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, _Blueprint):
                        blueprint = attr
                        break
            
            if blueprint:
                app.register_blueprint(blueprint, url_prefix=url_prefix)
                registered_count += 1
            else:
                failed_blueprints.append((blueprint_name, module_path))
                app.logger.warning(f"⚠️  {blueprint_name} not found in {module_path}")
                
        except Exception as e:
            failed_blueprints.append((blueprint_name, module_path))
            app.logger.debug(f"Failed to import {blueprint_name} from {module_path}: {e}")
    
    return registered_count, failed_blueprints


def log_startup_summary(app, registered_count, failed_blueprints):
    """
    Log a clean startup summary of blueprint registration.
    
    Args:
        app: Flask application instance
        registered_count: Number of successfully registered blueprints
        failed_blueprints: List of (name, path) tuples for failed blueprints
    """
    app.logger.info("=" * 60)
    app.logger.info("🚀 MIZIZZI E-COMMERCE PLATFORM - STARTUP COMPLETE")
    app.logger.info("=" * 60)
    app.logger.info(f"📦 BLUEPRINT REGISTRATION: {registered_count} registered")
    
    if failed_blueprints:
        app.logger.warning(f"⚠️  {len(failed_blueprints)} blueprints not available (optional)")
        for name, path in failed_blueprints:
            app.logger.debug(f"  - {name}: {path}")
