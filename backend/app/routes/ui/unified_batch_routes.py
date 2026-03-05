"""
Unified UI Batch Endpoint - HIGH PERFORMANCE
Combines all UI sections (carousel, topbar, categories, side panels) 
in a SINGLE request with PARALLEL backend execution using ThreadPoolExecutor.

Architecture:
  Client: 1 HTTP request to /api/ui/batch
  Backend: Parallel execution of all UI data queries simultaneously
  Response: All sections returned at once

Expected Performance:
  - Network overhead: 100ms (1 request instead of 4-5)
  - Backend time: ~100-150ms (parallel queries, not sequential)
  - Total: ~250ms vs 500-800ms for separate requests
"""
from flask import Blueprint, jsonify, request, current_app
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import logging
from datetime import datetime

from app.configuration.extensions import db
from app.utils.redis_cache import (
    product_cache, 
    fast_cached_response, 
    fast_json_dumps
)

logger = logging.getLogger(__name__)

ui_batch_routes = Blueprint('ui_batch_routes', __name__, url_prefix='/api')

# Cache configuration with different TTLs for each section
BATCH_CACHE_CONFIG = {
    'carousel': {'ttl': 60, 'key': 'batch:carousel'},        # 1 min - changes frequently
    'topbar': {'ttl': 120, 'key': 'batch:topbar'},           # 2 min
    'categories': {'ttl': 300, 'key': 'batch:categories'},   # 5 min
    'side_panels': {'ttl': 300, 'key': 'batch:side_panels'}, # 5 min
    'ui_all': {'ttl': 60, 'key': 'batch:ui_all_combined'},   # 1 min - freshest combined data
}


# ============================================================================
# FETCH FUNCTIONS - Parallel execution
# ============================================================================

def fetch_carousel():
    """Fetch carousel banners from all positions."""
    try:
        from app.models.carousel_model import CarouselBanner
        
        carousel_data = {}
        positions = ['homepage', 'category_page', 'flash_sales', 'luxury_deals']
        
        for position in positions:
            items = CarouselBanner.query.filter_by(
                position=position,
                is_active=True
            ).order_by(CarouselBanner.sort_order).limit(5).all()
            
            carousel_data[position] = [
                {
                    'id': item.id,
                    'name': item.name,
                    'title': item.title,
                    'description': item.description,
                    'badge_text': item.badge_text,
                    'discount': item.discount,
                    'button_text': item.button_text,
                    'link_url': item.link_url,
                    'image_url': item.image_url,
                    'sort_order': item.sort_order
                } for item in items
            ]
        
        return {
            'section': 'carousel',
            'data': carousel_data,
            'count': sum(len(items) for items in carousel_data.values()),
            'success': True
        }
    except Exception as e:
        logger.error(f"Error fetching carousel: {str(e)}")
        return {
            'section': 'carousel',
            'data': {},
            'error': str(e),
            'success': False
        }


def fetch_topbar():
    """Fetch active topbar slides."""
    try:
        from app.models.topbar_model import TopBarSlide
        
        slides = TopBarSlide.query.filter_by(is_active=True).order_by(
            TopBarSlide.sort_order
        ).limit(10).all()
        
        topbar_data = [slide.to_dict() for slide in slides]
        
        return {
            'section': 'topbar',
            'slides': topbar_data,
            'count': len(topbar_data),
            'success': True
        }
    except Exception as e:
        logger.error(f"Error fetching topbar: {str(e)}")
        return {
            'section': 'topbar',
            'slides': [],
            'error': str(e),
            'success': False
        }


def fetch_categories():
    """Fetch featured and root categories."""
    try:
        from app.models.models import Category, Product
        
        # Get featured categories
        featured = Category.query.filter_by(is_featured=True).order_by(
            Category.name
        ).limit(10).all()
        
        featured_data = []
        for cat in featured:
            product_count = Product.query.filter_by(category_id=cat.id).count()
            featured_data.append({
                'id': cat.id,
                'name': cat.name,
                'slug': cat.slug,
                'description': cat.description,
                'image_url': cat.image_url,
                'is_featured': cat.is_featured,
                'products_count': product_count
            })
        
        # Get root categories with their subcategories count
        root_categories = Category.query.filter_by(parent_id=None).order_by(
            Category.name
        ).limit(20).all()
        
        root_data = []
        for cat in root_categories:
            product_count = Product.query.filter_by(category_id=cat.id).count()
            subcategories_count = Category.query.filter_by(parent_id=cat.id).count()
            
            root_data.append({
                'id': cat.id,
                'name': cat.name,
                'slug': cat.slug,
                'description': cat.description,
                'image_url': cat.image_url,
                'products_count': product_count,
                'subcategories_count': subcategories_count
            })
        
        return {
            'section': 'categories',
            'featured': featured_data,
            'root': root_data,
            'featured_count': len(featured_data),
            'root_count': len(root_data),
            'success': True
        }
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return {
            'section': 'categories',
            'featured': [],
            'root': [],
            'error': str(e),
            'success': False
        }


def fetch_side_panels():
    """Fetch side panel items for all types and positions."""
    try:
        from app.models.side_panel_model import SidePanel
        
        panels_data = {}
        panel_types = ['product_showcase', 'premium_experience']
        positions = ['left', 'right']
        
        for panel_type in panel_types:
            for position in positions:
                key = f"{panel_type}_{position}"
                items = SidePanel.query.filter_by(
                    panel_type=panel_type,
                    position=position,
                    is_active=True
                ).order_by(SidePanel.sort_order).limit(3).all()
                
                panels_data[key] = [item.to_dict() for item in items]
        
        return {
            'section': 'side_panels',
            'data': panels_data,
            'count': sum(len(items) for items in panels_data.values()),
            'success': True
        }
    except Exception as e:
        logger.error(f"Error fetching side panels: {str(e)}")
        return {
            'section': 'side_panels',
            'data': {},
            'error': str(e),
            'success': False
        }


# ============================================================================
# MAIN BATCH ENDPOINT
# ============================================================================

@ui_batch_routes.route('/ui/batch', methods=['GET'])
def get_ui_batch():
    """
    GET /api/ui/batch
    
    Combined UI data endpoint with parallel backend query execution.
    Returns all UI sections (carousel, topbar, categories, side panels) in ONE request.
    
    Query Parameters:
      - cache: 'true'/'false' - enable/disable caching (default: true)
      - sections: comma-separated list of sections to fetch (default: all)
        Options: carousel, topbar, categories, side_panels
      
    Response:
      {
        "timestamp": "2024-03-04T10:30:00Z",
        "total_execution_ms": 145,
        "cached": false,
        "sections": {
          "carousel": { "data": {...}, "count": 20 },
          "topbar": { "slides": [...], "count": 5 },
          "categories": { "featured": [...], "root": [...] },
          "side_panels": { "data": {...}, "count": 8 }
        },
        "meta": {
          "sections_fetched": 4,
          "parallel_execution": true
        }
      }
    """
    
    start_time = time.time()
    
    # Check cache first
    cache_enabled = request.args.get('cache', 'true').lower() == 'true'
    requested_sections = request.args.get('sections', 'all')
    
    cache_key = BATCH_CACHE_CONFIG['ui_all']['key']
    if cache_enabled:
        try:
            cached_data = product_cache.get(cache_key)
            if cached_data:
                cached_data['cached'] = True
                cached_data['total_execution_ms'] = round((time.time() - start_time) * 1000, 2)
                logger.info(f"UI batch served from cache in {cached_data['total_execution_ms']}ms")
                return jsonify(cached_data), 200
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {str(e)}")
    
    try:
        # Define all fetch functions
        fetch_functions = {
            'carousel': fetch_carousel,
            'topbar': fetch_topbar,
            'categories': fetch_categories,
            'side_panels': fetch_side_panels,
        }
        
        # Determine which sections to fetch
        if requested_sections == 'all':
            sections_to_fetch = list(fetch_functions.keys())
        else:
            sections_to_fetch = [
                s.strip() for s in requested_sections.split(',') 
                if s.strip() in fetch_functions
            ]
            if not sections_to_fetch:
                sections_to_fetch = list(fetch_functions.keys())
        
        # PARALLEL execution using ThreadPoolExecutor
        # All queries execute simultaneously, not sequentially
        results = {}
        with ThreadPoolExecutor(max_workers=8) as executor:
            # Submit all queries at once
            futures = {
                executor.submit(fetch_functions[section]): section 
                for section in sections_to_fetch
            }
            
            # Collect results as they complete
            for future in as_completed(futures):
                section = futures[future]
                try:
                    result = future.result(timeout=5)
                    results[section] = {
                        **result,
                        'success': result.get('success', False)
                    }
                except Exception as e:
                    logger.error(f"Error in parallel fetch for {section}: {str(e)}")
                    results[section] = {
                        'success': False,
                        'error': str(e)
                    }
        
        # Build response
        execution_time = time.time() - start_time
        response_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'total_execution_ms': round(execution_time * 1000, 2),
            'cached': False,
            'sections': results,
            'meta': {
                'sections_fetched': len(results),
                'parallel_execution': True,
                'cache_key': cache_key if cache_enabled else None
            }
        }
        
        # Cache the response
        if cache_enabled:
            try:
                product_cache.set(
                    cache_key, 
                    response_data,
                    ex=BATCH_CACHE_CONFIG['ui_all']['ttl']
                )
                logger.info(f"UI batch cached for {BATCH_CACHE_CONFIG['ui_all']['ttl']}s")
            except Exception as e:
                logger.warning(f"Failed to cache UI batch: {str(e)}")
        
        logger.info(f"UI batch endpoint executed in {execution_time*1000:.2f}ms")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"UI batch endpoint error: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch UI data',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 500


@ui_batch_routes.route('/ui/batch/status', methods=['GET'])
def get_ui_batch_status():
    """
    GET /api/ui/batch/status
    
    Health check and performance metrics for the unified batch endpoint.
    Useful for monitoring and debugging.
    """
    try:
        # Test database connections for all models
        db_status = {}
        
        try:
            from app.models.carousel_model import CarouselBanner
            test = CarouselBanner.query.limit(1).first()
            db_status['carousel'] = 'connected' if test is not None else 'ok'
        except:
            db_status['carousel'] = 'unavailable'
        
        try:
            from app.models.topbar_model import TopBarSlide
            test = TopBarSlide.query.limit(1).first()
            db_status['topbar'] = 'connected' if test is not None else 'ok'
        except:
            db_status['topbar'] = 'unavailable'
        
        try:
            from app.models.models import Category
            test = Category.query.limit(1).first()
            db_status['categories'] = 'connected' if test is not None else 'ok'
        except:
            db_status['categories'] = 'unavailable'
        
        try:
            from app.models.side_panel_model import SidePanel
            test = SidePanel.query.limit(1).first()
            db_status['side_panels'] = 'connected' if test is not None else 'ok'
        except:
            db_status['side_panels'] = 'unavailable'
        
        # Test cache
        cache_test_key = 'batch:ui_health_check'
        cache_healthy = False
        try:
            product_cache.set(cache_test_key, {'test': True}, ex=10)
            cache_healthy = product_cache.get(cache_test_key) is not None
            product_cache.delete(cache_test_key)
        except:
            cache_healthy = False
        
        all_healthy = all(v == 'connected' or v == 'ok' for v in db_status.values())
        
        return jsonify({
            'status': 'healthy' if (all_healthy and cache_healthy) else 'degraded',
            'database': db_status,
            'cache': 'connected' if cache_healthy else 'disconnected',
            'endpoint': '/api/ui/batch',
            'sections_available': [
                'carousel',
                'topbar',
                'categories',
                'side_panels'
            ],
            'cache_ttls': {
                'carousel': BATCH_CACHE_CONFIG['carousel']['ttl'],
                'topbar': BATCH_CACHE_CONFIG['topbar']['ttl'],
                'categories': BATCH_CACHE_CONFIG['categories']['ttl'],
                'side_panels': BATCH_CACHE_CONFIG['side_panels']['ttl'],
                'combined': BATCH_CACHE_CONFIG['ui_all']['ttl']
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 200
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }), 500
