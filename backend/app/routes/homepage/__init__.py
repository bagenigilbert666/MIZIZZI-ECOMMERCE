"""Homepage Batch API Route - Single endpoint for all homepage data."""
import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import asyncio

from app.services.homepage.aggregator import get_homepage_data
from app.services.homepage.cache_utils import validate_pagination_params
from app.utils.redis_cache import product_cache

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
    - Contact CTA slides
    - All products (paginated)
    
    Query Parameters:
    - categories_limit: Number of categories (default: 20, range: 5-100)
    - flash_sale_limit: Number of flash sale products (default: 20, range: 5-100)
    - luxury_limit: Number of luxury products (default: 12, range: 5-100)
    - all_products_limit: Number of all products per page (default: 12, range: 5-100)
    - all_products_page: Page number for all products (default: 1, range: 1-1000)
    
    Returns:
        JSON with all homepage sections, cache metadata, and appropriate headers
        
    Performance:
        - Cached responses: <50ms (from Redis)
        - First requests: ~50-100ms (parallel database queries with indexes)
        
    Headers:
        - X-Cache: "HIT" or "MISS" indicating cache status
        - X-Cache-Key: The cache key used for this request
        - X-Partial-Failures: Comma-separated list of failed sections (if any)
    """
    try:
        # Get query parameters
        categories_limit = request.args.get('categories_limit', 20, type=int)
        flash_sale_limit = request.args.get('flash_sale_limit', 20, type=int)
        luxury_limit = request.args.get('luxury_limit', 12, type=int)
        all_products_limit = request.args.get('all_products_limit', 12, type=int)
        all_products_page = request.args.get('all_products_page', 1, type=int)
        
        # Validate and constrain limits
        categories_limit, flash_sale_limit, luxury_limit, all_products_limit, all_products_page = \
            validate_pagination_params(
                categories_limit,
                flash_sale_limit,
                luxury_limit,
                all_products_limit,
                all_products_page,
            )
        
        logger.debug(
            f"[Homepage Route] Received request with params: "
            f"categories={categories_limit}, flash_sale={flash_sale_limit}, "
            f"luxury={luxury_limit}, all_products={all_products_limit}, "
            f"page={all_products_page}"
        )
        
        # Run async aggregator with all parameters
        homepage_data, metadata = asyncio.run(
            get_homepage_data(
                categories_limit=categories_limit,
                flash_sale_limit=flash_sale_limit,
                luxury_limit=luxury_limit,
                all_products_limit=all_products_limit,
                all_products_page=all_products_page,
            )
        )
        
        # Build response with metadata
        response_data = {
            "status": "success",
            "data": homepage_data,
            "meta": {
                "cache_hit": metadata["cache_hit"],
                "cache_key": metadata["cache_key"],
                "partial_failures": metadata["partial_failures"],
            }
        }
        
        # Create Flask response
        response = jsonify(response_data)
        
        # Add cache headers based on actual cache metadata (not re-reading cache)
        response.headers['X-Cache'] = 'HIT' if metadata["cache_hit"] else 'MISS'
        response.headers['X-Cache-Key'] = metadata["cache_key"]
        response.headers['Cache-Control'] = 'public, max-age=60'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Add partial failures header if any
        if metadata["partial_failures"]:
            response.headers['X-Partial-Failures'] = ','.join(metadata["partial_failures"])
        
        logger.debug(
            f"[Homepage Route] Response prepared successfully "
            f"(cache: {metadata['cache_hit']}, failures: {len(metadata['partial_failures'])})"
        )
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
                "contact_cta_slides": [],
                "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
            },
            "meta": {
                "cache_hit": False,
                "cache_key": "",
                "partial_failures": ["all_sections"],
            }
        }), 500

