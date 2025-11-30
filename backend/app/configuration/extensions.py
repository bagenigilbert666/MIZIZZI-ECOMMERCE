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
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per hour"],  # Default: 1000 requests per hour per IP
    storage_uri="memory://",  # Use in-memory storage
    in_memory_fallback_enabled=True  # Fallback if storage unavailable
)

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
    
    # Rate limiting
    try:
        limiter_storage = app.config.get('RATELIMIT_STORAGE_URI', app.config.get('REDIS_URL', 'memory://'))
        limiter.init_app(
            app,
            key_func=get_remote_address,
            default_limits=[app.config.get('RATELIMIT_DEFAULT', '1000 per hour')],
            storage_uri=limiter_storage,
            in_memory_fallback_enabled=app.config.get('RATELIMIT_IN_MEMORY_FALLBACK_ENABLED', True)
        )
        logger.info(f"Rate limiter initialized with default: {app.config.get('RATELIMIT_DEFAULT', '1000 per hour')} using storage: {limiter_storage}")
    except Exception as e:
        logger.error(f"Error initializing rate limiter: {e}")
        # Continue anyway, limiter may already be initialized
    
    logger.info("All extensions initialized successfully")
    
    return app
