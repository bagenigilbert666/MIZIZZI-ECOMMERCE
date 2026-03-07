"""Homepage Batch API Route - Single endpoint for all homepage data."""
import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import asyncio

from app.services.homepage.aggregator import get_homepage_data
from app.utils.redis_cache import product_cache, fast_json_dumps

logger = logging.getLogger(__name__)

homepage_routes = Blueprint('homepage_routes', __name__)


@homepage_routes.route('/api/homepage', methods=['GET'])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint.
    
    Fetches all homepage sections in parallel:
    - Categories
    - Carousel items  
    - Flash sale products
    - Featured products (luxury, new arrivals, top picks, trending, daily finds)
    - All products (paginated)
    
    Query Parameters:
    - categories_limit: Number of categories (default: 20)
    - flash_sale_limit: Number of flash sale products (default: 20)
    - luxury_limit: Number of luxury products (default: 12)
    - all_products_limit: Number of all products (default: 12)
    - all_products_page: Page number for all products (default: 1)
    
    Returns:
        JSON with all homepage sections and cache headers
        
    Performance:
        - Cached responses: <50ms (from Redis)
        - First requests: ~50-100ms (parallel database queries with indexes)
    """
    try:
        # Get query parameters
        categories_limit = request.args.get('categories_limit', 20, type=int)
        flash_sale_limit = request.args.get('flash_sale_limit', 20, type=int)
        luxury_limit = request.args.get('luxury_limit', 12, type=int)
        all_products_limit = request.args.get('all_products_limit', 12, type=int)
        all_products_page = request.args.get('all_products_page', 1, type=int)
        
        # Validate limits
        categories_limit = min(max(categories_limit, 5), 100)
        flash_sale_limit = min(max(flash_sale_limit, 5), 100)
        luxury_limit = min(max(luxury_limit, 5), 100)
        all_products_limit = min(max(all_products_limit, 5), 100)
        
        logger.debug("[Homepage Route] Received request with params: "
                    f"categories={categories_limit}, flash_sale={flash_sale_limit}")
        
        # Run async aggregator
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        homepage_data = loop.run_until_complete(
            get_homepage_data(
                categories_limit=categories_limit,
                flash_sale_limit=flash_sale_limit,
                luxury_limit=luxury_limit,
                all_products_limit=all_products_limit,
            )
        )
        
        loop.close()
        
        # Build response with cache headers
        response_data = {
            "status": "success",
            "data": homepage_data,
            "cache_key": "mizizzi:homepage:data",
        }
        
        # Create Flask response
        response = jsonify(response_data)
        
        # Add cache headers
        response.headers['X-Cache'] = 'HIT' if product_cache and product_cache.get('mizizzi:homepage:data') else 'MISS'
        response.headers['X-Cache-Key'] = 'mizizzi:homepage:data'
        response.headers['Cache-Control'] = 'public, max-age=60'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        logger.debug("[Homepage Route] Response prepared successfully")
        return response, 200
        
    except Exception as e:
        logger.error(f"[Homepage Route] Error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to load homepage data",
            "data": {
                "categories": [],
                "carousel_items": [],
                "flash_sale_products": [],
                "luxury_products": [],
                "new_arrivals": [],
                "top_picks": [],
                "trending_products": [],
                "daily_finds": [],
                "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
            }
        }), 500
