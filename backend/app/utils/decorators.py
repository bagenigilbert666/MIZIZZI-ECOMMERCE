"""
Application Decorators Module - Reusable decorators for route handlers
"""

from functools import wraps
from flask import g, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from uuid import uuid4


def jwt_optional(app, get_or_create_guest_cart_func):
    """
    Create a JWT optional decorator that allows requests with or without valid JWT.
    Sets g.user_id and g.is_authenticated based on JWT validity.
    Creates guest cart for unauthenticated users.
    
    Args:
        app: Flask application instance (for logging)
        get_or_create_guest_cart_func: Function to create/retrieve guest cart
    
    Returns:
        Decorator function
    """
    def decorator(fn):
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
                    g.guest_cart = get_or_create_guest_cart_func()
            except Exception as e:
                app.logger.error(f"JWT error: {str(e)}")
                g.is_authenticated = False
                g.guest_cart = get_or_create_guest_cart_func()
            
            return fn(*args, **kwargs)
        return wrapper
    
    return decorator
