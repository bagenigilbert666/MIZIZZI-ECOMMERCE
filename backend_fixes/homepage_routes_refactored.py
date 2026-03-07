"""
Homepage Batch API Route - Refactored

Fixes for Issues #1, #4, #5, #6:
- Dynamic cache key from aggregator (not re-read)
- Clean async handling (try/finally pattern)
- Cache metadata from aggregator used in headers
- Consistent response shape for success and error
"""
import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import asyncio

from app.services.homepage.aggregator import get_homepage_data

logger = logging.getLogger(__name__)

homepage_routes = Blueprint('homepage_routes', __name__)


@homepage_routes.route('/api/homepage', methods=['GET'])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint.
    
    Query Parameters (all optional):
        categories_limit: int (default: 20, min: 5, max: 100)
        flash_sale_limit: int (default: 20, min: 5, max: 100)
        luxury_limit: int (default: 12, min: 5, max: 100)
        new_arrivals_limit: int (default: 20, min: 5, max: 100)
        top_picks_limit: int (default: 20, min: 5, max: 100)
        trending_limit: int (default: 20, min: 5, max: 100)
        daily_finds_limit: int (default: 20, min: 5, max: 100)
        all_products_limit: int (default: 12, min: 5, max: 100)
        all_products_page: int (default: 1, min: 1)
    
    Returns:
        {
            "status": "success" | "partial" | "error",
            "data": { all homepage sections },
            "meta": {
                "cache_hit": bool,
                "cache_key": str,
                "partial_failures": []
            }
        }
    """
    loop = None
    try:
        # Parse and validate query parameters
        categories_limit = request.args.get('categories_limit', 20, type=int)
        flash_sale_limit = request.args.get('flash_sale_limit', 20, type=int)
        luxury_limit = request.args.get('luxury_limit', 12, type=int)
        new_arrivals_limit = request.args.get('new_arrivals_limit', 20, type=int)
        top_picks_limit = request.args.get('top_picks_limit', 20, type=int)
        trending_limit = request.args.get('trending_limit', 20, type=int)
        daily_finds_limit = request.args.get('daily_finds_limit', 20, type=int)
        all_products_limit = request.args.get('all_products_limit', 12, type=int)
        all_products_page = request.args.get('all_products_page', 1, type=int)  # FIX #2: Now used
        
        # Validate limits (min/max constraints)
        categories_limit = min(max(categories_limit, 5), 100)
        flash_sale_limit = min(max(flash_sale_limit, 5), 100)
        luxury_limit = min(max(luxury_limit, 5), 100)
        new_arrivals_limit = min(max(new_arrivals_limit, 5), 100)
        top_picks_limit = min(max(top_picks_limit, 5), 100)
        trending_limit = min(max(trending_limit, 5), 100)
        daily_finds_limit = min(max(daily_finds_limit, 5), 100)
        all_products_limit = min(max(all_products_limit, 5), 100)
        all_products_page = max(all_products_page, 1)  # Page must be >= 1
        
        logger.debug(
            f"[Homepage Route] Received request with params: "
            f"categories={categories_limit}, flash_sale={flash_sale_limit}, "
            f"luxury={luxury_limit}, all_products_page={all_products_page}"
        )
        
        # FIX #5: Cleaner async execution with proper cleanup
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Call refactored aggregator that returns data + metadata
        result = loop.run_until_complete(
            get_homepage_data(
                categories_limit=categories_limit,
                flash_sale_limit=flash_sale_limit,
                luxury_limit=luxury_limit,
                new_arrivals_limit=new_arrivals_limit,
                top_picks_limit=top_picks_limit,
                trending_limit=trending_limit,
                daily_finds_limit=daily_finds_limit,
                all_products_limit=all_products_limit,
                all_products_page=all_products_page,  # FIX #2: Now passed through
            )
        )
        
        # Extract data and metadata
        homepage_data = result.get("data", {})
        cache_meta = result.get("meta", {})
        
        # Determine response status based on failures
        status = "success"
        if cache_meta.get("partial_failures"):
            status = "partial"
        
        # FIX #4: Use cache metadata from aggregator (not re-read from cache)
        # FIX #6: Consistent response shape for success
        response_data = {
            "status": status,
            "data": homepage_data,
            "meta": {
                "cache_hit": cache_meta.get("cache_hit", False),
                "cache_key": cache_meta.get("cache_key", "unknown"),
                "partial_failures": cache_meta.get("partial_failures", [])
            }
        }
        
        # Create Flask response
        response = jsonify(response_data)
        
        # FIX #4: Use cache metadata from aggregator
        cache_hit = cache_meta.get("cache_hit", False)
        response.headers['X-Cache'] = 'HIT' if cache_hit else 'MISS'
        response.headers['X-Cache-Key'] = cache_meta.get("cache_key", "unknown")
        response.headers['Cache-Control'] = 'public, max-age=60'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        logger.debug(
            f"[Homepage Route] Response prepared. "
            f"Cache: {cache_hit and 'HIT' or 'MISS'}, "
            f"Status: {status}"
        )
        
        return response, 200
        
    except Exception as e:
        logger.error(f"[Homepage Route] Error: {e}", exc_info=True)
        
        # FIX #6: Consistent fallback response shape
        error_response = {
            "status": "error",
            "data": {
                "categories": [],
                "carousel_items": [],
                "flash_sale_products": [],
                "luxury_products": [],
                "new_arrivals": [],
                "top_picks": [],
                "trending_products": [],
                "daily_finds": [],
                "premium_experiences": [],
                "product_showcase": [],
                "contact_cta_slides": [],
                "feature_cards": [],
                "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
            },
            "meta": {
                "cache_hit": False,
                "cache_key": "unknown",
                "partial_failures": [{"section": "aggregator", "error": str(e)}]
            }
        }
        
        return jsonify(error_response), 500
        
    finally:
        # FIX #5: Always clean up event loop
        if loop:
            loop.close()
