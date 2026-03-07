"""
Homepage Batch API Route - Single endpoint for all homepage data.

FIXES APPLIED:
- FIX #1: Uses dynamic cache key from aggregator metadata
- FIX #2: Passes all_products_page to aggregator
- FIX #4: Uses aggregator metadata for accurate X-Cache headers
- FIX #5: Clean event loop handling via sync wrapper
- FIX #6: Consistent response structure
- FIX #7: Consistent snake_case naming
"""

import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin

from app.services.homepage.aggregator import get_homepage_data_sync

logger = logging.getLogger(__name__)

homepage_routes = Blueprint('homepage_routes', __name__)


def validate_limit(value: int, min_val: int = 5, max_val: int = 100, default: int = 20) -> int:
    """Validate and clamp limit parameters."""
    if value is None:
        return default
    return min(max(value, min_val), max_val)


def validate_page(value: int, min_val: int = 1, default: int = 1) -> int:
    """Validate page parameter."""
    if value is None or value < min_val:
        return default
    return value


@homepage_routes.route('/api/homepage', methods=['GET'])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint.
    
    Query Parameters:
        categories_limit (int): Max categories to return (5-100, default 20)
        flash_sale_limit (int): Max flash sale products (5-100, default 20)
        luxury_limit (int): Max luxury products (5-100, default 12)
        new_arrivals_limit (int): Max new arrivals (5-100, default 20)
        top_picks_limit (int): Max top picks (5-100, default 20)
        trending_limit (int): Max trending products (5-100, default 20)
        daily_finds_limit (int): Max daily finds (5-100, default 20)
        all_products_limit (int): Max all products per page (5-100, default 12)
        all_products_page (int): Page number for all products (min 1, default 1)
    
    Returns:
        JSON response with all homepage sections and cache metadata.
    """
    try:
        # Get and validate query parameters
        categories_limit = validate_limit(request.args.get('categories_limit', type=int), default=20)
        flash_sale_limit = validate_limit(request.args.get('flash_sale_limit', type=int), default=20)
        luxury_limit = validate_limit(request.args.get('luxury_limit', type=int), default=12)
        new_arrivals_limit = validate_limit(request.args.get('new_arrivals_limit', type=int), default=20)
        top_picks_limit = validate_limit(request.args.get('top_picks_limit', type=int), default=20)
        trending_limit = validate_limit(request.args.get('trending_limit', type=int), default=20)
        daily_finds_limit = validate_limit(request.args.get('daily_finds_limit', type=int), default=20)
        all_products_limit = validate_limit(request.args.get('all_products_limit', type=int), default=12)
        # FIX #2: Now properly collecting and validating all_products_page
        all_products_page = validate_page(request.args.get('all_products_page', type=int), default=1)
        
        logger.debug(
            f"[Homepage Route] Request params: categories={categories_limit}, "
            f"flash_sale={flash_sale_limit}, all_products_page={all_products_page}"
        )
        
        # FIX #5: Use sync wrapper with clean event loop handling
        result = get_homepage_data_sync(
            categories_limit=categories_limit,
            flash_sale_limit=flash_sale_limit,
            luxury_limit=luxury_limit,
            new_arrivals_limit=new_arrivals_limit,
            top_picks_limit=top_picks_limit,
            trending_limit=trending_limit,
            daily_finds_limit=daily_finds_limit,
            all_products_limit=all_products_limit,
            all_products_page=all_products_page,  # FIX #2: Now passing page
        )
        
        # FIX #6: Consistent response structure
        response_data = {
            "status": "success",
            "data": result.data,
            "cache_metadata": {
                "cache_hit": result.cache_hit,
                "cache_key": result.cache_key,
                "sections_loaded": result.sections_loaded,
                "total_sections": result.total_sections,
                "partial_failures": result.partial_failures,
            },
        }
        
        response = jsonify(response_data)
        
        # FIX #4: Use aggregator metadata for accurate cache headers
        response.headers['X-Cache'] = 'HIT' if result.cache_hit else 'MISS'
        response.headers['X-Cache-Key'] = result.cache_key
        response.headers['X-Sections-Loaded'] = str(result.sections_loaded)
        response.headers['Cache-Control'] = 'public, max-age=60'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        if result.partial_failures:
            response.headers['X-Partial-Failures'] = ','.join(result.partial_failures)
        
        logger.debug(
            f"[Homepage Route] Response: cache_hit={result.cache_hit}, "
            f"sections={result.sections_loaded}/{result.total_sections}"
        )
        
        return response, 200
        
    except Exception as e:
        logger.error(f"[Homepage Route] Critical error: {e}")
        # FIX #6: Consistent error response structure
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
                "premium_experiences": [],
                "product_showcase": [],
                "contact_cta_slides": [],
                "feature_cards": [],
            },
            "cache_metadata": {
                "cache_hit": False,
                "cache_key": "",
                "sections_loaded": 0,
                "total_sections": 13,
                "partial_failures": ["critical_error"],
            },
        }), 500
