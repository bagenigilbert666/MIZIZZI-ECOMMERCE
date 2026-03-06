"""
Featured product routes for specific sections like Trending, Top Picks, etc.
PRODUCTION-READY: Configuration-driven, DRY, with unified query/serialization logic.
"""
from flask import Blueprint, request, current_app, Response
from sqlalchemy.orm import load_only
from datetime import datetime
import time
import json

from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import (
    product_cache, 
    fast_cached_response, 
    fast_json_dumps,
    cached_response
)

# Import unified serializers and cache keys
from .serializers import serialize_product_minimal, serialize_product_list
from .cache_keys import CACHE_TTL

featured_routes = Blueprint('featured_routes', __name__)

# ============================================================================
# CENTRALIZED FEATURED SECTIONS CONFIGURATION
# ============================================================================
# Each section defines: filter criteria, fallback logic, and cache settings
FEATURED_SECTIONS = {
    'trending': {
        'filter': Product.is_trending == True,
        'fallback': None,
        'cache_key': 'mizizzi:featured:public:trending',
        'ttl': CACHE_TTL.get('featured_trending', 120),
        'description': 'Currently trending products',
        'min_results': 3,
    },
    'flash_sale': {
        'filter': Product.is_flash_sale == True,
        'fallback': None,
        'cache_key': 'mizizzi:featured:public:flash_sale',
        'ttl': CACHE_TTL.get('featured_flash_sale', 60),
        'description': 'Flash sale products',
        'min_results': 5,
    },
    'new_arrivals': {
        'filter': Product.is_new_arrival == True,
        'fallback': None,
        'cache_key': 'mizizzi:featured:public:new_arrivals',
        'ttl': CACHE_TTL.get('featured_new_arrivals', 180),
        'description': 'Newly arrived products',
        'min_results': 6,
    },
    'top_picks': {
        'filter': Product.is_top_pick == True,
        'fallback': Product.is_featured == True,
        'cache_key': 'mizizzi:featured:public:top_picks',
        'ttl': CACHE_TTL.get('featured_top_picks', 120),
        'description': 'Top picked products',
        'min_results': 4,
    },
    'daily_finds': {
        'filter': Product.is_daily_find == True,
        'fallback': Product.is_flash_sale == True,
        'cache_key': 'mizizzi:featured:public:daily_finds',
        'ttl': CACHE_TTL.get('featured_daily_finds', 300),
        'description': 'Daily finds',
        'min_results': 5,
    },
    'luxury_deals': {
        'filter': Product.is_luxury_deal == True,
        'fallback': None,
        'cache_key': 'mizizzi:featured:public:luxury_deals',
        'ttl': CACHE_TTL.get('featured_luxury_deals', 180),
        'description': 'Luxury deal products',
        'min_results': 3,
    },
}

# ============================================================================
# SHARED HELPER FUNCTIONS
# ============================================================================

def _parse_and_clamp_limit(limit_param, max_limit=100, default=20):
    """
    Parse limit parameter with validation and clamping.
    Returns integer between 1 and max_limit.
    """
    try:
        limit = int(limit_param) if limit_param else default
        return min(max(limit, 1), max_limit)
    except (ValueError, TypeError):
        return default


def get_minimal_product_query():
    """Return a query with only essential columns loaded for speed."""
    return Product.query.options(
        load_only(
            Product.id, 
            Product.name, 
            Product.slug, 
            Product.price,
            Product.sale_price, 
            Product.thumbnail_url,
            Product.image_urls,
            Product.is_active, 
            Product.is_visible
        )
    )


def _get_featured_products(section_name, limit=50):
    """
    Get featured products for a specific section using configuration.
    Tries primary filter, then fallback if needed.
    Returns list of Product objects.
    """
    if section_name not in FEATURED_SECTIONS:
        return []
    
    config = FEATURED_SECTIONS[section_name]
    
    # Query with primary filter
    products = get_minimal_product_query().filter(
        Product.is_active == True,
        Product.is_visible == True,
        config['filter']
    ).limit(limit).all()
    
    # Try fallback if needed
    if len(products) < config['min_results'] and config['fallback'] is not None:
        products = get_minimal_product_query().filter(
            Product.is_active == True,
            Product.is_visible == True,
            config['fallback']
        ).limit(limit).all()
    
    return products


def _build_section_response(section_name, products, format_type='normal'):
    """
    Build standardized response for a featured section.
    format_type: 'fast' (minimal) or 'normal' (full)
    """
    config = FEATURED_SECTIONS[section_name]
    
    if format_type == 'fast':
        serialized = [serialize_product_minimal(p) for p in products if p]
    else:
        serialized = [serialize_product_list(p) for p in products if p]
    
    if format_type == 'fast':
        return {
            'items': serialized,
            'count': len(serialized),
            'timestamp': datetime.utcnow().isoformat()
        }
    else:
        return {
            'items': serialized,
            'products': serialized,
            'total': len(serialized),
            'section': section_name,
            'description': config['description'],
            'cached_at': datetime.utcnow().isoformat()
        }


def _get_section_handler(section_name, format_type='normal', custom_limit=None):
    """
    Unified handler for all featured section endpoints.
    Manages cache lookup, fallback to DB query, and response formatting.
    """
    try:
        if section_name not in FEATURED_SECTIONS:
            return {'error': 'Invalid section'}, 404
        
        config = FEATURED_SECTIONS[section_name]
        cache_key = config['cache_key']
        
        # Try cache first
        if product_cache and hasattr(product_cache, 'get'):
            try:
                cached = product_cache.get(cache_key)
                if cached:
                    if isinstance(cached, str):
                        data = json.loads(cached)
                        current_app.logger.info(f"[CACHE HIT] {cache_key}")
                        return data, 200
            except Exception as e:
                current_app.logger.warning(f"Cache get error for {cache_key}: {str(e)}")
        
        # Query database
        limit = custom_limit or config['min_results'] * 2
        products = _get_featured_products(section_name, limit=limit)
        
        if not products:
            response = _build_section_response(section_name, [], format_type)
            return response, 200
        
        # Build and cache response
        response = _build_section_response(section_name, products, format_type)
        
        if product_cache and hasattr(product_cache, 'set'):
            try:
                product_cache.set(cache_key, json.dumps(response), ttl=config['ttl'])
            except Exception as e:
                current_app.logger.warning(f"Cache set error for {cache_key}: {str(e)}")
        
        return response, 200
        
    except Exception as e:
        current_app.logger.error(f"Section handler error for {section_name}: {str(e)}")
        return {'error': 'Internal server error'}, 500


# ============================================================================
# CACHE MANAGEMENT ENDPOINTS
# ============================================================================

def cache_all_featured_products():
    """
    Pre-cache all featured product sections for optimal performance.
    Returns dict with cache status for each section.
    Configuration-driven to prevent duplication.
    """
    results = {}
    
    for section_name, config in FEATURED_SECTIONS.items():
        try:
            start_time = time.time()
            
            # Query products for this section
            products = _get_featured_products(section_name, limit=50)
            
            # Serialize and cache
            serialized = [serialize_product_minimal(p) for p in products]
            cache_data = {
                'items': serialized,
                'count': len(serialized),
                'cached_at': datetime.utcnow().isoformat(),
                'section': section_name
            }
            
            cache_key = config['cache_key']
            ttl = config['ttl']
            
            # Store in cache
            if product_cache and hasattr(product_cache, 'set'):
                product_cache.set(cache_key, json.dumps(cache_data), ttl=ttl)
            
            elapsed = time.time() - start_time
            results[section_name] = {
                'success': True,
                'count': len(serialized),
                'time_ms': round(elapsed * 1000, 2),
                'cache_key': cache_key
            }
            
        except Exception as e:
            current_app.logger.error(f"Failed to cache {section_name}: {str(e)}")
            results[section_name] = {
                'success': False,
                'error': str(e)
            }
    
    return results


@featured_routes.route('/cache/warm', methods=['POST'])
def warm_featured_cache():
    """Warm all featured product caches."""
    try:
        results = cache_all_featured_products()
        
        success_count = sum(1 for r in results.values() if r.get('success'))
        
        return {
            'success': True,
            'message': f'Warmed {success_count}/{len(results)} featured caches',
            'sections': results,
            'timestamp': datetime.utcnow().isoformat()
        }, 200
        
    except Exception as e:
        current_app.logger.error(f"Featured cache warming error: {str(e)}")
        return {'error': str(e), 'success': False}, 500


@featured_routes.route('/cache/all', methods=['GET'])
def get_all_featured_cached():
    """Get all featured products from cache."""
    try:
        results = {}
        cache_stats = {
            'hits': 0,
            'misses': 0,
            'total_products': 0
        }
        
        for section_name, config in FEATURED_SECTIONS.items():
            cache_key = config['cache_key']
            
            # Try to get from cache
            if product_cache and hasattr(product_cache, 'get'):
                try:
                    cached = product_cache.get(cache_key)
                    if cached:
                        data = json.loads(cached) if isinstance(cached, str) else cached
                        results[section_name] = data
                        cache_stats['hits'] += 1
                        cache_stats['total_products'] += data.get('count', 0)
                        continue
                except Exception:
                    pass
            
            cache_stats['misses'] += 1
            results[section_name] = {'items': [], 'count': 0, 'from_cache': False}
        
        return {
            'sections': results,
            'cache_stats': cache_stats,
            'redis_connected': getattr(product_cache, 'is_connected', False),
            'timestamp': datetime.utcnow().isoformat()
        }, 200
        
    except Exception as e:
        current_app.logger.error(f"Get all featured error: {str(e)}")
        return {'error': str(e)}, 500


@featured_routes.route('/cache/status', methods=['GET'])
def get_featured_cache_status():
    """Get detailed cache status for all featured sections."""
    try:
        status = {
            'redis_connected': getattr(product_cache, 'is_connected', False),
            'cache_type': 'upstash' if getattr(product_cache, 'is_connected', False) else 'memory',
            'sections': {}
        }
        
        for section_name, config in FEATURED_SECTIONS.items():
            cache_key = config['cache_key']
            section_status = {
                'key': cache_key,
                'ttl_config': config['ttl'],
                'cached': False,
                'count': 0,
                'cached_at': None
            }
            
            if product_cache and hasattr(product_cache, 'get'):
                try:
                    cached = product_cache.get(cache_key)
                    if cached:
                        data = json.loads(cached) if isinstance(cached, str) else cached
                        section_status['cached'] = True
                        section_status['count'] = data.get('count', 0)
                        section_status['cached_at'] = data.get('cached_at')
                except Exception:
                    pass
            
            status['sections'][section_name] = section_status
        
        status['global_stats'] = getattr(product_cache, 'stats', {})
        status['timestamp'] = datetime.utcnow().isoformat()
        
        return status, 200
        
    except Exception as e:
        current_app.logger.error(f"Featured cache status error: {str(e)}")
        return {'error': str(e)}, 500


# ============================================================================
# FEATURED PRODUCT ENDPOINTS - FAST VERSIONS (Minimal JSON)
# ============================================================================

@featured_routes.route('/fast/trending', methods=['GET'])
@fast_cached_response('featured:trending', ttl=CACHE_TTL.get('featured_trending', 120), key_params=['limit'])
def get_trending_products_fast():
    """FAST: Get trending products with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    products = _get_featured_products('trending', limit=limit)
    return _get_section_handler('trending', format_type='fast', custom_limit=limit)


@featured_routes.route('/fast/flash-sale', methods=['GET'])
@fast_cached_response('featured:flash_sale', ttl=CACHE_TTL.get('featured_flash_sale', 60), key_params=['limit'])
def get_flash_sale_products_fast():
    """FAST: Get flash sale products with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('flash_sale', format_type='fast', custom_limit=limit)


@featured_routes.route('/fast/new-arrivals', methods=['GET'])
@fast_cached_response('featured:new_arrivals', ttl=CACHE_TTL.get('featured_new_arrivals', 180), key_params=['limit'])
def get_new_arrivals_fast():
    """FAST: Get new arrivals with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('new_arrivals', format_type='fast', custom_limit=limit)


@featured_routes.route('/fast/top-picks', methods=['GET'])
@fast_cached_response('featured:top_picks', ttl=CACHE_TTL.get('featured_top_picks', 120), key_params=['limit'])
def get_top_picks_fast():
    """FAST: Get top picks with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('top_picks', format_type='fast', custom_limit=limit)


@featured_routes.route('/fast/daily-finds', methods=['GET'])
@fast_cached_response('featured:daily_finds', ttl=CACHE_TTL.get('featured_daily_finds', 300), key_params=['limit'])
def get_daily_finds_fast():
    """FAST: Get daily finds with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('daily_finds', format_type='fast', custom_limit=limit)


@featured_routes.route('/fast/luxury-deals', methods=['GET'])
@fast_cached_response('featured:luxury_deals', ttl=CACHE_TTL.get('featured_luxury_deals', 180), key_params=['limit'])
def get_luxury_deals_fast():
    """FAST: Get luxury deals with minimal payload."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('luxury_deals', format_type='fast', custom_limit=limit)


# ============================================================================
# FEATURED PRODUCT ENDPOINTS - NORMAL VERSIONS (Full JSON)
# ============================================================================

@featured_routes.route('/trending', methods=['GET'])
@cached_response('featured:trending', ttl=CACHE_TTL.get('featured_trending', 120), key_params=['limit'])
def get_trending_products():
    """Get trending products."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('trending', format_type='normal', custom_limit=limit)


@featured_routes.route('/flash-sale', methods=['GET'])
@cached_response('featured:flash_sale', ttl=CACHE_TTL.get('featured_flash_sale', 60), key_params=['limit'])
def get_flash_sale_products():
    """Get flash sale products."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('flash_sale', format_type='normal', custom_limit=limit)


@featured_routes.route('/new-arrivals', methods=['GET'])
@cached_response('featured:new_arrivals', ttl=CACHE_TTL.get('featured_new_arrivals', 180), key_params=['limit'])
def get_new_arrivals():
    """Get new arrivals."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('new_arrivals', format_type='normal', custom_limit=limit)


@featured_routes.route('/top-picks', methods=['GET'])
@cached_response('featured:top_picks', ttl=CACHE_TTL.get('featured_top_picks', 120), key_params=['limit'])
def get_top_picks():
    """Get top picks."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('top_picks', format_type='normal', custom_limit=limit)


@featured_routes.route('/daily-finds', methods=['GET'])
@cached_response('featured:daily_finds', ttl=CACHE_TTL.get('featured_daily_finds', 300), key_params=['limit'])
def get_daily_finds():
    """Get daily finds."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('daily_finds', format_type='normal', custom_limit=limit)


@featured_routes.route('/luxury-deals', methods=['GET'])
@cached_response('featured:luxury_deals', ttl=CACHE_TTL.get('featured_luxury_deals', 180), key_params=['limit'])
def get_luxury_deals():
    """Get luxury deals."""
    limit = _parse_and_clamp_limit(request.args.get('limit'), max_limit=50, default=20)
    return _get_section_handler('luxury_deals', format_type='normal', custom_limit=limit)
