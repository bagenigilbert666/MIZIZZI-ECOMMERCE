"""
Flask extensions for Mizizzi E-commerce platform.
Initializes and configures all required extensions.
"""
from flask import request  # Added missing request import
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_caching import Cache
from flask_cors import CORS
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from limits.strategies import FixedWindowRateLimiter, MovingWindowRateLimiter
from limits.storage import MemoryStorage
import logging
import os  # added

# Setup logger
logger = logging.getLogger(__name__)

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()
jwt = JWTManager()
mail = Mail()
cache = Cache()
cors = CORS()
migrate = Migrate()

# Limiter - Initialize WITHOUT key_func (will be passed to init_app instead)
# This is compatible with flask-limiter versions that expect key_func in init_app, not __init__
limiter = Limiter(
    default_limits=["1000 per hour"],  # Default: 1000 requests per hour per IP
    storage_uri="memory://",  # Start with safe memory storage
    in_memory_fallback_enabled=True,  # Use memory when primary storage fails
)

def ensure_db_bound(app):
    """
    Ensure the SQLAlchemy instance is bound to the given Flask app.
    This is defensive: it sets common internal attributes and briefly
    pushes an app context and touches the engine so that modules which
    run DB init at import time will find a registered app.
    """
    try:
        # Ensure init_app has been called at least once
        try:
            db.init_app(app)
        except Exception:
            # init_app may have been called elsewhere; continue to attempt binding
            pass

        # Try to set common internal attributes used by different SQLAlchemy versions
        try:
            if getattr(db, "app", None) is None:
                setattr(db, "app", app)
        except Exception:
            pass
        try:
            if getattr(db, "_app", None) is None:
                setattr(db, "_app", app)
        except Exception:
            pass

        # Briefly push an app context and touch the engine/session to force registration
        try:
            ctx = app.app_context()
            ctx.push()
            # Touch engine or session to ensure binding (handles several flask-sqlalchemy versions)
            try:
                # Preferred: public accessor
                _ = db.get_engine(app)
            except Exception:
                try:
                    # Older/newer variants: engine attribute
                    _ = getattr(db, "engine", None)
                except Exception:
                    pass
            # No return value; context stays pushed only while we need it
            ctx.pop()
        except Exception as e:
            logger.debug(f"Could not push app context to bind DB: {e}")
    except Exception as e:
        logger.debug(f"ensure_db_bound encountered an error: {e}")

def init_extensions(app):
    """Initialize all Flask extensions."""
    # Ensure SQLALCHEMY_DATABASE_URI is set (use DATABASE_URL if provided)
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        db_url = app.config.get('DATABASE_URL') or os.environ.get('DATABASE_URL')
        if db_url:
            app.config['SQLALCHEMY_DATABASE_URI'] = db_url
            logger.info("SQLALCHEMY_DATABASE_URI set from DATABASE_URL")
        else:
            logger.warning("No DATABASE_URL found; SQLALCHEMY_DATABASE_URI not set — database init may fail")

    # Set sensible defaults
    app.config.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', False)

    # Database
    db.init_app(app)

    # Ensure the SQLAlchemy instance is properly bound for early import-time DB ops
    try:
        ensure_db_bound(app)
        logger.debug("SQLAlchemy instance bound to app (ensure_db_bound).")
    except Exception as e:
        logger.warning(f"Unable to fully bind SQLAlchemy instance to app: {e}")

    # Marshmallow
    ma.init_app(app)
    
    # JWT
    jwt.init_app(app)
    
    # Mail
    mail.init_app(app)
    
    # Cache
    cache_config = {
        'CACHE_TYPE': app.config.get('CACHE_TYPE', 'simple'),
        'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_DEFAULT_TIMEOUT', 300)
    }
    cache.init_app(app, config=cache_config)
    
    # Normalize CORS origins (accept list or comma-separated string), strip trailing slashes and dedupe
    def _sanitize_origins(raw):
        out = []
        seen = set()
        if not raw:
            return out
        if isinstance(raw, str):
            items = [i.strip() for i in raw.split(',') if i.strip()]
        elif isinstance(raw, (list, tuple, set)):
            items = list(raw)
        else:
            items = [raw]
        for u in items:
            if not isinstance(u, str):
                continue
            norm = u.rstrip('/')
            if norm and norm not in seen:
                seen.add(norm)
                out.append(norm)
        return out
    
    raw_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000'])
    origins = _sanitize_origins(raw_origins)
    if not origins:
        # fallback to localhost if nothing provided
        origins = ['http://localhost:3000']

    app.logger.info(f"Configured CORS origins: {origins}")

    cors.init_app(
        app,
        resources={r"/*": {"origins": origins}},
        supports_credentials=app.config.get('CORS_SUPPORTS_CREDENTIALS', True),
        allow_headers=app.config.get('CORS_ALLOW_HEADERS', [
            'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
            'Origin', 'X-CSRF-TOKEN', 'X-CSRF-Token', 'Cache-Control'
        ]),
        expose_headers=app.config.get('CORS_EXPOSE_HEADERS', ['Content-Range', 'X-Content-Range']),
        methods=app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD']),
        max_age=app.config.get('CORS_MAX_AGE', 86400)
    )
    
    # Migrations
    migrate.init_app(app, db)
    
    # Rate limiting - Initialize with proper signature for installed flask-limiter version
    try:
        limiter_storage_uri = app.config.get('RATELIMIT_STORAGE_URI', 'memory://')
        
        # Init app with key_func parameter (correct position for this version)
        # Uses in_memory_fallback_enabled=True so limiter works even if primary storage fails
        limiter.init_app(app, key_func=get_remote_address)
        
        logger.info(f"✅ Rate limiter initialized successfully")
        logger.info(f"   Storage: {limiter_storage_uri}")
        logger.info(f"   Default limit: {app.config.get('RATELIMIT_DEFAULT', '1000 per hour')}")
        
    except TypeError as e:
        # Specific handling for signature mismatch
        if "key_func" in str(e):
            logger.warning(f"Rate limiter key_func parameter not supported, using default: {e}")
            try:
                limiter.init_app(app)
            except Exception as fallback_error:
                logger.error(f"Rate limiter fallback init failed: {fallback_error}")
        else:
            raise
    except Exception as e:
        logger.warning(f"⚠️  Rate limiter initialization warning (non-critical): {e}")
        try:
            limiter.init_app(app)
        except Exception as fallback_error:
            logger.warning(f"Rate limiter fallback also failed: {fallback_error}")

    
    logger.info("All extensions initialized successfully")
    
    return app
