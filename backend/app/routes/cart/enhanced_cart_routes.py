"""
Enhanced Cart Routes with Redis Caching and Performance Optimization
Provides improved performance for cart operations while maintaining data accuracy.
Integrates seamlessly with existing cart routes.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
import json
import uuid

from app.cache.cart_cache import get_cart_cache_manager
from app.cache.redis_client import get_redis_client
from ...models.models import Cart, CartItem, Product, ProductVariant, db

logger = logging.getLogger(__name__)

# Create enhanced cart routes blueprint
enhanced_cart_routes = Blueprint('enhanced_cart_routes', __name__)
cart_cache = get_cart_cache_manager()

# ==================== HELPER FUNCTIONS ====================

def get_product_info_cached(product_id: int) -> dict:
    """
    Get product info from cache or database.
    Used for cart calculations to avoid repeated DB queries.
    
    Args:
        product_id: Product ID
        
    Returns:
        Product information dictionary
    """
    # Try cache first
    cached_product = cart_cache.get_product_cache(product_id)
    if cached_product:
        return cached_product
    
    # Fetch from database
    try:
        product = Product.query.get(product_id)
        if not product:
            return None
        
        product_info = {
            'id': product.id,
            'name': product.name,
            'price': float(product.price) if product.price else 0,
            'sale_price': float(product.sale_price) if product.sale_price else None,
            'stock': product.stock,
            'sku': product.sku,
            'thumbnail_url': product.thumbnail_url,
            'is_digital': getattr(product, 'is_digital', False),
            'requires_shipping': getattr(product, 'requires_shipping', True)
        }
        
        # Cache for future use
        cart_cache.cache_product_data(product_id, product_info)
        
        return product_info
    except Exception as e:
        logger.error(f"Error fetching product {product_id}: {e}")
        return None


def calculate_cart_totals(cart: Cart, items: list) -> dict:
    """
    Calculate cart totals dynamically using cached product data.
    This ensures accuracy while leveraging Redis cache.
    
    Args:
        cart: Cart object
        items: List of CartItem objects
        
    Returns:
        Dictionary with calculated totals
    """
    subtotal = 0
    total_items = 0
    item_count = 0
    requires_shipping = False
    
    for item in items:
        product_info = get_product_info_cached(item.product_id)
        if product_info:
            # Use sale_price if available, otherwise use regular price
            price = product_info.get('sale_price') or product_info.get('price', 0)
            subtotal += price * item.quantity
            total_items += item.quantity
            
            if product_info.get('requires_shipping'):
                requires_shipping = True
    
    # Calculate tax (example: 10% tax)
    tax = subtotal * 0.0  # Set to 0 if no tax, modify as needed
    
    # Calculate shipping (example: Ksh 0 if digital-only, else Ksh 200)
    shipping = 0 if not requires_shipping else 200
    
    # Calculate discount from coupon
    discount = cart.discount or 0
    
    # Calculate final total
    total = subtotal + tax + shipping - discount
    if total < 0:
        total = 0
    
    return {
        'subtotal': subtotal,
        'tax': tax,
        'shipping': shipping,
        'discount': discount,
        'total': total,
        'item_count': total_items,
        'quantity_count': item_count,
        'requires_shipping': requires_shipping
    }


# ==================== GUEST CART ENDPOINTS ====================

@enhanced_cart_routes.route('/guest/cart', methods=['GET'])
def get_guest_cart():
    """
    Get guest cart from Redis.
    
    Query params:
        - guest_id: Unique guest session ID
    
    Returns:
        Guest cart data with items and totals
    """
    try:
        guest_id = request.args.get('guest_id')
        if not guest_id:
            return jsonify({
                'success': False,
                'error': 'guest_id parameter required'
            }), 400
        
        # Get guest cart from Redis
        cart_data = cart_cache.get_guest_cart(guest_id)
        
        if not cart_data:
            return jsonify({
                'success': True,
                'message': 'No cart found for guest session',
                'guest_id': guest_id,
                'items': [],
                'totals': {
                    'subtotal': 0,
                    'tax': 0,
                    'shipping': 0,
                    'discount': 0,
                    'total': 0,
                    'item_count': 0
                }
            })
        
        return jsonify({
            'success': True,
            'guest_id': guest_id,
            'items': cart_data.get('items', []),
            'totals': cart_data.get('totals', {}),
            'coupon_code': cart_data.get('coupon_code'),
            'created_at': cart_data.get('created_at'),
            'expires_at': cart_data.get('expires_at'),
            'X-Cache': 'HIT'
        })
    
    except Exception as e:
        logger.error(f"Error getting guest cart: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve guest cart',
            'details': str(e)
        }), 500


@enhanced_cart_routes.route('/guest/cart', methods=['POST'])
def create_guest_cart():
    """
    Create or update guest cart in Redis.
    
    Request body:
        - items: List of cart items
        - coupon_code: Optional coupon code
    
    Returns:
        New guest cart data with generated session ID
    """
    try:
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        items = data.get('items', [])
        coupon_code = data.get('coupon_code')
        
        # Generate unique guest session ID
        guest_id = str(uuid.uuid4())
        
        # Create cart data structure
        cart_data = {
            'guest_id': guest_id,
            'items': items,
            'coupon_code': coupon_code,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(hours=24)).isoformat(),
            'totals': {
                'subtotal': sum(item.get('price', 0) * item.get('quantity', 1) for item in items),
                'tax': 0,
                'shipping': 200,  # Default shipping
                'discount': 0,
                'total': 0,
                'item_count': len(items)
            }
        }
        
        # Calculate final total
        cart_data['totals']['total'] = (
            cart_data['totals']['subtotal'] +
            cart_data['totals']['tax'] +
            cart_data['totals']['shipping'] -
            cart_data['totals']['discount']
        )
        
        # Save to Redis
        success = cart_cache.save_guest_cart(guest_id, cart_data)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to create guest cart'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'Guest cart created',
            'guest_id': guest_id,
            'cart': cart_data,
            'ttl_seconds': 86400  # 24 hours
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating guest cart: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to create guest cart',
            'details': str(e)
        }), 500


@enhanced_cart_routes.route('/guest/cart/<guest_id>', methods=['DELETE'])
def delete_guest_cart(guest_id):
    """
    Delete guest cart (e.g., after conversion to logged-in user).
    
    Args:
        guest_id: Guest session ID
    
    Returns:
        Success confirmation
    """
    try:
        success = cart_cache.delete_guest_cart(guest_id)
        
        return jsonify({
            'success': success,
            'message': 'Guest cart deleted' if success else 'Guest cart not found',
            'guest_id': guest_id
        })
    
    except Exception as e:
        logger.error(f"Error deleting guest cart {guest_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete guest cart',
            'details': str(e)
        }), 500


# ==================== OPTIMIZED CART RETRIEVAL ====================

@enhanced_cart_routes.route('/optimized', methods=['GET'])
@jwt_required()
def get_optimized_cart():
    """
    Get optimized cart with cached product data.
    Much faster than full cart load because product data comes from Redis.
    
    Returns:
        Cart data with optimized product lookups
    """
    user_id = get_jwt_identity()
    
    try:
        # Get cart from database
        cart = Cart.query.filter_by(user_id=user_id, is_active=True).first()
        
        if not cart:
            return jsonify({
                'success': True,
                'message': 'No active cart',
                'items': [],
                'totals': {
                    'subtotal': 0,
                    'tax': 0,
                    'shipping': 0,
                    'discount': 0,
                    'total': 0,
                    'item_count': 0
                }
            })
        
        # Get cart items
        cart_items = CartItem.query.filter_by(cart_id=cart.id).all()
        
        # Build items list with cached product data
        items = []
        for cart_item in cart_items:
            product_info = get_product_info_cached(cart_item.product_id)
            if product_info:
                items.append({
                    'id': cart_item.id,
                    'product_id': cart_item.product_id,
                    'quantity': cart_item.quantity,
                    'price': cart_item.price,
                    'product': product_info
                })
        
        # Calculate totals dynamically
        totals = calculate_cart_totals(cart, cart_items)
        
        return jsonify({
            'success': True,
            'cart_id': cart.id,
            'user_id': user_id,
            'items': items,
            'totals': totals,
            'coupon_code': cart.coupon_code,
            'X-Cache': 'PARTIAL_HIT'  # Product data from cache
        })
    
    except Exception as e:
        logger.error(f"Error getting optimized cart: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve cart',
            'details': str(e)
        }), 500


# ==================== CACHE INVALIDATION ====================

@enhanced_cart_routes.route('/cache/invalidate/product/<int:product_id>', methods=['POST'])
def invalidate_product_cache(product_id):
    """
    Invalidate cached product data (admin endpoint).
    Call this after updating product price/inventory.
    
    Args:
        product_id: Product ID to invalidate
    
    Returns:
        Success confirmation
    """
    try:
        # In production, add admin authentication check
        success = cart_cache.invalidate_product_cache(product_id)
        
        return jsonify({
            'success': success,
            'message': 'Product cache invalidated' if success else 'Failed to invalidate cache',
            'product_id': product_id
        })
    
    except Exception as e:
        logger.error(f"Error invalidating product cache {product_id}: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to invalidate cache',
            'details': str(e)
        }), 500


# ==================== HEALTH & MONITORING ====================

@enhanced_cart_routes.route('/cache/stats', methods=['GET'])
def get_cart_cache_stats():
    """
    Get cart caching statistics.
    
    Returns:
        Cache configuration and stats
    """
    try:
        stats = cart_cache.get_cache_stats()
        
        return jsonify({
            'success': True,
            'cache_stats': stats,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get cache stats',
            'details': str(e)
        }), 500
