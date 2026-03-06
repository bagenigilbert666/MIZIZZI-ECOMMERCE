"""
Homepage Batch Route
Public API endpoint that returns all homepage data in one request.
Single entry point for frontend homepage data fetching.
Uses aggregator service for clean orchestration.
"""
from flask import Blueprint, jsonify, current_app, Response
import time

from app.services.homepage.get_homepage_data import get_homepage_data
from app.utils.redis_cache import cached_response, fast_json_dumps

homepage_routes = Blueprint('homepage_routes', __name__, url_prefix='/api/homepage')


@homepage_routes.route('/data', methods=['GET'])
def get_homepage():
    """
    GET /api/homepage/data
    
    Returns all homepage data in one batch request.
    
    Response includes:
    - categories: List of product categories
    - carousel: List of carousel banners
    - featured: Dict with all featured product sections
      - trending
      - flash_sale
      - new_arrivals
      - top_picks
      - daily_finds
      - luxury_deals
    - all_products: List of general products
    - all_products_has_more: Boolean for pagination
    
    Uses Redis caching per section (60s homepage cache).
    Individual sections also cached at their own TTL.
    
    Error handling: If any section fails, returns empty list for that section.
    Homepage still loads even if some sections fail.
    """
    cache_key = "mizizzi:homepage:batch_data"
    
    @cached_response(cache_key, ttl=60)
    def _fetch():
        try:
            data = get_homepage_data()
            return {
                "status": "success",
                "data": data,
                "timestamp": time.time(),
            }
        except Exception as e:
            current_app.logger.error(f"[Homepage Route] Error fetching homepage data: {e}")
            return {
                "status": "error",
                "message": "Failed to load homepage data",
                "data": {
                    "categories": [],
                    "carousel": [],
                    "featured": {
                        "trending": [],
                        "flash_sale": [],
                        "new_arrivals": [],
                        "top_picks": [],
                        "daily_finds": [],
                        "luxury_deals": [],
                    },
                    "all_products": [],
                    "all_products_has_more": False,
                },
                "timestamp": time.time(),
            }
    
    response_data = _fetch()
    
    # Create JSON response with proper headers
    response = Response(
        fast_json_dumps(response_data),
        status=200,
        mimetype='application/json'
    )
    response.headers['X-Cache'] = 'HIT' if cache_key in {} else 'MISS'
    response.headers['Cache-Control'] = 'public, max-age=60'
    
    return response


@homepage_routes.route('/health', methods=['GET'])
def homepage_health():
    """
    Health check endpoint for homepage service.
    Returns quick status of homepage data fetching.
    """
    try:
        data = get_homepage_data()
        has_data = any([
            data.get('categories'),
            data.get('carousel'),
            any(data.get('featured', {}).values()),
            data.get('all_products'),
        ])
        
        return jsonify({
            "status": "healthy" if has_data else "degraded",
            "sections_available": {
                "categories": len(data.get('categories', [])) > 0,
                "carousel": len(data.get('carousel', [])) > 0,
                "featured": any(data.get('featured', {}).values()),
                "products": len(data.get('all_products', [])) > 0,
            }
        })
    except Exception as e:
        current_app.logger.error(f"[Homepage Health Check] Error: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500
