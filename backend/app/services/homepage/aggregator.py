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
2. Threading with ThreadPoolExecutor can cause connection pool exhaustion
3. Synchronous code in Flask is simpler and correct by default
4. Database queries are already optimized (indexes, Redis caching)
5. Sequential execution with proper caching is fast enough (most hits <10ms)

Performance is achieved through:
- Redis caching at section level (each has individual TTL)
- Database indexes on commonly queried columns
- Top-level cache (180s) prevents redundant aggregation
- Pagination + limits prevent large result sets

Result: Safe, correct, maintainable code that works reliably in Flask.
"""

import logging
import time
from typing import Dict, Any, Tuple

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
from app.services.homepage.cache_utils import (
    get_empty_homepage_data,
    build_homepage_cache_key,
    HOMEPAGE_CACHE_TTL,
)
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
    
    SAFEGUARD #2: CACHE KEY FROM CALLER
    ====================================
    The cache_key is computed by the caller (route) and passed here.
    This ensures route and aggregator use IDENTICAL keys built from the same function.
    
    CORRECTNESS FIRST:
    - Uses aggregator-side wrappers to catch and track failures
    - Only caches top-level response if ALL sections succeed
    - Accurate failure tracking in partial_failures list
    - Never logs "all succeeded" if any section failed
    
    SEQUENTIAL LOADING (Why not threads/async):
    - Flask request context not thread-safe
    - Sequential + proper caching is fast enough
    - Simpler, more maintainable code
    - No connection pool exhaustion risks
    
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
    
    # SAFE SYNCHRONOUS LOADING: Sequential calls with aggregator-side wrappers
    # Each loader is called once, catches exceptions happen here at aggregator level
    logger.info("[Homepage] Starting aggregation (synchronous sequential load)")
    
    # Load all 13 sections with explicit failure tracking
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
    
    # ACCURATE LOGGING: Only log success if truly all succeeded
    if all_succeeded:
        logger.info(f"[Homepage] All sections loaded successfully (aggregation took {elapsed_time:.1f}ms)")
    else:
        logger.warning(
            f"[Homepage] Aggregation completed with failures: {failed_sections} "
            f"(took {elapsed_time:.1f}ms)"
        )
    
    # SAFE FILTER: Remove null values from product arrays
    # This prevents serialized products with errors from appearing in the response
    homepage_data["flash_sale_products"] = [p for p in (homepage_data.get("flash_sale_products") or []) if p is not None]
    homepage_data["luxury_products"] = [p for p in (homepage_data.get("luxury_products") or []) if p is not None]
    homepage_data["new_arrivals"] = [p for p in (homepage_data.get("new_arrivals") or []) if p is not None]
    homepage_data["top_picks"] = [p for p in (homepage_data.get("top_picks") or []) if p is not None]
    homepage_data["trending_products"] = [p for p in (homepage_data.get("trending_products") or []) if p is not None]
    homepage_data["daily_finds"] = [p for p in (homepage_data.get("daily_finds") or []) if p is not None]
    
    # Filter all_products if it's a list
    if isinstance(homepage_data.get("all_products"), list):
        homepage_data["all_products"] = [p for p in homepage_data.get("all_products", []) if p is not None]
    elif isinstance(homepage_data.get("all_products"), dict):
        # For paginated responses with products key
        if "products" in homepage_data["all_products"]:
            homepage_data["all_products"]["products"] = [p for p in homepage_data["all_products"].get("products", []) if p is not None]
    
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
    # Distinguish between:
    # - cache_written: Response was just written to Redis cache after aggregation
    # - cache_key: The Redis key used (passed from caller)
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
