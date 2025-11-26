"""
Featured product routes for specific sections like Trending, Top Picks, etc.
"""
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import desc, func
from app.models.models import Product, ProductImage
from app.configuration.extensions import db

featured_routes = Blueprint('featured_routes', __name__)

def serialize_simple_product(product):
    """Simplified serialization for list views"""
    # Get primary image or first image
    image_url = None
    if product.image_urls:
        if isinstance(product.image_urls, list) and len(product.image_urls) > 0:
            image_url = product.image_urls[0]
        elif isinstance(product.image_urls, str):
            image_url = product.image_urls.split(',')[0]
            
    # Fallback to thumbnail
    if not image_url and product.thumbnail_url:
        image_url = product.thumbnail_url

    return {
        'id': product.id,
        'name': product.name,
        'slug': product.slug,
        'price': float(product.price) if product.price else 0,
        'sale_price': float(product.sale_price) if product.sale_price else None,
        'stock': product.stock,
        'image_urls': [image_url] if image_url else [],
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
        'rating': 4.5, # Mock rating if not in model, or fetch from reviews
        'review_count': 10 # Mock count
    }

@featured_routes.route('/trending', methods=['GET'])
def get_trending():
    """Get trending products (is_trending=True or sorted by popularity)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        # Try to get manually marked trending products first
        products = Product.query.filter_by(
            is_active=True, 
            is_visible=True,
            is_trending=True
        ).limit(limit).all()
        
        # Fallback to popularity/views if no manual trending products
        if not products:
            # Assuming 'views' or similar exists, otherwise use random or created_at
            products = Product.query.filter_by(
                is_active=True, 
                is_visible=True
            ).order_by(func.random()).limit(limit).all()
            
        return jsonify([serialize_simple_product(p) for p in products]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching trending: {str(e)}")
        return jsonify({'error': 'Failed to fetch trending products'}), 500

@featured_routes.route('/top-picks', methods=['GET'])
def get_top_picks():
    """Get top pick products (is_top_pick=True or sorted by rating)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = Product.query.filter_by(
            is_active=True, 
            is_visible=True,
            is_top_pick=True
        ).limit(limit).all()
        
        if not products:
            # Fallback to highest price or rating
            products = Product.query.filter_by(
                is_active=True, 
                is_visible=True
            ).order_by(Product.price.desc()).limit(limit).all()
            
        return jsonify([serialize_simple_product(p) for p in products]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching top picks: {str(e)}")
        return jsonify({'error': 'Failed to fetch top picks'}), 500

@featured_routes.route('/new-arrivals', methods=['GET'])
def get_new_arrivals():
    """Get new arrival products (is_new_arrival=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = Product.query.filter_by(
            is_active=True, 
            is_visible=True,
            is_new_arrival=True
        ).limit(limit).all()
        
        # If no products are marked as new arrivals, return empty list
            
        return jsonify([serialize_simple_product(p) for p in products]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching new arrivals: {str(e)}")
        return jsonify({'error': 'Failed to fetch new arrivals'}), 500

@featured_routes.route('/daily-finds', methods=['GET'])
def get_daily_finds():
    """Get daily find products (is_daily_find=True)"""
    try:
        limit = request.args.get('limit', 12, type=int)
        
        products = Product.query.filter_by(
            is_active=True, 
            is_visible=True,
            is_daily_find=True
        ).limit(limit).all()
        
        if not products:
            # Fallback to flash sales
            products = Product.query.filter_by(
                is_active=True, 
                is_visible=True,
                is_flash_sale=True
            ).limit(limit).all()
            
        return jsonify([serialize_simple_product(p) for p in products]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching daily finds: {str(e)}")
        return jsonify({'error': 'Failed to fetch daily finds'}), 500
