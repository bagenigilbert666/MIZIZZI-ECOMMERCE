"""Homepage Batch API Route - Single endpoint for all homepage data.

Correct Cache-Control header strategy:
- HOMEPAGE_CACHE_TTL in cache_utils.py = 180 seconds (3 minutes)
- Cache-Control header must match: max-age=180
- Prevents misalignment between server cache and proxy/browser cache
- If you change HOMEPAGE_CACHE_TTL, update this header too!
"""
import logging
from flask import Blueprint, jsonify, request
from flask_cors import cross_origin

from app.services.homepage.aggregator import get_homepage_data
from app.services.homepage.cache_utils import (
    validate_pagination_params,
    get_empty_homepage_data,
    build_homepage_cache_key,
)
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

homepage_routes = Blueprint('homepage_routes', __name__)


@homepage_routes.route('/api/homepage', methods=['GET'])
@cross_origin()
def get_homepage():
    """
    Unified homepage batch endpoint for all 13 sections.
    
    Fetches all homepage sections in parallel:
    - Categories
    - Carousel items  
    - Flash sale products
    - Featured products (luxury, new arrivals, top picks, trending, daily finds)
    - All products (paginated)
    - Contact CTA slides
    - Premium experiences
    - Product showcase
    - Feature cards
    
    Query Parameters (all optional, with safe defaults):
    - categories_limit: Number of categories (default: 20, range: 5-100)
    - flash_sale_limit: Number of flash sale products (default: 20, range: 5-100)
    - luxury_limit: Number of luxury products (default: 12, range: 5-100)
    - new_arrivals_limit: Number of new arrivals (default: 20, range: 5-100)
    - top_picks_limit: Number of top picks (default: 20, range: 5-100)
    - trending_limit: Number of trending products (default: 20, range: 5-100)
    - daily_finds_limit: Number of daily finds (default: 20, range: 5-100)
    - all_products_limit: Number of all products per page (default: 12, range: 5-100)
    - all_products_page: Page number for all products (default: 1, range: 1-1000)
    
    Returns:
        JSON with all 13 homepage sections, cache metadata, and appropriate headers
        
    Performance:
        - Cached responses: <50ms (from Redis)
        - First requests: ~50-200ms (parallel database queries with indexes)
        
    Response Headers:
        - X-Cache: "HIT" or "MISS" indicating cache status
        - X-Cache-Key: The unique cache key based on all 9 parameters
        - X-Partial-Failures: Comma-separated list of failed sections (if any)
        
    Architecture:
        - Dynamic cache key includes all 9 parameters (prevents cache poisoning)
        - Individual section failures don't block others (graceful degradation)
        - Metadata includes cache_hit, cache_key, and partial_failures (accurate status)
        - Uses asyncio.run() for safe Flask integration
    """
    try:
        # Get query parameters for all 9 sections
        categories_limit = request.args.get('categories_limit', 20, type=int)
        flash_sale_limit = request.args.get('flash_sale_limit', 20, type=int)
        luxury_limit = request.args.get('luxury_limit', 12, type=int)
        new_arrivals_limit = request.args.get('new_arrivals_limit', 20, type=int)
        top_picks_limit = request.args.get('top_picks_limit', 20, type=int)
        trending_limit = request.args.get('trending_limit', 20, type=int)
        daily_finds_limit = request.args.get('daily_finds_limit', 20, type=int)
        all_products_limit = request.args.get('all_products_limit', 12, type=int)
        all_products_page = request.args.get('all_products_page', 1, type=int)
        
        # Validate and constrain ALL limits to safe ranges
        (categories_limit, flash_sale_limit, luxury_limit, new_arrivals_limit,
         top_picks_limit, trending_limit, daily_finds_limit, all_products_limit, 
         all_products_page) = validate_pagination_params(
            categories_limit,
            flash_sale_limit,
            luxury_limit,
            new_arrivals_limit,
            top_picks_limit,
            trending_limit,
            daily_finds_limit,
            all_products_limit,
            all_products_page,
        )
        
        logger.debug(
            f"[Homepage Route] Received request with 9 params: "
            f"cat={categories_limit}, flash={flash_sale_limit}, lux={luxury_limit}, "
            f"arr={new_arrivals_limit}, top={top_picks_limit}, trend={trending_limit}, "
            f"daily={daily_finds_limit}, all={all_products_limit}, page={all_products_page}"
        )
        
        # SAFEGUARD #3: TOP-LEVEL CACHE FAST-PATH
        # Compute cache key FIRST using same function as aggregator
        # Check Redis BEFORE calling aggregator - skip aggregation entirely on hit
        cache_key = build_homepage_cache_key(
            categories_limit, flash_sale_limit, luxury_limit, new_arrivals_limit,
            top_picks_limit, trending_limit, daily_finds_limit, all_products_limit,
            all_products_page
        )
        
        # Check for cache hit BEFORE aggregation
        cache_hit = False
        cached_data = None
        
        if product_cache:
            try:
                cached_data = product_cache.get(cache_key)
                if cached_data is not None:
                    cache_hit = True
                    logger.info(
                        f"[Homepage Route] Cache HIT for key: {cache_key} "
                        f"(aggregation SKIPPED)"
                    )
            except Exception as e:
                logger.warning(f"[Homepage Route] Cache read error: {e}")
                cached_data = None
        
        # Use cached data if available, otherwise run aggregation
        if cache_hit and cached_data:
            homepage_data = cached_data
            # Build minimal metadata for cached response
            metadata = {
                "all_succeeded": True,
                "cache_key": cache_key,
                "cache_written": False,
                "partial_failures": [],
                "aggregation_time_ms": 0,
            }
            logger.debug(f"[Homepage Route] Using cached response")
        else:
            # Cache miss or read error - run aggregation with cache_key
            logger.debug(f"[Homepage Route] Cache MISS - running aggregation")
            homepage_data, metadata = get_homepage_data(
                categories_limit=categories_limit,
                flash_sale_limit=flash_sale_limit,
                luxury_limit=luxury_limit,
                new_arrivals_limit=new_arrivals_limit,
                top_picks_limit=top_picks_limit,
                trending_limit=trending_limit,
                daily_finds_limit=daily_finds_limit,
                all_products_limit=all_products_limit,
                all_products_page=all_products_page,
                cache_key=cache_key,
            )
        
        # Build response with metadata from aggregator
        response_data = {
            "status": "success",
            "data": homepage_data,
            "meta": {
                "all_succeeded": metadata["all_succeeded"],
                "cache_key": metadata["cache_key"],
                "cache_written": metadata.get("cache_written", False),
                "partial_failures": metadata["partial_failures"],
                "aggregation_time_ms": metadata["aggregation_time_ms"],
            }
        }
        
        # Create Flask response
        response = jsonify(response_data)
        
        # Set Cache-Control header to match ACTUAL top-level cache TTL (180s, not 60s)
        # The aggregator uses HOMEPAGE_CACHE_TTL = 180 seconds
        # This header must match that TTL for correct cache behavior in proxies/browsers
        response.headers['Cache-Control'] = 'public, max-age=180'
        
        # STANDARDIZE X-Cache Header:
        # HIT → served from Redis top-level cache (fast-path, aggregation skipped)
        # MISS → rebuilt homepage and cached (aggregation completed, all succeeded)
        # BYPASS → rebuilt homepage but not cached (failures detected)
        if cache_hit:
            response.headers['X-Cache'] = 'HIT'
        elif metadata["all_succeeded"] and metadata.get("cache_written", False):
            response.headers['X-Cache'] = 'MISS'
        else:
            response.headers['X-Cache'] = 'BYPASS'
        
        response.headers['X-Cache-Key'] = metadata["cache_key"] or "no-cache"
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Aggregation-Time-Ms'] = str(metadata["aggregation_time_ms"])
        
        # Add partial failures header if any sections failed
        if metadata["partial_failures"]:
            failed_sections = ",".join([f["section"] for f in metadata["partial_failures"]])
            response.headers['X-Partial-Failures'] = failed_sections
        
        logger.debug(
            f"[Homepage Route] Response prepared successfully "
            f"(X-Cache: {response.headers.get('X-Cache')}, all_succeeded: {metadata['all_succeeded']}, "
            f"failures: {len(metadata['partial_failures'])})"
        )
        return response, 200
        
        
    except Exception as e:
        logger.error(f"[Homepage Route] Error: {e}")
        # Use shared empty fallback helper for consistent response shape
        return jsonify({
            "status": "error",
            "message": "Failed to load homepage data",
            "data": get_empty_homepage_data(),
            "meta": {
                "all_succeeded": False,
                "cache_key": "",
                "cache_written": False,
                "partial_failures": [{"section": "all_sections", "error": str(e)}],
                "aggregation_time_ms": 0,
            }
        }), 500

