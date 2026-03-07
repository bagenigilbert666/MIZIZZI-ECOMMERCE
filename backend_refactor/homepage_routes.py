"""
Homepage Batch API Route - Single endpoint for all homepage data.

This route:
1. Accepts query parameters for customizable section limits and pagination
2. Validates and constrains parameters to safe ranges
3. Calls the aggregator to load all sections in parallel
4. Returns structured response with cache metadata
5. Sets appropriate cache headers based on cache hit status
"""
import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import asyncio

from app.services.homepage.aggregator import get_homepage_data_with_metadata
from app.utils.redis_cache import fast_json_dumps

logger = logging.getLogger(__name__)

homepage_routes = Blueprint('homepage_routes', __name__)


def _safe_int(value, default, min_val=1, max_val=100):
    """
    Safely parse integer with constraints.
    
    Args:
        value: Value to parse
        default: Default if parsing fails
        min_val: Minimum allowed value
        max_val: Maximum allowed value
    
    Returns:
        Constrained integer value
    """
    try:
        parsed = int(value)
        return max(min_val, min(parsed, max_val))
    except (ValueError, TypeError):
        return default


@homepage_routes.route('/api/homepage', methods=['GET'])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint.
    
    Query Parameters:
        - categories_limit: Number of categories (5-100, default 20)
        - flash_sale_limit: Number of flash sale products (5-100, default 20)
        - luxury_limit: Number of luxury products (5-100, default 12)
        - new_arrivals_limit: Number of new arrivals (5-100, default 20)
        - top_picks_limit: Number of top picks (5-100, default 20)
        - trending_limit: Number of trending (5-100, default 20)
        - daily_finds_limit: Number of daily finds (5-100, default 20)
        - all_products_limit: Number of products per page (5-100, default 12)
        - all_products_page: Page number for pagination (default 1)
    
    Returns:
        JSON with structure:
        {
            "status": "success" | "partial_failure" | "error",
            "data": { all homepage sections },
            "cache_metadata": {
                "cache_hit": bool,
                "cache_key": str,
                "partial_failures": [list of sections],
                "sections_loaded": int
            }
        }
    """
    try:
        # Extract and validate query parameters
        categories_limit = _safe_int(
            request.args.get('categories_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        flash_sale_limit = _safe_int(
            request.args.get('flash_sale_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        luxury_limit = _safe_int(
            request.args.get('luxury_limit'),
            default=12,
            min_val=5,
            max_val=100
        )
        new_arrivals_limit = _safe_int(
            request.args.get('new_arrivals_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        top_picks_limit = _safe_int(
            request.args.get('top_picks_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        trending_limit = _safe_int(
            request.args.get('trending_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        daily_finds_limit = _safe_int(
            request.args.get('daily_finds_limit'),
            default=20,
            min_val=5,
            max_val=100
        )
        all_products_limit = _safe_int(
            request.args.get('all_products_limit'),
            default=12,
            min_val=5,
            max_val=100
        )
        all_products_page = _safe_int(
            request.args.get('all_products_page'),
            default=1,
            min_val=1,
            max_val=1000
        )
        
        logger.debug(
            f"[Homepage Route] Request params: cat={categories_limit}, "
            f"flash={flash_sale_limit}, lux={luxury_limit}, page={all_products_page}"
        )
        
        # Create a new event loop for this request
        # Use asyncio.run() for cleaner event loop management
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Call aggregator with metadata
            result = loop.run_until_complete(
                get_homepage_data_with_metadata(
                    categories_limit=categories_limit,
                    flash_sale_limit=flash_sale_limit,
                    luxury_limit=luxury_limit,
                    new_arrivals_limit=new_arrivals_limit,
                    top_picks_limit=top_picks_limit,
                    trending_limit=trending_limit,
                    daily_finds_limit=daily_finds_limit,
                    all_products_limit=all_products_limit,
                    all_products_page=all_products_page,
                )
            )
        finally:
            loop.close()
        
        # Extract data and metadata
        homepage_data = result.get("data", {})
        cache_metadata = result.get("meta", {})
        
        # Determine status based on partial failures
        partial_failures = cache_metadata.get("partial_failures", [])
        if partial_failures:
            status = "partial_failure" if len(partial_failures) < 13 else "error"
        else:
            status = "success"
        
        # Build response
        response_data = {
            "status": status,
            "data": homepage_data,
            "cache_metadata": cache_metadata,
        }
        
        # Create Flask response
        response = jsonify(response_data)
        
        # Set cache headers based on cache hit status
        cache_hit = cache_metadata.get("cache_hit", False)
        cache_key = cache_metadata.get("cache_key", "")
        
        response.headers['X-Cache'] = 'HIT' if cache_hit else 'MISS'
        if cache_key:
            response.headers['X-Cache-Key'] = cache_key
        response.headers['Cache-Control'] = 'public, max-age=60'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        logger.debug(
            f"[Homepage Route] Response status={status}, cache={cache_hit}, "
            f"sections={cache_metadata.get('sections_loaded', 0)}/13"
        )
        
        return response, 200
        
    except Exception as e:
        logger.error(f"[Homepage Route] Error: {e}")
        
        # Return safe fallback with proper status
        fallback_response = {
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
                "all_products": {
                    "products": [],
                    "has_more": False,
                    "total": 0,
                    "page": 1,
                },
                "premium_experiences": [],
                "product_showcase": [],
                "contact_cta_slides": [],
                "feature_cards": [],
            },
            "cache_metadata": {
                "cache_hit": False,
                "cache_key": "",
                "partial_failures": [],
                "sections_loaded": 0,
            }
        }
        
        response = jsonify(fallback_response)
        response.headers['Cache-Control'] = 'no-cache'
        
        return response, 500
