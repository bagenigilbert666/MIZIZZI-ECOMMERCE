"""
Cart Utilities Module - Guest cart helper functions
"""

from flask import request
import uuid


def get_or_create_guest_cart(db, app):
    """
    Get an existing guest cart or create a new one.
    Uses cookies to track guest cart across requests.
    
    Args:
        db: SQLAlchemy database instance
        app: Flask application instance (for logging)
    
    Returns:
        Cart object (authenticated or guest)
    """
    try:
        from app.models.models import Cart
    except ImportError:
        try:
            from models.models import Cart
        except ImportError:
            # Fallback cart class if models not available
            class Cart:
                def __init__(self, guest_id=None):
                    self.guest_id = guest_id
                    self.is_active = True
            
            return Cart(guest_id=str(uuid.uuid4()))
    
    # Try to get existing guest cart from cookies
    guest_cart_id = request.cookies.get('guest_cart_id')
    if guest_cart_id:
        cart = Cart.query.filter_by(guest_id=guest_cart_id, is_active=True).first()
        if cart:
            return cart
    
    # Create new guest cart
    guest_id = str(uuid.uuid4())
    cart = Cart(guest_id=guest_id, is_active=True)
    
    try:
        db.session.add(cart)
        db.session.commit()
        app.logger.info(f"Created new guest cart: {guest_id}")
    except Exception as e:
        app.logger.error(f"Error creating guest cart: {str(e)}")
        db.session.rollback()
    
    return cart
