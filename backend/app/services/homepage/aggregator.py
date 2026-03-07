"""
Homepage Aggregator - Safe Synchronous Batch Loader

DESIGN PHILOSOPHY:
- Synchronous execution in Flask request context (no threading)
- Explicit failure tracking at aggregator level
- Aggregator-side wrappers catch all exceptions
- Cache only on complete success (ALL sections succeed)
- No hidden failures - partial_failures always accurate
- Safe cache writes wrapped in try/except
- Comments explain why sync instead of async/threads

Why Synchronous (Not Async/Threads)?
1. Flask request context is NOT thread-safe for DB operations
2. Threading with ThreadPoolExecutor breaks Flask application context errors
3. Application context missing in threads = "Working outside of application context" errors
4. Synchronous code in Flask is simpler and correct by default
5. Database queries are already optimized (indexes, Redis caching)
6. Sequential execution with proper caching is the safest approach

Performance is achieved through:
- Redis caching at section level (each has individual TTL)
- Database indexes on commonly queried columns
- Top-level cache (180s) prevents redundant aggregation
- Pagination + limits prevent large result sets

Result: Safe, correct, maintainable code that works reliably in Flask.
"""

import logging
import time
from typing import Tuple, Dict, Any

from app.services.homepage.cache_utils import (
    get_empty_homepage_data,
    build_homepage_cache_key,
    HOMEPAGE_CACHE_TTL,
    CRITICAL_SECTIONS,
)
from app.services.homepage.get_homepage_categories import get_homepage_categories
from app.services.homepage.get_homepage_carousel import get_homepage_carousel
from app.services.homepage.get_homepage_flash_sale import get_homepage_flash_sale
from app.services.homepage.get_homepage_featured import (
    get_homepage_luxury,
    get_homepage_new_arrivals,
    get_homepage_top_picks,
    get_homepage_trending,
    get_homepage_daily_finds,
)
from app.services.homepage.get_homepage_all_products import get_homepage_all_products
from app.services.homepage.get_homepage_contact_cta_slides import get_homepage_contact_cta_slides
from app.services.homepage.get_homepage_premium_experiences import get_homepage_premium_experiences
from app.services.homepage.get_homepage_product_showcase import get_homepage_product_showcase
from app.services.homepage.get_homepage_feature_cards import get_homepage_feature_cards
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)


def load_section_safe(
    section_name: str,
    loader_func,
    *args,
    **kwargs
) -> Tuple[Any, bool, str]:
    """
    AGGREGATOR-SIDE WRAPPER: Calls a section loader safely.
    
    Catches ANY exception from the loader and records failure centrally.
    Loader functions are NOT modified - they remain reusable elsewhere.
    This wrapper provides unified failure tracking without changing loader contracts.
    
    Args:
        section_name: Name of section being loaded (for logging/tracking)
        loader_func: The section loader function to call
        *args: Positional arguments for the loader
        **kwargs: Keyword arguments for the loader
        
    Returns:
        Tuple of (data, success_flag, error_msg):
            - data: Result from loader on success, or empty list/dict on failure
            - success_flag: True if loader succeeded, False if exception occurred
            - error_msg: Empty string on success, error description on failure
    """
    try:
        logger.debug(f"[Homepage] Loading section: {section_name}")
        data = loader_func(*args, **kwargs)
        logger.debug(f"[Homepage] Section loaded successfully: {section_name}")
        return (data, True, "")
        
    except Exception as e:
        # Log the error with full context
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"[Homepage] Failed to load {section_name}: {error_msg}")
        
        # Return empty data structure appropriate to the section
        # Determine based on section name what empty structure to return
        if section_name == "all_products":
            empty_data = {"products": [], "has_more": False, "total": 0, "page": 1}
        else:
            empty_data = []
        
        return (empty_data, False, error_msg)


def get_homepage_data(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
    cache_key: str = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    SAFE SYNCHRONOUS AGGREGATOR: Loads all 13 homepage sections sequentially.
    
    WHY SYNCHRONOUS (Not Parallel/Async)?
    =====================================
    - Flask request context is NOT thread-safe for DB operations
    - ThreadPoolExecutor causes "Working outside of application context" errors
    - Sequential execution inside Flask request context is reliable and correct
    - Performance achieved through Redis caching + database indexes, not threading
    
    FAILURE TRACKING (Accurate):
    ============================
    - Each section wrapped with load_section_safe() for explicit exception handling
    - Any loader exception marked as real failure immediately
    - partial_failures list populated accurately with error details
    - all_succeeded = True only when EVERY section succeeds
    
    CACHE SAFETY (Guaranteed):
    ==========================
    - Top-level response cached ONLY if all_succeeded = True
    - If ANY section fails, cache is NOT written (no broken responses)
    - Cache writes wrapped in try/except (cache errors don't break response)
    - Partial failures are never cached
    
    Args:
        All 9 pagination parameters that affect output
        cache_key: Pre-computed cache key from caller (MUST match build_homepage_cache_key)
        
    Returns:
        Tuple of (homepage_data, metadata):
            - homepage_data: Dict with all 13 sections
            - metadata: Dict with timing, cache info, failure list
    """
    start_time = time.time()
    
    # Start with empty response structure as fallback
    homepage_data = get_empty_homepage_data()
    
    # Track success/failure for each section
    # Format: {section_name: (success: bool, error_msg: str)}
    section_results = {}
    
    logger.info("[Homepage] Starting aggregation (synchronous sequential load)")
    
    # SAFE SYNCHRONOUS LOADING: Sequential calls with aggregator-side wrappers
    # Each loader is called once in Flask request context, exceptions caught here
    
    # Load all 13 sections sequentially with explicit failure tracking
    categories, success, error = load_section_safe(
        "categories", get_homepage_categories, categories_limit
    )
    section_results["categories"] = (success, error)
    homepage_data["categories"] = categories
    
    carousel_items, success, error = load_section_safe(
        "carousel_items", get_homepage_carousel
    )
    section_results["carousel_items"] = (success, error)
    homepage_data["carousel_items"] = carousel_items
    
    flash_sale, success, error = load_section_safe(
        "flash_sale_products", get_homepage_flash_sale, flash_sale_limit
    )
    section_results["flash_sale_products"] = (success, error)
    homepage_data["flash_sale_products"] = flash_sale
    
    luxury, success, error = load_section_safe(
        "luxury_products", get_homepage_luxury, luxury_limit
    )
    section_results["luxury_products"] = (success, error)
    homepage_data["luxury_products"] = luxury
    
    new_arrivals, success, error = load_section_safe(
        "new_arrivals", get_homepage_new_arrivals, new_arrivals_limit
    )
    section_results["new_arrivals"] = (success, error)
    homepage_data["new_arrivals"] = new_arrivals
    
    top_picks, success, error = load_section_safe(
        "top_picks", get_homepage_top_picks, top_picks_limit
    )
    section_results["top_picks"] = (success, error)
    homepage_data["top_picks"] = top_picks
    
    trending, success, error = load_section_safe(
        "trending_products", get_homepage_trending, trending_limit
    )
    section_results["trending_products"] = (success, error)
    homepage_data["trending_products"] = trending
    
    daily_finds, success, error = load_section_safe(
        "daily_finds", get_homepage_daily_finds, daily_finds_limit
    )
    section_results["daily_finds"] = (success, error)
    homepage_data["daily_finds"] = daily_finds
    
    contact_cta, success, error = load_section_safe(
        "contact_cta_slides", get_homepage_contact_cta_slides
    )
    section_results["contact_cta_slides"] = (success, error)
    homepage_data["contact_cta_slides"] = contact_cta
    
    premium_exp, success, error = load_section_safe(
        "premium_experiences", get_homepage_premium_experiences
    )
    section_results["premium_experiences"] = (success, error)
    homepage_data["premium_experiences"] = premium_exp
    
    product_showcase, success, error = load_section_safe(
        "product_showcase", get_homepage_product_showcase
    )
    section_results["product_showcase"] = (success, error)
    homepage_data["product_showcase"] = product_showcase
    
    feature_cards, success, error = load_section_safe(
        "feature_cards", get_homepage_feature_cards
    )
    section_results["feature_cards"] = (success, error)
    homepage_data["feature_cards"] = feature_cards
    
    all_products, success, error = load_section_safe(
        "all_products", get_homepage_all_products, all_products_limit, all_products_page
    )
    section_results["all_products"] = (success, error)
    homepage_data["all_products"] = all_products
    
    # FAILURE TRACKING: Determine if ANY section failed
    failed_sections = [
        section_name for section_name, (success, _) in section_results.items()
        if not success
    ]
    
    all_succeeded = len(failed_sections) == 0
    
    # BUILD METADATA
    elapsed_time = (time.time() - start_time) * 1000  # Convert to ms
    
    # ACCURATE LOGGING: Only log success if truly all sections succeeded
    if all_succeeded:
        logger.info(f"[Homepage] All sections loaded successfully (aggregation took {elapsed_time:.1f}ms)")
    else:
        logger.warning(
            f"[Homepage] Aggregation completed with failures: {failed_sections} "
            f"(took {elapsed_time:.1f}ms)"
        )
    
    # Build partial_failures list with error details
    partial_failures = []
    for section_name, (success, error_msg) in section_results.items():
        if not success:
            partial_failures.append({
                "section": section_name,
                "error": error_msg
            })
    
    # CACHE ONLY ON COMPLETE SUCCESS
    # If ANY section failed, DO NOT cache the response
    # This prevents serving broken responses from cache
    cache_written = False
    
    if all_succeeded and product_cache and cache_key:
        # SAFE CACHE WRITE: Wrap in try/except so cache errors don't break response
        try:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
            cache_written = True
            logger.debug(f"[Homepage] Response cached with key: {cache_key}")
        except Exception as e:
            # Cache write failed - log it but don't break the response
            logger.error(f"[Homepage] Failed to cache response: {e}")
            cache_written = False
    elif not all_succeeded:
        logger.info(f"[Homepage] Not caching response - failures detected: {failed_sections}")
    elif not cache_key:
        logger.warning("[Homepage] Cache key not provided - response not cached")
    
    # BUILD RESPONSE METADATA
    metadata = {
        "all_succeeded": all_succeeded,
        "partial_failures": partial_failures,
        "sections_loaded": len([s for s, (success, _) in section_results.items() if success]),
        "sections_failed": len(failed_sections),
        "cache_key": cache_key,
        "cache_written": cache_written,
        "aggregation_time_ms": round(elapsed_time, 1),
    }
    
    return (homepage_data, metadata)


def get_homepage_critical_data(
    categories_limit: int = 20,
    carousel_limit: int = 5,
    flash_sale_limit: int = 20,
    cache_key: str = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    SAFE SYNCHRONOUS CRITICAL PATH AGGREGATOR: Loads ONLY 3 critical sections.
    
    Purpose:
    - Fetch only above-the-fold data needed for first paint
    - Separate from deferred data to enable true staged loading
    - Completes in ~200-500ms on cold start (faster than full 25-50s)
    - Returns cached in <50ms on warm start
    
    SAFE SYNCHRONOUS LOADING:
    - Categories, Carousel, Flash Sale load sequentially in Flask context
    - Same reliability guarantees as full aggregator
    - No "Working outside of application context" errors
    
    Critical sections (always visible):
    1. Categories - Navigation
    2. Carousel - Hero banner
    3. Flash Sale - Promo block
    
    WHAT THIS DOESN'T FETCH:
    - Luxury, Top picks, New arrivals, Trending, Daily finds, All products
    - Contact CTA, Premium experiences, Product showcase, Feature cards
    
    Those load AFTER critical data (frontend fetches full /api/homepage).
    
    Args:
        categories_limit: Number of categories to fetch
        carousel_limit: Number of carousel items
        flash_sale_limit: Number of flash sale products
        cache_key: Pre-computed cache key for critical data
        
    Returns:
        Tuple of (critical_data, metadata)
    """
    start_time = time.time()
    
    critical_data = {
        "categories": [],
        "carousel_items": [],
        "flash_sale_products": [],
    }
    
    section_results = {}
    partial_failures = []
    
    logger.info("[Homepage Critical] Starting critical path aggregation (synchronous)")
    
    # SAFE SYNCHRONOUS LOADING: Load 3 critical sections sequentially
    # Sequential execution in Flask context is reliable and safe
    
    # 1. CATEGORIES
    categories, success, error = load_section_safe(
        "categories", get_homepage_categories, categories_limit
    )
    section_results["categories"] = (success, error)
    critical_data["categories"] = categories
    
    # 2. CAROUSEL
    carousel_items, success, error = load_section_safe(
        "carousel_items", get_homepage_carousel
    )
    section_results["carousel_items"] = (success, error)
    critical_data["carousel_items"] = carousel_items
    
    # 3. FLASH SALE
    flash_sale, success, error = load_section_safe(
        "flash_sale_products", get_homepage_flash_sale, flash_sale_limit
    )
    section_results["flash_sale_products"] = (success, error)
    critical_data["flash_sale_products"] = flash_sale
    
    # FAILURE TRACKING
    failed_sections = [
        section_name for section_name, (success, _) in section_results.items()
        if not success
    ]
    
    all_succeeded = len(failed_sections) == 0
    
    elapsed_time = (time.time() - start_time) * 1000
    
    # Build partial_failures list
    for section_name, (success, error_msg) in section_results.items():
        if not success:
            partial_failures.append({
                "section": section_name,
                "error": error_msg
            })
    
    # ACCURATE LOGGING
    if all_succeeded:
        logger.info(f"[Homepage Critical] All critical sections loaded in {elapsed_time:.1f}ms")
    else:
        logger.warning(
            f"[Homepage Critical] Critical aggregation completed with failures: {failed_sections} "
            f"(took {elapsed_time:.1f}ms)"
        )
    
    # CACHING: Only cache if ALL critical sections succeeded
    cache_written = False
    
    if all_succeeded and product_cache and cache_key:
        try:
            critical_cache_ttl = 120  # 2 minutes for critical cache
            product_cache.set(cache_key, critical_data, critical_cache_ttl)
            cache_written = True
            logger.debug(f"[Homepage Critical] Response cached with key: {cache_key}")
        except Exception as e:
            logger.error(f"[Homepage Critical] Failed to cache response: {e}")
            cache_written = False
    elif not all_succeeded:
        logger.info(f"[Homepage Critical] Not caching response - failures detected: {failed_sections}")
    elif not cache_key:
        logger.warning("[Homepage Critical] Cache key not provided - response not cached")
    
    # METADATA
    metadata = {
        "all_succeeded": all_succeeded,
        "partial_failures": partial_failures,
        "sections_loaded": len([s for s, (success, _) in section_results.items() if success]),
        "sections_failed": len(failed_sections),
        "cache_key": cache_key,
        "cache_written": cache_written,
        "aggregation_time_ms": round(elapsed_time, 1),
    }
    
    return (critical_data, metadata)
                load_section_safe,
                section_name,
                loader_func,
                *args
            )
            futures[section_name] = future
        
        # Collect results as threads complete
        for future in as_completed(futures.values()):
            section_name = [k for k, v in futures.items() if v == future][0]
            
            try:
                data, success, error = future.result(timeout=15)  # 15s timeout per section
                results_dict[section_name] = (data, success, error)
                section_results[section_name] = (success, error)
                
                status = "✓" if success else "✗"
                logger.debug(f"[Homepage Critical] Section loaded {status}: {section_name}")
            except Exception as e:
                logger.error(f"[Homepage Critical] Thread error for {section_name}: {e}")
                results_dict[section_name] = ([], False, str(e))
                section_results[section_name] = (False, str(e))
    
    # Populate critical_data with results
    for section_name, (data, success, error) in results_dict.items():
        critical_data[section_name] = data
    
    # FAILURE TRACKING
    failed_sections = [
        section_name for section_name, (success, _) in section_results.items()
        if not success
    ]
    
    all_succeeded = len(failed_sections) == 0
    
    elapsed_time = (time.time() - start_time) * 1000
    
    # Build partial_failures list
    for section_name, (success, error_msg) in section_results.items():
        if not success:
            partial_failures.append({
                "section": section_name,
                "error": error_msg
            })
    
    # CACHING: Only cache if ALL critical sections succeeded
    cache_written = False
    
    if all_succeeded and product_cache and cache_key:
        try:
            critical_cache_ttl = 120  # 2 minutes for critical cache
            product_cache.set(cache_key, critical_data, critical_cache_ttl)
            cache_written = True
            logger.debug(f"[Homepage Critical] Response cached with key: {cache_key}")
        except Exception as e:
            logger.error(f"[Homepage Critical] Failed to cache response: {e}")
            cache_written = False
    elif not all_succeeded:
        logger.info(f"[Homepage Critical] Not caching response - failures detected: {failed_sections}")
    
    # METADATA
    metadata = {
        "all_succeeded": all_succeeded,
        "partial_failures": partial_failures,
        "sections_loaded": len([s for s, (success, _) in section_results.items() if success]),
        "sections_failed": len(failed_sections),
        "cache_key": cache_key,
        "cache_written": cache_written,
        "aggregation_time_ms": round(elapsed_time, 1),
        "loading_mode": "parallel",
    }
    
    if all_succeeded:
        logger.info(f"[Homepage Critical] All critical sections loaded in {elapsed_time:.1f}ms")
    else:
        logger.warning(f"[Homepage Critical] Some sections failed. Loaded: {metadata['sections_loaded']}, Failed: {metadata['sections_failed']}")
    
    return (critical_data, metadata)
