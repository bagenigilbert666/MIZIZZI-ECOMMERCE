"""
JWT Configuration Module - Centralized JWT setup and handlers
"""

from flask_jwt_extended import JWTManager, get_jwt_identity
from flask import jsonify, request


def setup_jwt(app):
    """
    Initialize JWT manager and register all JWT-related callbacks.
    
    Args:
        app: Flask application instance
    """
    jwt = JWTManager(app)
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if JWT token is revoked/blacklisted."""
        try:
            from app.routes.admin.admin_auth import is_token_blacklisted
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
        """Handle expired token response."""
        return jsonify({
            "error": "Token has expired",
            "code": "token_expired"
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid token response."""
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
        """Handle missing token response."""
        return jsonify({
            "error": "Authorization required",
            "code": "authorization_required"
        }), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        """Handle non-fresh token response."""
        return jsonify({
            "error": "Fresh token required",
            "code": "fresh_token_required"
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Handle revoked token response."""
        return jsonify({
            "error": "Token has been revoked",
            "code": "token_revoked"
        }), 401
    
    return jwt
