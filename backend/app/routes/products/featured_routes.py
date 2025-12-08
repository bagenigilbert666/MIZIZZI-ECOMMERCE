"""
Featured product routes for specific sections like Trending, Top Picks, etc.
OPTIMIZED with Redis caching and lightweight JSON responses.
"""
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import desc, func
from sqlalchemy.orm import load_only
from datetime import datetime

from app.models.models import Product, ProductImage
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache, cached_response

featured_routes = Blueprint('featured_routes', __name__)


def serialize_simple_product(product):
    """
    FAST: Lightweight serialization for list views.
    Returns only essential fields for maximum speed.
    """
    # Get primary image or first image
    image_url = None
    if product.thumbnail_url:
        image_url = product.thumbnail_url
    elif hasattr(product, 'image_urls') and product.image_urls:
        if isinstance(product.image_urls, list) and len(product.image_urls) > 0:
            image_url = product.image_urls[0]
        elif isinstance(product.image_urls, str):
            image_url = product.image_urls.split(',')[0]

    return {
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'price': float(product.price) if product.price else 0,
        'sale_price': float(product.sale_price) if product.sale_price else None,
        'stock': product.stock,
        'image_url': image_url,
        'thumbnail_url': image_url,
        'is_new': product.is_new,
        'is_sale': product.is_sale,
        'is_featured': product.is_featured,
        'is_flash_sale': product.is_flash_sale,
        'is_luxury_deal': product.is_luxury_deal,
        'is_trending': product.is_trending,
        'is_top_pick': product.is_top_pick,
        'is_daily_find': product.is_daily_find,
        'is_new_arrival': product.is_new_arrival,
        'discount_percentage': product.discount_percentage,
        'rating': 4.5,
        'review_count': 10
    }


def get_optimized_product_query():
    """Return a query with optimized column loading."""
    return Product.query.options(
        load_only(
            Product.id, Product.name, Product.slug, Product.price,
            Product.sale_price, Product.stock, Product.thumbnail_url,
            Product.image_urls, Product.discount_percentage,
            Product.is_new, Product.is_sale, Product.is_featured,
            Product.is_flash_sale, Product.is_luxury_deal, Product.is_trending,
            Product.is_top_pick, Product.is_daily_find, Product.is_new_arrival,
            Product.is_active, Product.is_visible
        )
    )


@featured_routes.route('/trending', methods=['GET'])
@cached_response("featured_trending", ttl=30, key_params=["limit"])
def get_trending():
    """Get trending products (is_trending=True or sorted by popularity)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        # Optimized query with indexed columns
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_trending == True
        ).limit(limit).all()
        
        # Fallback to random if no trending products
        if not products:
            products = get_optimized_product_query().filter(
                Product.is_active == True, 
                Product.is_visible == True
            ).order_by(func.random()).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching trending: {str(e)}")
        return jsonify({'error': 'Failed to fetch trending products'}), 500


@featured_routes.route('/top-picks', methods=['GET'])
@cached_response("featured_top_picks", ttl=30, key_params=["limit"])
def get_top_picks():
    """Get top pick products (is_top_pick=True or sorted by rating)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_top_pick == True
        ).limit(limit).all()
        
        if not products:
            # Fallback to highest price
            products = get_optimized_product_query().filter(
                Product.is_active == True, 
                Product.is_visible == True
            ).order_by(Product.price.desc()).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching top picks: {str(e)}")
        return jsonify({'error': 'Failed to fetch top picks'}), 500


@featured_routes.route('/new-arrivals', methods=['GET'])
@cached_response("featured_new_arrivals", ttl=30, key_params=["limit"])
def get_new_arrivals():
    """Get new arrival products (is_new_arrival=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_new_arrival == True
        ).order_by(Product.created_at.desc()).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching new arrivals: {str(e)}")
        return jsonify({'error': 'Failed to fetch new arrivals'}), 500


@featured_routes.route('/daily-finds', methods=['GET'])
@cached_response("featured_daily_finds", ttl=30, key_params=["limit"])
def get_daily_finds():
    """Get daily find products (is_daily_find=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_daily_find == True
        ).limit(limit).all()
        
        if not products:
            # Fallback to flash sales
            products = get_optimized_product_query().filter(
                Product.is_active == True, 
                Product.is_visible == True,
                Product.is_flash_sale == True
            ).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching daily finds: {str(e)}")
        return jsonify({'error': 'Failed to fetch daily finds'}), 500


@featured_routes.route('/flash-sale', methods=['GET'])
@cached_response("featured_flash_sale", ttl=30, key_params=["limit"])
def get_flash_sale():
    """Get flash sale products (is_flash_sale=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_flash_sale == True
        ).order_by(Product.discount_percentage.desc()).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching flash sale: {str(e)}")
        return jsonify({'error': 'Failed to fetch flash sale products'}), 500


@featured_routes.route('/luxury-deals', methods=['GET'])
@cached_response("featured_luxury_deals", ttl=30, key_params=["limit"])
def get_luxury_deals():
    """Get luxury deal products (is_luxury_deal=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = get_optimized_product_query().filter(
            Product.is_active == True, 
            Product.is_visible == True,
            Product.is_luxury_deal == True
        ).order_by(Product.created_at.desc()).limit(limit).all()
            
        return jsonify({
            'items': [serialize_simple_product(p) for p in products],
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching luxury deals: {str(e)}")
        return jsonify({'error': 'Failed to fetch luxury deals'}), 500


# ----------------------
# Cache Status Endpoint
# ----------------------

@featured_routes.route('/cache-status', methods=['GET'])
def featured_cache_status():
    """Get cache status for featured routes."""
    return jsonify({
        'connected': product_cache.is_connected,
        'type': 'redis' if product_cache.is_connected else 'memory',
        'stats': product_cache.stats,
        'timestamp': datetime.utcnow().isoformat()
    }), 200
