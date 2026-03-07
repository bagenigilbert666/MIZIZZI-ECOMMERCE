"""
CORS Configuration Module - Centralized CORS setup and preflight handling
"""

from flask_cors import CORS
from flask import jsonify, request, make_response


def setup_cors(app):
    """
    Configure CORS for the Flask application with proper preflight handling.
    
    Args:
        app: Flask application instance
    """
    cors_origins = app.config.get('CORS_ORIGINS', [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://mizizzi-shop.vercel.app'
    ])
    
    CORS(
        app,
        origins=cors_origins,
        supports_credentials=True,
        allow_headers=[
            "Content-Type", "Authorization", "X-Requested-With",
            "Cache-Control", "cache-control", "Pragma", "Expires",
            "X-MFA-Token", "Accept", "Origin"
        ],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=[
            "Content-Range", "X-Content-Range", "X-Cache",
            "X-Cache-Time-Ms", "X-Response-Time-Ms",
            "X-Products-Cached", "X-All-Products-Cache"
        ],
        send_wildcard=False,
        vary_header=True
    )
    
    @app.before_request
    def handle_options_preflight():
        """Handle CORS preflight OPTIONS requests."""
        if request.method != 'OPTIONS':
            return None
        
        response = make_response(jsonify({'status': 'ok'}), 200)
        
        origin = request.headers.get('Origin')
        allowed_origins = app.config.get('CORS_ORIGINS', cors_origins)
        
        if origin and ("*" in allowed_origins or origin in allowed_origins):
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = ','.join(allowed_origins)
        
        response.headers['Access-Control-Allow-Headers'] = (
            'Content-Type, Authorization, X-Requested-With, X-MFA-Token, '
            'Accept, Origin, Cache-Control, cache-control, Pragma, Expires'
        )
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Vary'] = 'Origin'
        
        return response
