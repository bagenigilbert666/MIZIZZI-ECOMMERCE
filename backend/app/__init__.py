"""
Mizizzi E-commerce Backend Application Package
"""

import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request, send_from_directory, g, abort
from flask_migrate import Migrate
try:
    from flask_cors import CORS
except Exception:
    # Defensive fallback: if Flask-CORS is not installed, provide a no-op
    # CORS class so the package can still be imported. This avoids hard
    # import-time failures and allows the application factory to run in
    # degraded environments (tests, scripts) without the package.
    class CORS:  # pragma: no cover - fallback for missing dependency
        def __init__(self, *args, **kwargs):
            pass
    # Use logging.warning here because the module-level `logger` is defined
    # later after other imports. This avoids referencing an undefined name
    # during early import-time handling.
    import logging as _logging
    _logging.warning("Flask-CORS not available; using no-op CORS fallback."
                     " Install 'flask-cors' to enable CORS support.")
from flask_jwt_extended import JWTManager, get_jwt_identity, create_access_token, jwt_required, verify_jwt_in_request
import uuid
import werkzeug.utils
from pathlib import Path
from functools import wraps
from time import time
from sqlalchemy.exc import OperationalError as SAOperationalError

# Try to import psycopg2 error for database handling
try:
    from psycopg2 import OperationalError as PsycopgOperationalError
except (ImportError, ModuleNotFoundError):
    PsycopgOperationalError = None

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def setup_app_environment():
    """Setup the app environment and paths."""
    app_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Add app directory to Python path if not already there
    if app_dir not in sys.path:
        sys.path.insert(0, app_dir)
    
    # Add parent directory for relative imports
    parent_dir = os.path.dirname(app_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)
    
    logger.info(f"app directory: {app_dir}")
    logger.info(f"Python path updated with app paths")
    return app_dir

# Note: setup_app_environment() is called inside create_app() instead of at module import time
# to avoid repeated execution under Werkzeug debug reloader.
# Meilisearch stubs are also lazily initialized inside create_app().

# Import extensions and config
try:
    from .configuration.extensions import db, ma, mail, cache, limiter
    from .configuration.config import config, get_database_url
    from .websocket import socketio
except ImportError:
    # Fallback imports for different directory structures
    try:
        from configuration.extensions import db, ma, mail, cache, limiter
        from configuration.config import config, get_database_url
        from websocket import socketio
    except ImportError:
        # Last resort - create minimal extensions
        from flask_sqlalchemy import SQLAlchemy
        from flask_marshmallow import Marshmallow
        from flask_mail import Mail
        from flask_caching import Cache
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        from flask_socketio import SocketIO
        
        db = SQLAlchemy()
        ma = Marshmallow()
        mail = Mail()
        cache = Cache()
        limiter = Limiter(key_func=get_remote_address)
        # Removed duplicate SQLAlchemy instance - import from extensions instead
        from .configuration.extensions import db, ma, mail, cache, limiter
        from flask_socketio import SocketIO

        socketio = SocketIO()
        
        def get_database_url():
            """Get and fix DATABASE_URL for SQLAlchemy compatibility with Render."""
            database_url = os.environ.get('DATABASE_URL')
            if database_url:
                if database_url.startswith('postgres://'):
                    database_url = database_url.replace('postgres://', 'postgresql://', 1)
                return database_url
            # Return only the URL string (not a tuple) so SQLAlchemy receives a valid URL
            return 'postgresql://neondb_owner:npg_0gMwASZYo9pJ@ep-shiny-term-adlossxs-pooler.c-2.us-east-1.aws.neon.tech/mizizzi_project?sslmode=require&channel_binding=require'
        
        # Minimal config classes
        class Config:
            SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
            SQLALCHEMY_DATABASE_URI = get_database_url()
            SQLALCHEMY_TRACK_MODIFICATIONS = False
            # Optimized for remote Neon PostgreSQL with connection pooling
            SQLALCHEMY_ENGINE_OPTIONS = {
                'pool_size': 15,                  # Persistent connections in pool
                'max_overflow': 10,               # Extra connections when pool full
                'pool_pre_ping': True,            # Test connections before use
                'pool_recycle': 300,              # Recycle connections after 5 minutes
                'connect_args': {
                    'connect_timeout': 10,        # Connection timeout 10s
                }
            }
            JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
            JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
            CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000','https://mizizzi-shop.vercel.app']
            CACHE_TYPE = 'SimpleCache'
            RATELIMIT_STORAGE_URI = 'memory://'
        
        class DevelopmentConfig(Config):
            DEBUG = True
        
        class ProductionConfig(Config):
            DEBUG = False
            # Use SimpleCache as fallback if Redis not available
            CACHE_TYPE = 'SimpleCache'
            RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or 'memory://'
        
        class TestingConfig(Config):
            TESTING = True
            SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
        
        config = {
            'development': DevelopmentConfig,
            'testing': TestingConfig,
            'production': ProductionConfig,
            'default': DevelopmentConfig
        }

def create_app(config_name=None, enable_socketio=True):
    """
    Application factory function that creates and configures the Flask app.
    
    Args:
        config_name: The configuration to use (development, testing, production)
        enable_socketio: Whether to enable SocketIO support (default: True)
    
    Returns:
        The configured Flask application
    """
    # Setup environment paths inside create_app() to avoid repeated execution under debug reloader
    setup_app_environment()
    
    # Initialize Meilisearch stubs if not already available
    try:
        from app.models.meilisearch_models import MeilisearchModel  # type: ignore
    except Exception:
        import types
        mod_name = 'app.models.meilisearch_model'
        if mod_name not in sys.modules:
            stub = types.ModuleType(mod_name)
            class MeilisearchModel:
                """Fallback stub when real MeilisearchModel is not available."""
                pass
            stub.MeilisearchModel = MeilisearchModel
            sys.modules[mod_name] = stub
            logger.debug("MeilisearchModel stub initialized")
        
        if 'app.models.meilisearch_models' not in sys.modules:
            import types as _types
            sys.modules['app.models.meilisearch_models'] = _types.ModuleType('app.models.meilisearch_models')
    
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    
    app = Flask(__name__)
    # Resolve configuration object robustly by importing the configuration
    # module at runtime. This avoids relying on a possibly shadowed `config`
    # name in the current module's globals (which caused intermittent failures).
    import importlib

    cfg_obj = None
    try:
        cfg_mod = importlib.import_module('app.configuration.config')
        # If the module exports a mapping called `config` use it first
        if hasattr(cfg_mod, 'config') and isinstance(getattr(cfg_mod, 'config'), dict):
            cfg_map = getattr(cfg_mod, 'config')
            cfg_obj = cfg_map.get(config_name) or cfg_map.get('default')
        else:
            # Look for a class named e.g. DevelopmentConfig or <Name>Config
            candidate_attr = f"{str(config_name).capitalize()}Config"
            cfg_obj = getattr(cfg_mod, candidate_attr, None) or getattr(cfg_mod, 'default', None) or getattr(cfg_mod, config_name, None)
        # As last resort, if cfg_mod itself *is* a mapping, accept it
        if cfg_obj is None and isinstance(cfg_mod, dict):
            cfg_obj = cfg_mod.get(config_name) or cfg_mod.get('default')
    except Exception as e:
        logger.debug(f"Error importing app.configuration.config: {e}")

    if cfg_obj is None:
        raise RuntimeError("Could not resolve configuration object from app.configuration.config. Check exports there.")

    app.config.from_object(cfg_obj)
    
    # Set secret key for SocketIO
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
    )
    
    # Set werkzeug logger to WARNING to hide 404 logs
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.setLevel(logging.WARNING)
    
    # Ensure DB URI is available before initializing extensions that require it
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        db_url = app.config.get('DATABASE_URL') or os.environ.get('DATABASE_URL')
        if db_url:
            app.config['SQLALCHEMY_DATABASE_URI'] = db_url
        else:
            # leave as-is; init_app will raise a clear error if still absent
            pass
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)

    # Initialize extensions. Prefer centralized initializer from configuration.extensions
    # which performs extra binding and defensive setup. Fall back to per-extension init
    # only if the centralized initializer is not available.
    try:
        from .configuration.extensions import init_extensions
        init_extensions(app)
    except Exception:
        # Defensive per-extension initialization (handles edge-cases where names
        # like `cache` may refer to the app.cache module instead of the Cache
        # extension instance due to import-order/name collisions).
        try:
            if hasattr(db, 'init_app'):
                db.init_app(app)
        except Exception:
            pass
        try:
            if hasattr(ma, 'init_app'):
                ma.init_app(app)
        except Exception:
            pass
        try:
            if hasattr(mail, 'init_app'):
                mail.init_app(app)
        except Exception:
            pass
        try:
            if hasattr(cache, 'init_app'):
                cache.init_app(app)
        except Exception:
            # If cache is a module (app.cache) it won't have init_app; log and continue
            logger.warning("Cache extension not initialized via cache.init_app (name may be a module). Continuing.")
        try:
            if hasattr(limiter, 'init_app'):
                limiter.init_app(app)
        except Exception:
            pass

    # Disable strict slashes to avoid Flask redirecting requests which breaks CORS preflight
    try:
        app.url_map.strict_slashes = False
    except Exception:
        pass
    
    if enable_socketio:
        try:
            cors_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000','https://mizizzi-shop.vercel.app'])
            
            socketio.init_app(
                app,
                cors_allowed_origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.0.118:3000', 'https://mizizzi-shop.vercel.app'],
                async_mode='threading',
                logger=True,
                engineio_logger=False,
                ping_timeout=60,
                ping_interval=25,
                manage_session=False
            )
            
            app.socketio = socketio
            
            app.logger.info("✅ SocketIO enabled and initialized successfully")
            app.logger.info(f"   CORS origins: {cors_origins}")
            app.logger.info(f"   Async mode: threading")
        except Exception as e:
            app.logger.error(f"❌ SocketIO initialization failed: {str(e)}")
            import traceback
            app.logger.error(traceback.format_exc())
            app.logger.info("SocketIO disabled")
            enable_socketio = False
    else:
        app.logger.info("SocketIO disabled by configuration")
    
    # Set up database migrations
    Migrate(app, db)
    
    # Configure CORS properly
    CORS(
        app,
        origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'https://mizizzi-shop.vercel.app'],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Cache-Control", "cache-control", "Pragma", "Expires", "X-MFA-Token", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=["Content-Range", "X-Content-Range", "X-Cache", "X-Cache-Time-Ms", "X-Response-Time-Ms", "X-Products-Cached", "X-All-Products-Cache"],
        send_wildcard=False,
        vary_header=True
    )

    @app.before_request
    def _handle_options_preflight():
        if request.method != 'OPTIONS':
            return None

        from flask import make_response
        response = make_response(jsonify({'status': 'ok'}), 200)

        origin = request.headers.get('Origin')
        allowed_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000','https://mizizzi-shop.vercel.app'])
        if origin and ("*" in allowed_origins or origin in allowed_origins):
            response.headers['Access-Control-Allow-Origin'] = origin     
        else:
            response.headers['Access-Control-Allow-Origin'] = ','.join(allowed_origins)

        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-MFA-Token, Accept, Origin, Cache-Control, cache-control, Pragma, Expires'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Vary'] = 'Origin'

        return response
    
    # Initialize JWT
    jwt = JWTManager(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        try:
            from .routes.admin.admin_auth import is_token_blacklisted
            jti = jwt_payload["jti"]
            revoked = is_token_blacklisted(jti)
            if revoked:
                app.logger.warning(f"Token revoked (jti={jti}) for request {request.path}")
            return revoked
        except Exception as e:
            app.logger.error(f"Error checking token blacklist: {str(e)}")
            return False
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has expired",
            "code": "token_expired"
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        try:
            app.logger.warning(f"Invalid token encountered on {request.path}: {error}")
        except Exception:
            pass
        return jsonify({
            "error": "Invalid token",
            "code": "invalid_token"
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Authorization required",
            "code": "authorization_required"
        }), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Fresh token required",
            "code": "fresh_token_required"
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token has been revoked",
            "code": "token_revoked"
        }), 401
    
    # Create uploads directory if it doesn't exist
    uploads_dir = os.path.join(app.root_path, 'uploads')
    product_images_dir = os.path.join(uploads_dir, 'product_images')
    categories_images_dir = os.path.join(uploads_dir, 'categories')
    
    for directory in [uploads_dir, product_images_dir, categories_images_dir]:
        if not os.path.exists(directory):
            os.makedirs(directory)
            app.logger.info(f"Created directory: {directory}")
    
    # Image upload route
    @app.route('/api/admin/upload/image', methods=['POST'])
    @jwt_required()
    def upload_image():
        try:
            if 'file' not in request.files:
                return jsonify({"error": "No file part in the request"}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "No selected file"}), 400
            
            if len(file.read()) > 5 * 1024 * 1024:
                return jsonify({"error": "File too large (max 5MB)"}), 400
            file.seek(0)
            
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
            if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
                return jsonify({"error": "File type not allowed. Only images are permitted."}), 400
            
            original_filename = werkzeug.utils.secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            
            file_path = os.path.join(product_images_dir, unique_filename)
            file.save(file_path)
            
            current_user_id = get_jwt_identity()
            app.logger.info(f"User {current_user_id} uploaded image: {unique_filename}")
            
            site_url = os.environ.get('SITE_URL', request.host_url.rstrip('/'))
            image_url = f"{site_url}/api/uploads/product_images/{unique_filename}"
            
            return jsonify({
                "success": True,
                "filename": unique_filename,
                "originalName": original_filename,
                "url": image_url,
                "size": os.path.getsize(file_path),
                "uploadedBy": current_user_id,
                "uploadedAt": datetime.now().isoformat()
            }), 201
            
        except Exception as e:
            app.logger.error(f"Error uploading image: {str(e)}")
            return jsonify({"error": f"Failed to upload image: {str(e)}"}), 500
    
    @app.route('/api/uploads/product_images/<filename>', methods=['GET'])
    def serve_product_image(filename):
        secure_name = werkzeug.utils.secure_filename(filename)
        return send_from_directory(product_images_dir, secure_name)
    
    @app.route('/api/uploads/categories/<filename>', methods=['GET'])
    def serve_category_image(filename):
        secure_name = werkzeug.utils.secure_filename(filename)
        app.logger.debug(f"Serving category image: {secure_name} from {categories_images_dir}")
        return send_from_directory(categories_images_dir, secure_name)
    
    # Guest cart helper function
    def get_or_create_guest_cart():
        try:
            from .models.models import Cart
        except ImportError:
            try:
                from models.models import Cart
            except ImportError:
                class Cart:
                    def __init__(self, guest_id=None):
                        self.guest_id = guest_id
                        self.is_active = True
                return Cart(guest_id=str(uuid.uuid4()))
        
        guest_cart_id = request.cookies.get('guest_cart_id')
        if guest_cart_id:
            cart = Cart.query.filter_by(guest_id=guest_cart_id, is_active=True).first()
            if cart:
                return cart
        
        guest_id = str(uuid.uuid4())
        cart = Cart(guest_id=guest_id, is_active=True)
        try:
            db.session.add(cart)
            db.session.commit()
        except Exception as e:
            app.logger.error(f"Error creating guest cart: {str(e)}")
        
        return cart
    
    # JWT Optional decorator
    def jwt_optional(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request(optional=True)
                user_id = get_jwt_identity()
                if user_id:
                    g.user_id = user_id
                    g.is_authenticated = True
                else:
                    g.is_authenticated = False
                    g.guest_cart = get_or_create_guest_cart()
            except Exception as e:
                app.logger.error(f"JWT error: {str(e)}")
                g.is_authenticated = False
                g.guest_cart = get_or_create_guest_cart()
            
            return fn(*args, **kwargs)
        return wrapper
    
    app.jwt_optional = jwt_optional
    
    
    # Import and register blueprints with clean error handling
    from flask import Blueprint
    
    # Create fallback blueprints for routes
    # Register all blueprints
    from app.startup.blueprint_loader import register_blueprints, log_startup_summary
    registered_count, failed_blueprints = register_blueprints(app)
    log_startup_summary(app, registered_count, failed_blueprints)
    
    # Run bootstrap initialization (DB creation, admin tables, hooks)
    # This is guarded to run only once per process
    try:
        from app.startup.bootstrap import run_bootstrap
        run_bootstrap(app)
    except Exception as e:
        app.logger.error(f"Bootstrap initialization failed: {str(e)}")
        # Don't fail the whole app, but log the error
    
    # Dashboard health check endpoint
    @app.route('/api/admin/dashboard/health', methods=['GET', 'OPTIONS'])
    def dashboard_health_check():
        """Health check endpoint for dashboard system."""
        try:
            return jsonify({
                "status": "ok",
                "service": "dashboard",
                "timestamp": datetime.now().isoformat(),
                "endpoints": [
                    "/api/admin/dashboard",
                    "/api/admin/dashboard/stats",
                    "/api/admin/dashboard/live-stats",
                    "/api/admin/dashboard/health"
                ],
                "database": "connected" if db else "disconnected",
                "data_source": "database_only"
            }), 200
        except Exception as e:
            app.logger.error(f"Dashboard health check failed: {str(e)}")
            return jsonify({
                "status": "error",
                "service": "dashboard",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }), 500
    
    # Health check endpoint
    @app.route('/api/health-check', methods=['GET', 'OPTIONS'])
    def health_check():
        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "config": config_name,
            "inventory_system": "active",
            "dashboard_system": "active",
            "order_system": "active",
            "product_system": "active",
            "payment_system": {
                "pesapal": "active" if 'pesapal_routes' in imported_blueprints else "inactive"
            },
            "admin_auth_system": "active" if 'admin_auth_routes' in imported_blueprints else "inactive",
            "admin_google_auth_system": "active" if 'admin_google_auth_routes' in imported_blueprints else "inactive",
            "admin_email_system": "active" if 'admin_email_routes' in imported_blueprints else "inactive",
            "google_auth_system": "active" if 'google_auth_routes' in imported_blueprints else "inactive",
            "meilisearch_system": {
                "routes": "active" if 'meilisearch_routes' in imported_blueprints else "inactive",
                "admin_routes": "active" if 'admin_meilisearch_routes' in imported_blueprints else "inactive"
            },
            "wishlist_system": {
                "user_routes": "active" if 'user_wishlist_routes' in imported_blueprints else "inactive",
                "admin_routes": "active" if 'admin_wishlist_routes' in imported_blueprints else "inactive"
            },
            "brand_system": {
                "user_routes": "active" if 'user_brand_routes' in imported_blueprints else "inactive",
                "admin_routes": "active" if 'admin_brand_routes' in imported_blueprints else "inactive"
            },
            "notification_system": {
                "routes": "active" if 'notification_routes' in imported_blueprints else "inactive"
            },
            "carousel_system": {
                "routes": "active" if 'carousel_routes' in imported_blueprints else "inactive"
            },
            "theme_system": {
                "routes": "active" if 'theme_routes' in imported_blueprints else "inactive"
            },
            "footer_system": {
                "routes": "active" if 'footer_routes' in imported_blueprints else "inactive"
            },
            "side_panel_system": {
                "routes": "active" if 'side_panel_routes' in imported_blueprints else "inactive"
            },
            "topbar_system": {
                "routes": "active" if 'topbar_routes' in imported_blueprints else "inactive"
            },
            "contact_cta_system": {
                "routes": "active" if 'contact_cta_routes' in imported_blueprints else "inactive"
            },
            "featured_system": {
                "routes": "active" if 'featured_routes' in imported_blueprints else "inactive"
            },
            # Add flash sale system to health check
            "flash_sale_system": {
                "routes": "active" if 'flash_sale_routes' in imported_blueprints else "inactive"
            },
            "security_features": {
                "token_blacklisting": True,
                "rate_limiting": True,
                "mfa_support": True,
                "audit_trail": True,
                "enhanced_password_validation": True,
                "payment_validation": True
            }
        }), 200
    
    # Error handlers
    @app.errorhandler(404)

    def not_found_error(error):
        return jsonify({"error": "Not Found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        if db:
            try:
                db.session.rollback()
            except:
                pass
        return jsonify({"error": "Internal Server Error"}), 500
    
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"error": "Rate limit exceeded", "message": str(e.description)}), 429
    
    @app.errorhandler(SAOperationalError)
    def handle_sqlalchemy_operational_error(err):
        app.logger.warning(f"Database operational error caught: {str(err)}")
        return jsonify({
            "error": "database_operational_error",
            "message": "A database connectivity error occurred. Please try again later."
        }), 503

    if PsycopgOperationalError is not None:
        @app.errorhandler(PsycopgOperationalError)
        def handle_psycopg_operational_error(err):
            app.logger.warning(f"psycopg2 OperationalError caught: {str(err)}")
            return jsonify({
                "error": "database_operational_error",
                "message": "A database connectivity error occurred. Please try again later."
            }), 503

    @app.before_request
    def before_request():
        if request.path == '/' and request.method == 'GET':
            return
        app.logger.debug(f"Processing request: {request.method} {request.path}")
    
    @app.route('/', methods=['GET'])
    def root():
        """Root endpoint - returns API info without redirect to prevent loops."""
        return jsonify({
            "service": "Mizizzi E-commerce API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "health": "/api/health-check",
                "products": "/api/products",
                "cart": "/api/cart",
                "orders": "/api/orders",
                "admin": "/api/admin",
                "meilisearch": "/api/meilisearch",
                "auth": "/api/auth",
                "admin_auth": "/api/admin/auth"
            }
        }), 200
    
    @app.after_request
    def ensure_cors_credentials(response):
        try:
            origin = request.headers.get('Origin')
            allowed = app.config.get('CORS_ORIGINS', []) or []

            if origin:
                if '*' in allowed or origin in allowed:
                    response.headers['Access-Control-Allow-Origin'] = origin
                    response.headers['Access-Control-Allow-Credentials'] = 'true'

            if 'Access-Control-Allow-Credentials' not in response.headers:
                response.headers['Access-Control-Allow-Credentials'] = 'true'
        except Exception:
            pass
        return response

    # --- DB availability cache/helper (to avoid repeated heavy checks) ---
    _db_check_cache = {"ts": 0.0, "available": False}
    DB_CHECK_TTL = float(os.environ.get("DB_CHECK_TTL_SEC", "5"))

    def is_db_available(force=False):
        """Return True if DB reachable. Cache result for DB_CHECK_TTL seconds."""
        try:
            now = time()
            if not force and (now - _db_check_cache["ts"] < DB_CHECK_TTL):
                return _db_check_cache["available"]

            with app.app_context():
                try:
                    conn = db.engine.connect()
                    conn.close()
                    _db_check_cache.update({"ts": now, "available": True})
                    return True
                except Exception:
                    _db_check_cache.update({"ts": now, "available": False})
                    return False
        except Exception:
            # If anything unexpected happens, assume DB unavailable to be safe
            _db_check_cache.update({"ts": time(), "available": False})
            return False

    # Expose helper on app for debugging/testing
    app.is_db_available = is_db_available

    # Short-circuit APIs when DB is unavailable to avoid repeated 500 logs.
    @app.before_request
    def short_circuit_when_db_unavailable():
        # Allow non-API requests, health checks and static files to proceed
        path = (request.path or "").lower()
        if path in ("/", "/api/health-check", "/api/health", "/api/admin/dashboard/health"):
            return None

        # Only short-circuit API routes; leave non-API endpoints alone
        if path.startswith("/api"):
            if not is_db_available():
                # Return a clear 503 JSON indicating DB problem — clients can handle retry.
                return jsonify({
                    "error": "database_unavailable",
                    "message": "Database is currently unavailable. Please try again later.",
                    "retry_after_seconds": DB_CHECK_TTL
                }), 503
        return None

    app.logger.info(f"Application created successfully with config: {config_name}")
    return app

# Initialize Flask app factory
def create_app_with_search():
    """Create Flask app (Meilisearch handles search)."""
    try:
        # Use the directly imported create_app function
        app = create_app()
        
        with app.app_context():
            app.logger.info("✅ App initialized - Meilisearch handles search.")
        
        return app
        
    except Exception as e:
        logger.error(f"Error creating app: {str(e)}")
        
        try:
            # Fallback to calling create_app directly again
            return create_app()
        except Exception as fallback_error:
            logger.error(f"Fallback app creation failed: {str(fallback_error)}")
            # As a last resort, return a minimal Flask app to avoid import-time crashes.
            try:
                fallback_app = Flask(__name__)
                # Apply minimal default configuration if available
                if isinstance(config, dict) and 'default' in config:
                    try:
                        fallback_app.config.from_object(config['default'])
                    except Exception:
                        pass
                logger.info("Created minimal fallback Flask app")
                return fallback_app
            except Exception as final_err:
                logger.error(f"Unable to create fallback Flask app: {str(final_err)}")
                return None
