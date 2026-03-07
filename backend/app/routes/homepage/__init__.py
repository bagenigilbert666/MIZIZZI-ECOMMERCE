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

from app.services.homepage.aggregator import get_homepage_data, get_homepage_critical_data
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


@homepage_routes.route('/api/homepage/critical', methods=['GET'])
@cross_origin()
def get_homepage_critical():
    """
    LIGHTWEIGHT CRITICAL PATH ENDPOINT - Fast first paint data only.
    
    Purpose:
    - Fetch ONLY 4 critical sections needed for above-the-fold rendering
    - Complete in ~300-800ms on cold start (vs ~3-5s for full endpoint)
    - Cached in <50ms on warm start
    - Frontend becomes interactive before deferred sections load
    
    Critical sections returned:
    - categories: Navigation categories (20 default)
    - carousel_items: Hero carousel banners (5 default)
    - flash_sale_products: Flash sale products (20 default)
    
    NOT returned:
    - Luxury, Top Picks, New Arrivals, Trending, Daily Finds (deferred)
    - All Products (deferred)
    - Contact CTA, Premium Experiences, Product Showcase, Feature Cards (deferred)
    
    Query Parameters (all optional):
    - categories_limit: Number of categories (default: 20, range: 5-100)
    - carousel_limit: Number of carousel items (default: 5, range: 1-20)
    - flash_sale_limit: Number of flash sale products (default: 20, range: 5-100)
    
    Response:
    - Same structure as /api/homepage but ONLY 3 sections populated
    - Other sections return as empty arrays
    - Metadata includes cache status, timing, failures
    
    Performance:
    - Cached responses: <50ms (from Redis)
    - First requests: ~300-800ms (3 fast parallel DB queries)
    - Significantly faster than full /api/homepage endpoint
    
    Use Case:
    - Frontend first paint: Fetch /api/homepage/critical immediately
    - User sees interactive homepage in ~2-3s instead of ~5-8s
    - Then fetch full /api/homepage for deferred sections
    """
    try:
        # Get query parameters
        categories_limit = request.args.get('categories_limit', 20, type=int)
        carousel_limit = request.args.get('carousel_limit', 5, type=int)
        flash_sale_limit = request.args.get('flash_sale_limit', 20, type=int)
        
        # Validate limits
        categories_limit = max(5, min(100, categories_limit))
        carousel_limit = max(1, min(20, carousel_limit))
        flash_sale_limit = max(5, min(100, flash_sale_limit))
        
        logger.debug(
            f"[Homepage Critical Route] Received request with params: "
            f"cat={categories_limit}, carousel={carousel_limit}, flash={flash_sale_limit}"
        )
        
        # Build cache key for critical data only (different from full homepage key)
        # This way critical and full cache don't collide
        critical_cache_key = f"mizizzi:homepage:critical:cat_{categories_limit}:carousel_{carousel_limit}:flash_{flash_sale_limit}"
        
        # Check for cache hit BEFORE aggregation
        cache_hit = False
        cached_data = None
        
        if product_cache:
            try:
                cached_data = product_cache.get(critical_cache_key)
                if cached_data is not None:
                    cache_hit = True
                    logger.info(
                        f"[Homepage Critical Route] Cache HIT for key: {critical_cache_key} "
                        f"(aggregation SKIPPED)"
                    )
            except Exception as e:
                logger.warning(f"[Homepage Critical Route] Cache read error: {e}")
                cached_data = None
        
        # Use cached data if available, otherwise run aggregation
        if cache_hit and cached_data:
            critical_data = cached_data
            metadata = {
                "all_succeeded": True,
                "cache_key": critical_cache_key,
                "cache_written": False,
                "partial_failures": [],
                "aggregation_time_ms": 0,
            }
            logger.debug(f"[Homepage Critical Route] Using cached response")
        else:
            # Cache miss - run critical aggregation
            logger.debug(f"[Homepage Critical Route] Cache MISS - running critical aggregation")
            critical_data, metadata = get_homepage_critical_data(
                categories_limit=categories_limit,
                carousel_limit=carousel_limit,
                flash_sale_limit=flash_sale_limit,
                cache_key=critical_cache_key,
            )
        
        # Build response
        response_data = {
            "status": "success",
            "data": critical_data,
            "meta": {
                "all_succeeded": metadata["all_succeeded"],
                "cache_key": metadata["cache_key"],
                "cache_written": metadata.get("cache_written", False),
                "partial_failures": metadata["partial_failures"],
                "aggregation_time_ms": metadata["aggregation_time_ms"],
                "is_critical": True,  # Mark this as critical path response
            }
        }
        
        response = jsonify(response_data)
        
        # Cache header matching critical TTL (2 minutes)
        response.headers['Cache-Control'] = 'public, max-age=120'
        
        # X-Cache status
        if cache_hit:
            response.headers['X-Cache'] = 'HIT'
        elif metadata["all_succeeded"] and metadata.get("cache_written", False):
            response.headers['X-Cache'] = 'MISS'
        else:
            response.headers['X-Cache'] = 'BYPASS'
        
        response.headers['X-Cache-Key'] = metadata["cache_key"] or "no-cache"
        response.headers['X-Aggregation-Time-Ms'] = str(metadata["aggregation_time_ms"])
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        if metadata["partial_failures"]:
            failed_sections = ",".join([f["section"] for f in metadata["partial_failures"]])
            response.headers['X-Partial-Failures'] = failed_sections
        
        logger.debug(
            f"[Homepage Critical Route] Response prepared successfully "
            f"(X-Cache: {response.headers.get('X-Cache')}, time: {metadata['aggregation_time_ms']}ms)"
        )
        return response, 200
        
    except Exception as e:
        logger.error(f"[Homepage Critical Route] Error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to load critical homepage data",
            "data": {
                "categories": [],
                "carousel_items": [],
                "flash_sale_products": [],
            },
            "meta": {
                "all_succeeded": False,
                "cache_key": "",
                "cache_written": False,
                "partial_failures": [{"section": "critical_all", "error": str(e)}],
                "aggregation_time_ms": 0,
                "is_critical": True,
            }
        }), 500
