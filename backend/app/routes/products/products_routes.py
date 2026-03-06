"""
User-facing products routes for Mizizzi E-commerce platform.
Handles public product viewing, searching, and browsing functionality.
OPTIMIZED with Upstash Redis caching and lightweight JSON responses.
"""
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from sqlalchemy import or_, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import load_only, joinedload
from datetime import datetime
import re
import time
import threading
import json

from app.configuration.extensions import db, limiter
from app.models.models import (
    Product, ProductVariant, ProductImage, Category, Brand,
    User, UserRole
)
from app.utils.redis_cache import (
    product_cache,
    cached_response,
    fast_cached_response,
    invalidate_on_change,
    fast_json_dumps
)

# Import unified serializers and cache keys
from .serializers import (
    serialize_product_detail,
    serialize_product_list,
    serialize_product_minimal,
    serialize_variant,
    serialize_image,
    get_product_with_relationships,
    get_product_by_slug_with_relationships
)
from .cache_keys import (
    get_public_product_key,
    get_public_product_slug_key,
    get_public_category_key,
    get_public_featured_key,
    CACHE_TTL
)

# Import cache utilities for shared list logic
from .cache_utils import (
    normalize_bool_param,
    extract_filter_params,
    build_cache_key_for_filters,
    apply_product_filters,
    build_pagination_response,
    safe_cache_get,
    safe_cache_set
)
from app.validations.validation import admin_required

# Create blueprint for user-facing product routes
products_routes = Blueprint('products_routes', __name__, url_prefix='/api/products')

# Cache warming state
_cache_warming_state = {
    'last_warmed': None,
    'is_warming': False,
    'products_cached': 0,
    'categories_cached': [],
    'warm_errors': []
}

# ----------------------
# Lightweight Serializers (Wrapper functions for backwards compatibility)
# ----------------------

def serialize_product_lightweight(product):
    """
    FAST: Lightweight serialization for list views.
    Wrapper for centralized serialize_product_list function.
    """
    return serialize_product_list(product)


def serialize_product(product, include_variants=False, include_images=False):
    """
    Wrapper for unified serializer - public view (for_admin=False).
    Uses centralized serialize_product_detail function.
    """
    return serialize_product_detail(product, for_admin=False)


# serialize_variant and serialize_image are now imported from serializers.py

def is_admin_user():
    """Check if the current user is an admin."""
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()

        if not current_user_id:
            return False

        user = db.session.get(User, current_user_id)
        return user and user.role == UserRole.ADMIN
    except Exception:
        return False

# ----------------------
# Health Check
# ----------------------

@products_routes.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for products service."""
    try:
        cache_connected = getattr(product_cache, 'is_connected', False)
        cache_type = 'upstash' if cache_connected else 'memory'
    except Exception:
        cache_connected = False
        cache_type = 'memory'

    return jsonify({
        'status': 'ok',
        'service': 'products_routes',
        'cache_connected': bool(cache_connected),
        'cache_type': cache_type,
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ----------------------
# Cache Management Endpoints - ENHANCED
# ----------------------

@products_routes.route('/cache/status', methods=['GET'])
def cache_status():
    """Get comprehensive cache status and info."""
    try:
        connected = getattr(product_cache, 'is_connected', False)
        stats = getattr(product_cache, 'stats', {}) or {}
        cache_type = 'upstash' if connected else 'memory'
    except Exception:
        connected = False
        stats = {}
        cache_type = 'memory'

    return jsonify({
        'connected': bool(connected),
        'type': cache_type,
        'stats': {
            **stats,
            'fast_json': True,
        },
        'warming': {
            'last_warmed': _cache_warming_state['last_warmed'],
            'is_warming': _cache_warming_state['is_warming'],
            'products_cached': _cache_warming_state['products_cached'],
            'categories_cached': _cache_warming_state['categories_cached'],
            'errors': _cache_warming_state['warm_errors'][-5:] if _cache_warming_state['warm_errors'] else []
        },
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@products_routes.route('/cache/invalidate', methods=['POST'])
@admin_required
def invalidate_cache():
    """Invalidate all product caches (admin only)."""
    try:
        total_cleared = product_cache.invalidate_all_products() if product_cache and hasattr(product_cache, 'invalidate_all_products') else 0
    except Exception:
        total_cleared = 0

    return jsonify({
        'success': True,
        'total_cleared': total_cleared,
        'cache_type': 'upstash' if getattr(product_cache, 'is_connected', False) else 'memory'
    }), 200


@products_routes.route('/cache/warm', methods=['POST'])
@admin_required
def warm_cache_endpoint():
    """
    Trigger background cache warming for all featured products.
    This is an admin-only operation.
    This dramatically improves cache hit rates.
    """
    if _cache_warming_state['is_warming']:
        return jsonify({
            'success': False,
            'message': 'Cache warming already in progress',
            'state': _cache_warming_state
        }), 409
    
    # Start cache warming in background with app context
    def warm_cache_background(app):
        with app.app_context():
            try:
                _warm_all_products_cache()
            except Exception as e:
                current_app.logger.error(f"Error in background cache warming: {str(e)}")
                _cache_warming_state['warm_errors'].append(str(e))
    
    thread = threading.Thread(target=warm_cache_background, args=(current_app._get_current_object(),))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'message': 'Cache warming started in background',
        'state': _cache_warming_state
    }), 202


@products_routes.route('/cache/all', methods=['GET'])
def get_all_cached_products():
    """
    Get all products from cache (or warm cache if empty).
    Returns pre-cached products for maximum performance.
    """
    start = time.perf_counter()
    cache_key = "mizizzi:all_products"
    
    # Try to get from cache
    cached = product_cache.get_raw(cache_key) if product_cache and hasattr(product_cache, 'get_raw') else None
    if cached:
        try:
            # Ensure cached is a str
            if isinstance(cached, bytes):
                cached_str = cached.decode('utf-8')
            else:
                cached_str = cached
            payload = json.loads(cached_str)
            # Add alias if missing
            if 'products' not in payload and 'items' in payload:
                payload['products'] = payload['items']
            json_out = json.dumps(payload)
            cache_time = (time.perf_counter() - start) * 1000
            response = Response(json_out, status=200, mimetype='application/json')
            response.headers['X-Cache'] = 'HIT'
            response.headers['X-Cache-Time-Ms'] = str(round(cache_time, 2))
            response.headers['X-All-Products-Cache'] = 'true'
            return response
        except Exception:
            # Fall back to returning raw cached string as-is
            cache_time = (time.perf_counter() - start) * 1000
            response = Response(cached if isinstance(cached, str) else cached.decode('utf-8'), status=200, mimetype='application/json')
            response.headers['X-Cache'] = 'HIT'
            response.headers['X-Cache-Time-Ms'] = str(round(cache_time, 2))
            response.headers['X-All-Products-Cache'] = 'true'
            return response
    
    # Cache miss - fetch and cache all products
    try:
        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.stock, Product.thumbnail_url,
                Product.image_urls, Product.discount_percentage,
                Product.is_featured, Product.is_new, Product.is_sale,
                Product.is_flash_sale, Product.is_luxury_deal, Product.is_trending,
                Product.is_top_pick, Product.is_daily_find, Product.is_new_arrival,
                Product.is_active, Product.is_visible, Product.category_id,
                Product.brand_id, Product.created_at, Product.sort_order
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True
        ).order_by(Product.created_at.desc()).all()
        
        serialized = [serialize_product_lightweight(p) for p in products if p]
        
        data = {
            'items': serialized,
            'products': serialized,
            'total': len(serialized),
            'cached_at': datetime.utcnow().isoformat()
        }
        
        json_str = fast_json_dumps(data)
        if product_cache and hasattr(product_cache, 'set_raw'):
            product_cache.set_raw(cache_key, json_str, ttl=CACHE_TTL.get('all_products', 600))
        
        total_time = (time.perf_counter() - start) * 1000
        response = Response(json_str, status=200, mimetype='application/json')
        response.headers['X-Cache'] = 'MISS'
        response.headers['X-Response-Time-Ms'] = str(round(total_time, 2))
        response.headers['X-Products-Cached'] = str(len(serialized))
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error getting all cached products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@products_routes.route('/cache/warming-status', methods=['GET'])
@admin_required
def get_cache_warming_status():
    """Get the current cache warming status. Admin only."""
    cache_connected = getattr(product_cache, 'is_connected', False)
    cache_stats = getattr(product_cache, 'stats', {})
    
    return jsonify({
        'state': _cache_warming_state,
        'cache_connected': cache_connected,
        'cache_stats': cache_stats,
        'timestamp': datetime.utcnow().isoformat()
    }), 200


def _warm_all_products_cache():
    """Background task to warm the cache with all products."""
    global _cache_warming_state
    
    _cache_warming_state['is_warming'] = True
    _cache_warming_state['warm_errors'] = []
    _cache_warming_state['products_cached'] = 0
    _cache_warming_state['categories_cached'] = []
    
    try:
        from flask import current_app
        app = current_app._get_current_object()
        
        with app.app_context():
            # 1. Cache all products
            products = Product.query.options(
                load_only(
                    Product.id, Product.name, Product.slug, Product.price,
                    Product.sale_price, Product.stock, Product.thumbnail_url,
                    Product.image_urls, Product.discount_percentage,
                    Product.is_featured, Product.is_new, Product.is_sale,
                    Product.is_flash_sale, Product.is_luxury_deal, Product.is_trending,
                    Product.is_top_pick, Product.is_daily_find, Product.is_new_arrival,
                    Product.is_active, Product.is_visible, Product.category_id,
                    Product.brand_id, Product.created_at, Product.sort_order
                )
            ).filter(
                Product.is_active == True,
                Product.is_visible == True
            ).all()
            
            # Cache all products list
            all_serialized = [serialize_product_lightweight(p) for p in products if p]
            all_products_data = {
                'items': all_serialized,
                'products': all_serialized,
                'total': len(all_serialized),
                'cached_at': datetime.utcnow().isoformat()
            }
            if product_cache and hasattr(product_cache, 'set_raw'):
                product_cache.set_raw(
                    "mizizzi:all_products", 
                    fast_json_dumps(all_products_data), 
                    ttl=CACHE_TTL.get('all_products', 600)
                )
            _cache_warming_state['products_cached'] = len(all_serialized)
            
            # 2. Cache by category
            categories = Category.query.all()
            for category in categories:
                try:
                    cat_products = [p for p in products if p.category_id == category.id]
                    if cat_products:
                        cat_serialized = [serialize_product_lightweight(p) for p in cat_products if p]
                        cat_data = {
                            'items': cat_serialized,
                            'products': cat_serialized,
                            'total': len(cat_serialized),
                            'category_id': category.id,
                            'category_name': category.name,
                            'cached_at': datetime.utcnow().isoformat()
                        }
                        if product_cache and hasattr(product_cache, 'set_raw'):
                            product_cache.set_raw(
                                f"mizizzi:products:category:{category.id}",
                                fast_json_dumps(cat_data),
                                ttl=CACHE_TTL.get('category_list', 300)
                            )
                        _cache_warming_state['categories_cached'].append(category.name)
                except Exception as e:
                    _cache_warming_state['warm_errors'].append(f"Category {category.id}: {str(e)}")
            
            # 3. Cache featured product sections
            featured_sections = [
                ('is_featured', 'featured'),
                ('is_trending', 'trending'),
                ('is_flash_sale', 'flash_sale'),
                ('is_luxury_deal', 'luxury_deals'),
                ('is_top_pick', 'top_picks'),
                ('is_daily_find', 'daily_finds'),
                ('is_new_arrival', 'new_arrivals'),
                ('is_new', 'new_products'),
                ('is_sale', 'sale_products'),
            ]
            
            for attr, cache_name in featured_sections:
                try:
                    section_products = [p for p in products if getattr(p, attr, False)]
                    if section_products:
                        section_serialized = [serialize_product_lightweight(p) for p in section_products if p]
                        section_data = {
                            'items': section_serialized,
                            'products': section_serialized,
                            'total': len(section_serialized),
                            'cached_at': datetime.utcnow().isoformat()
                        }
                        if product_cache and hasattr(product_cache, 'set_raw'):
                            product_cache.set_raw(
                                f"mizizzi:{cache_name}",
                                fast_json_dumps(section_data),
                                ttl=CACHE_TTL.get('featured_section', 180)
                            )
                except Exception as e:
                    _cache_warming_state['warm_errors'].append(f"Section {cache_name}: {str(e)}")
            
            _cache_warming_state['last_warmed'] = datetime.utcnow().isoformat()
            
    except Exception as e:
        _cache_warming_state['warm_errors'].append(f"Global error: {str(e)}")
    finally:
        _cache_warming_state['is_warming'] = False


# ----------------------
# Public Products List (OPTIMIZED with Redis)
# ----------------------

@products_routes.route('/', methods=['GET'])
@limiter.limit("600 per minute")
def get_products():
    """
    Get products with filtering, sorting, and pagination.
    OPTIMIZED: Uses Redis caching and lightweight serialization.
    HARDENED: Compute admin once, don't cache admin/inactive responses, normalize boolean params.
    """
    try:
        # Compute admin status once for entire request
        is_admin = is_admin_user()
        
        # Extract and normalize all parameters
        params = extract_filter_params(request.args)
        include_inactive = params.pop('include_inactive')  # Remove from general params
        
        # Build cache key only for public (non-admin, non-inactive) requests
        should_cache = not is_admin and include_inactive == 0
        cache_key = None
        
        if should_cache:
            cache_key = build_cache_key_for_filters(
                'mizizzi:products:public',
                params,
                include_admin=False
            )
            cached = safe_cache_get(product_cache, cache_key)
            if cached:
                current_app.logger.info(f"[CACHE HIT] {cache_key}")
                return jsonify(cached), 200
        
        # Build query
        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.stock, Product.thumbnail_url,
                Product.image_urls, Product.discount_percentage,
                Product.is_featured, Product.is_new, Product.is_sale,
                Product.is_flash_sale, Product.is_luxury_deal, Product.is_trending,
                Product.is_top_pick, Product.is_daily_find, Product.is_new_arrival,
                Product.is_active, Product.is_visible, Product.category_id,
                Product.brand_id, Product.created_at, Product.sort_order
            )
        )
        
        # Apply filters using helper - this includes visibility/active filtering
        query = apply_product_filters(query, params, include_inactive=is_admin and include_inactive == 1)
        
        # Execute query with pagination
        try:
            pagination = query.paginate(
                page=params['page'],
                per_page=params['per_page'],
                error_out=False
            )
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error during pagination: {str(e)}")
            return jsonify({'error': 'Database error occurred'}), 500
        
        # Serialize products
        products = [serialize_product_lightweight(p) for p in pagination.items if p]
        
        # Build response
        response = build_pagination_response(
            pagination.items,
            serialize_product_lightweight,
            pagination.page,
            pagination.per_page,
            pagination.total
        )
        
        # Cache if appropriate
        if should_cache and cache_key:
            safe_cache_set(product_cache, cache_key, response, ttl=CACHE_TTL.get('products_list', 300))
        
        return jsonify(response), 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error getting products: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        current_app.logger.error(f"Error getting products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Flash Sale Products (OPTIMIZED)
# ----------------------

@products_routes.route('/flash-sale', methods=['GET'])
@limiter.limit("600 per minute")
@cached_response("flash_sale", ttl=30, key_params=["limit", "page"])
def get_flash_sale_products():
    """
    Get flash sale products.
    OPTIMIZED: Redis cached, lightweight response.
    """
    try:
        limit = min(request.args.get('limit', 20, type=int), 50)

        # Optimized query with indexed column is_flash_sale
        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock,
                Product.is_flash_sale, Product.is_sale
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_flash_sale == True
        ).order_by(
            Product.discount_percentage.desc()
        ).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting flash sale products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Luxury Deals Products (OPTIMIZED)
# ----------------------

@products_routes.route('/luxury-deals', methods=['GET'])
@limiter.limit("600 per minute")
@cached_response("luxury_deals", ttl=30, key_params=["limit", "page"])
def get_luxury_deals_products():
    """
    Get luxury deals products.
    OPTIMIZED: Redis cached, lightweight response.
    """
    try:
        limit = min(request.args.get('limit', 20, type=int), 50)

        # Optimized query with indexed column is_luxury_deal
        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock,
                Product.is_luxury_deal, Product.created_at
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_luxury_deal == True
        ).order_by(
            Product.created_at.desc()
        ).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products),
            'cached_at': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting luxury deals products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Get Product by ID (with caching for single product)
# ----------------------

@products_routes.route('/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    """Get a product by ID with public/admin cache separation."""
    try:
        is_admin = is_admin_user()
        
        # Use appropriate cache key based on user type
        cache_key = get_public_product_key(product_id)
        if is_admin:
            cache_key = f"mizizzi:product:admin:{product_id}"
        
        # Check cache first
        cached = product_cache.get(cache_key)
        if cached:
            current_app.logger.info(f"[CACHE HIT] {cache_key}")
            return jsonify(cached), 200

        # Use helper function with N+1 prevention
        product = get_product_with_relationships(product_id, for_admin=is_admin)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Serialize with appropriate view (admin or public)
        serialized = serialize_product_detail(product, for_admin=is_admin)

        # Cache with appropriate TTL
        ttl = CACHE_TTL.get('product_detail_admin' if is_admin else 'product_detail', 600)
        product_cache.set(cache_key, serialized, ttl=ttl)

        return jsonify(serialized), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Get Product by Slug
# ----------------------

@products_routes.route('/slug/<string:slug>', methods=['GET'])
def get_product_by_slug(slug):
    """Get a product by slug with public/admin cache separation."""
    try:
        is_admin = is_admin_user()
        
        # Use appropriate cache key based on user type
        cache_key = get_public_product_slug_key(slug)
        if is_admin:
            cache_key = f"mizizzi:product:admin:slug:{slug}"
        
        # Check cache first
        cached = product_cache.get(cache_key)
        if cached:
            current_app.logger.info(f"[CACHE HIT] {cache_key}")
            return jsonify(cached), 200

        # Use helper function with N+1 prevention
        product = get_product_by_slug_with_relationships(slug, for_admin=is_admin)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Serialize with appropriate view (admin or public)
        serialized = serialize_product_detail(product, for_admin=is_admin)

        # Cache with appropriate TTL
        ttl = CACHE_TTL.get('product_detail_admin' if is_admin else 'product_detail', 600)
        product_cache.set(cache_key, serialized, ttl=ttl)

        return jsonify(serialized), 200

    except Exception as e:
        current_app.logger.error(f"Error getting product by slug {slug}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Product Variants (Read-only for users)
# ----------------------

@products_routes.route('/<int:product_id>/variants', methods=['GET'])
def get_product_variants(product_id):
    """Get variants for a product."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is accessible to user
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        variants = ProductVariant.query.filter_by(product_id=product_id).all()

        return jsonify([serialize_variant(variant) for variant in variants]), 200

    except Exception as e:
        current_app.logger.error(f"Error getting variants for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Product Images (Read-only for users)
# ----------------------

@products_routes.route('/<int:product_id>/images', methods=['GET'])
def get_product_images(product_id):
    """Get images for a product."""
    try:
        product = db.session.get(Product, product_id)

        if not product:
            return jsonify({'error': 'Product not found'}), 404

        # Check if product is accessible to user
        if not is_admin_user():
            if not product.is_active or not product.is_visible:
                return jsonify({'error': 'Product not found'}), 404

        images = ProductImage.query.filter_by(product_id=product_id).order_by(
            ProductImage.is_primary.desc(),
            ProductImage.sort_order.asc()
        ).all()

        return jsonify({
            'items': [serialize_image(image) for image in images]
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting images for product {product_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@products_routes.route('/product-images/<int:image_id>', methods=['GET'])
def get_product_image(image_id):
    """Get a specific product image."""
    try:
        image = db.session.get(ProductImage, image_id)

        if not image:
            return jsonify({'error': 'Image not found'}), 404

        # Check if the product is accessible to user
        if not is_admin_user():
            product = db.session.get(Product, image.product_id)
            if not product or not product.is_active or not product.is_visible:
                return jsonify({'error': 'Image not found'}), 404

        return jsonify(serialize_image(image)), 200

    except Exception as e:
        current_app.logger.error(f"Error getting image {image_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Search and Filter Endpoints (OPTIMIZED)
# ----------------------

@products_routes.route('/search', methods=['GET'])
@cached_response("search", ttl=30, key_params=["q", "page", "per_page"])
def search_products():
    """Advanced product search endpoint with caching."""
    try:
        # Get search parameters
        query_text = request.args.get('q', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        if not query_text:
            return jsonify({'error': 'Search query is required'}), 400

        # Build search query with optimized columns
        search_term = f"%{query_text}%"
        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.sku
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_searchable == True,
            or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.short_description.ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )

        # Execute query with pagination
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Serialize products
        products = [serialize_product_lightweight(p) for p in pagination.items if p]

        return jsonify({
            'query': query_text,
            'items': products,
            'products': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error searching products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@products_routes.route('/featured', methods=['GET'])
@cached_response("featured", ttl=30, key_params=["page", "per_page"])
def get_featured_products():
    """Get featured products with caching."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.sort_order
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_featured == True
        ).order_by(Product.sort_order.asc(), Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        items = [serialize_product_lightweight(p) for p in pagination.items if p]
        return jsonify({
            'items': items,
            'products': items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting featured products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@products_routes.route('/new', methods=['GET'])
@cached_response("new_products", ttl=30, key_params=["page", "per_page"])
def get_new_products():
    """Get new products with caching."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_new == True
        ).order_by(Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        items = [serialize_product_lightweight(p) for p in pagination.items if p]
        return jsonify({
            'items': items,
            'products': items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting new products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@products_routes.route('/sale', methods=['GET'])
@cached_response("sale_products", ttl=30, key_params=["page", "per_page"])
def get_sale_products():
    """Get products on sale with caching."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 12, type=int), 50)

        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_sale == True
        ).order_by(Product.discount_percentage.desc(), Product.created_at.desc())

        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        items = [serialize_product_lightweight(p) for p in pagination.items if p]
        return jsonify({
            'items': items,
            'products': items,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting sale products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Trending Products (OPTIMIZED)
# ----------------------

@products_routes.route('/trending', methods=['GET'])
@cached_response("trending", ttl=30, key_params=["limit"])
def get_trending_products():
    """Get trending products with caching."""
    try:
        limit = min(request.args.get('limit', 12, type=int), 50)

        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.is_trending
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_trending == True
        ).limit(limit).all()

        # Fallback to random products if no trending
        if not products:
            products = Product.query.options(
                load_only(
                    Product.id, Product.name, Product.slug, Product.price,
                    Product.sale_price, Product.thumbnail_url, Product.image_urls,
                    Product.discount_percentage, Product.stock
                )
            ).filter(
                Product.is_active == True,
                Product.is_visible == True
            ).order_by(func.random()).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting trending products: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Top Picks Products (OPTIMIZED)
# ----------------------

@products_routes.route('/top-picks', methods=['GET'])
@cached_response("top_picks", ttl=30, key_params=["limit"])
def get_top_picks_products():
    """Get top pick products with caching."""
    try:
        limit = min(request.args.get('limit', 12, type=int), 50)

        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.is_top_pick
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_top_pick == True
        ).limit(limit).all()

        # Fallback to highest priced if no top picks
        if not products:
            products = Product.query.options(
                load_only(
                    Product.id, Product.name, Product.slug, Product.price,
                    Product.sale_price, Product.thumbnail_url, Product.image_urls,
                    Product.discount_percentage, Product.stock
                )
            ).filter(
                Product.is_active == True,
                Product.is_visible == True
            ).order_by(Product.price.desc()).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting top picks: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Daily Finds Products (OPTIMIZED)
# ----------------------

@products_routes.route('/daily-finds', methods=['GET'])
@cached_response("daily_finds", ttl=30, key_params=["limit"])
def get_daily_finds_products():
    """Get daily find products with caching."""
    try:
        limit = min(request.args.get('limit', 12, type=int), 50)

        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.is_daily_find
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_daily_find == True
        ).limit(limit).all()

        # Fallback to flash sales if no daily finds
        if not products:
            products = Product.query.options(
                load_only(
                    Product.id, Product.name, Product.slug, Product.price,
                    Product.sale_price, Product.thumbnail_url, Product.image_urls,
                    Product.discount_percentage, Product.stock, Product.is_flash_sale
                )
            ).filter(
                Product.is_active == True,
                Product.is_visible == True,
                Product.is_flash_sale == True
            ).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting daily finds: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# New Arrivals Products (OPTIMIZED)
# ----------------------

@products_routes.route('/new-arrivals', methods=['GET'])
@cached_response("new_arrivals", ttl=30, key_params=["limit"])
def get_new_arrivals_products():
    """Get new arrival products with caching."""
    try:
        limit = min(request.args.get('limit', 12, type=int), 50)

        products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.thumbnail_url, Product.image_urls,
                Product.discount_percentage, Product.stock, Product.is_new_arrival
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_new_arrival == True
        ).order_by(Product.created_at.desc()).limit(limit).all()

        items = [serialize_product_lightweight(p) for p in products if p]
        return jsonify({
            'items': items,
            'products': items,
            'total': len(products)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting new arrivals: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


# ----------------------
# Recent Searches
# ----------------------

@products_routes.route('/recent-searches', methods=['GET'])
@cached_response("recent_searches", ttl=60, key_params=["limit"])
def get_recent_searches():
    """Get recent search terms with actual products."""
    try:
        limit = min(request.args.get('limit', 8, type=int), 20)

        # Get trending products as suggestions
        trending_products = Product.query.options(
            load_only(
                Product.id, Product.name, Product.thumbnail_url, Product.price, Product.slug
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True,
            Product.is_searchable == True
        ).filter(
            or_(
                Product.is_featured == True,
                Product.is_new == True,
                Product.is_sale == True
            )
        ).order_by(
            Product.created_at.desc()
        ).limit(limit).all()

        # Get popular categories
        popular_categories = db.session.query(
            Category.name
        ).join(Product).filter(
            Product.is_active == True,
            Product.is_visible == True
        ).group_by(Category.id, Category.name).order_by(
            func.count(Product.id).desc()
        ).limit(5).all()

        recent_searches = []

        for product in trending_products:
            image_url = product.thumbnail_url
            if not image_url and hasattr(product, 'image_urls') and product.image_urls:
                if isinstance(product.image_urls, list):
                    image_url = product.image_urls[0] if product.image_urls else None

            recent_searches.append({
                'id': product.id,
                'name': product.name,
                'type': 'product',
                'image': image_url,
                'price': float(product.price) if product.price else None,
                'slug': f'/product/{product.id}',
                'search_term': product.name
            })

        for category_name, in popular_categories:
            recent_searches.append({
                'name': category_name,
                'type': 'category',
                'search_term': category_name
            })

        recent_searches = recent_searches[:limit]

        return jsonify({
            'items': recent_searches,
            'total': len(recent_searches),
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error getting recent searches: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ----------------------
# FAST Public Products List (NEW - Ultra-optimized with Upstash)
# ----------------------

@products_routes.route('/fast', methods=['GET'])
@limiter.limit("600 per minute")
def get_products_fast():
    """
    ULTRA-FAST: Get products with minimal overhead.
    Uses pre-serialized JSON caching for maximum speed.
    """
    start = time.perf_counter()

    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        category_id = request.args.get('category_id', type=int)
        brand_id = request.args.get('brand_id', type=int)
        is_featured = request.args.get('is_featured', type=str)
        is_sale = request.args.get('is_sale', type=str)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build cache key
        cache_key = f"mizizzi:products:fast:{page}:{per_page}:{category_id}:{brand_id}:{is_featured}:{is_sale}:{sort_by}:{sort_order}"

        # Try cache first
        cached = product_cache.get_raw(cache_key) if product_cache and hasattr(product_cache, 'get_raw') else None
        if cached:
            try:
                if isinstance(cached, bytes):
                    cached_str = cached.decode('utf-8')
                else:
                    cached_str = cached
                payload = json.loads(cached_str)
                if 'products' not in payload and 'items' in payload:
                    payload['products'] = payload['items']
                json_out = json.dumps(payload)
                cache_time = (time.perf_counter() - start) * 1000
                response = Response(json_out, status=200, mimetype='application/json')
                response.headers['X-Cache'] = 'HIT'
                response.headers['X-Cache-Time-Ms'] = str(round(cache_time, 2))
                return response
            except Exception:
                # fallback: return raw cached string
                cache_time = (time.perf_counter() - start) * 1000
                response = Response(cached if isinstance(cached, str) else cached.decode('utf-8'), status=200, mimetype='application/json')
                response.headers['X-Cache'] = 'HIT'
                response.headers['X-Cache-Time-Ms'] = str(round(cache_time, 2))
                return response

        # Convert string booleans
        def str_to_bool(val):
            if val is None:
                return None
            return val.lower() in ('true', '1', 'yes')

        is_featured = str_to_bool(is_featured)
        is_sale = str_to_bool(is_sale)

        # Optimized query with minimal columns
        query = Product.query.options(
            load_only(
                Product.id, Product.name, Product.slug, Product.price,
                Product.sale_price, Product.stock, Product.thumbnail_url,
                Product.image_urls, Product.discount_percentage,
                Product.is_featured, Product.is_new, Product.is_sale,
                Product.category_id, Product.brand_id
            )
        ).filter(
            Product.is_active == True,
            Product.is_visible == True
        )

        # Apply filters
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
        if is_featured is not None:
            query = query.filter(Product.is_featured == is_featured)
        if is_sale is not None:
            query = query.filter(Product.is_sale == is_sale)

        # Sorting
        valid_sort_fields = ['name', 'price', 'created_at', 'stock']
        if sort_by in valid_sort_fields:
            sort_column = getattr(Product, sort_by)
            query = query.order_by(sort_column.desc() if sort_order == 'desc' else sort_column.asc())
        else:
            query = query.order_by(Product.created_at.desc())

        # Execute with pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        products = []
        for product in pagination.items:
            serialized = serialize_product_lightweight(product)
            if serialized:
                products.append(serialized)

        data = {
            'items': products,
            'products': products,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total_items': pagination.total,
                'total_pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            },
            'cached_at': datetime.utcnow().isoformat()
        }

        # Cache the pre-serialized JSON
        json_str = fast_json_dumps(data)
        if product_cache and hasattr(product_cache, 'set_raw'):
            product_cache.set_raw(cache_key, json_str, ttl=30)

        total_time = (time.perf_counter() - start) * 1000
        response = Response(json_str, status=200, mimetype='application/json')
        response.headers['X-Cache'] = 'MISS'
        response.headers['X-Response-Time-Ms'] = str(round(total_time, 2))
        return response

    except Exception as e:
        current_app.logger.error(f"Error in fast products: {str(e)}")
        return Response(
            fast_json_dumps({'error': 'Internal server error'}),
            status=500,
            mimetype='application/json'
        )


# ----------------------
# OPTIONS handlers for CORS
# ----------------------

@products_routes.route('/', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>', methods=['OPTIONS'])
@products_routes.route('/slug/<string:slug>', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>/variants', methods=['OPTIONS'])
@products_routes.route('/<int:product_id>/images', methods=['OPTIONS'])
@products_routes.route('/product-images/<int:image_id>', methods=['OPTIONS'])
@products_routes.route('/search', methods=['OPTIONS'])
@products_routes.route('/featured', methods=['OPTIONS'])
@products_routes.route('/new', methods=['OPTIONS'])
@products_routes.route('/sale', methods=['OPTIONS'])
@products_routes.route('/flash-sale', methods=['OPTIONS'])
@products_routes.route('/luxury-deals', methods=['OPTIONS'])
@products_routes.route('/trending', methods=['OPTIONS'])
@products_routes.route('/top-picks', methods=['OPTIONS'])
@products_routes.route('/daily-finds', methods=['OPTIONS'])
@products_routes.route('/new-arrivals', methods=['OPTIONS'])
@products_routes.route('/recent-searches', methods=['OPTIONS'])
@products_routes.route('/cache/status', methods=['OPTIONS'])
@products_routes.route('/cache/invalidate', methods=['OPTIONS'])
@products_routes.route('/cache/warm', methods=['OPTIONS'])
@products_routes.route('/cache/all', methods=['OPTIONS'])
@products_routes.route('/cache/warming-status', methods=['OPTIONS'])
@products_routes.route('/fast', methods=['OPTIONS'])
def handle_options():
    """Handle OPTIONS requests for CORS."""
    return '', 200
