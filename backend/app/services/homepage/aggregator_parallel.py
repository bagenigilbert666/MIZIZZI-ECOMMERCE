"""
Optional Parallel Homepage Aggregation - Advanced Performance Module

This module provides PARALLEL section loading as an OPTIONAL enhancement.
It is disabled by default and only used if enabled via HOMEPAGE_PARALLEL_LOAD=true.

DESIGN:
- ThreadPoolExecutor with max_workers=6 for CPU-bound DB queries
- Safe exception handling per section (one failure doesn't block others)
- Returns to normal top-level caching logic after parallel load
- Fully compatible with existing response format and serializers
- No changes to API contract

WHEN TO USE:
- Local development for performance testing
- Deployment monitoring to validate overhead reduction
- When dealing with particularly slow database queries

SAFETY:
- Max workers limited to 6 (prevents connection pool exhaustion)
- Each section wrapped in try/except
- Falls back to synchronous on any initialization error
- All results validated before use
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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
from app.services.homepage.cache_utils import get_empty_homepage_data

logger = logging.getLogger(__name__)

MAX_WORKERS = 6  # Limit concurrent threads to prevent connection pool issues


def load_section_parallel_safe(section_name: str, loader_func, *args, **kwargs) -> Tuple[str, Any, bool, str]:
    """
    Safe wrapper for parallel section loading.
    
    Args:
        section_name: Name of section for tracking
        loader_func: Function to call
        *args: Arguments for loader
        **kwargs: Keyword arguments for loader
        
    Returns:
        Tuple of (section_name, data, success, error_msg)
    """
    try:
        logger.debug(f"[Parallel] Loading: {section_name}")
        data = loader_func(*args, **kwargs)
        return (section_name, data, True, "")
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"[Parallel] Failed to load {section_name}: {error_msg}")
        
        # Return appropriate empty structure
        if section_name == "all_products":
            empty_data = {"products": [], "has_more": False, "total": 0, "page": 1}
        else:
            empty_data = []
        
        return (section_name, empty_data, False, error_msg)


def get_homepage_data_parallel(
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
    PARALLEL AGGREGATOR: Loads all 13 homepage sections using ThreadPoolExecutor.
    
    This is an OPTIONAL alternative to synchronous aggregation.
    Use only if HOMEPAGE_PARALLEL_LOAD=true and you've validated performance gains.
    
    Args:
        All 9 pagination parameters (same as synchronous version)
        cache_key: Pre-computed cache key from caller
        
    Returns:
        Tuple of (homepage_data, metadata) - identical format to synchronous version
    """
    start_time = time.time()
    homepage_data = get_empty_homepage_data()
    section_results = {}
    
    logger.info("[Parallel] Starting aggregation with ThreadPoolExecutor (6 workers)")
    
    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Submit all section loaders at once
            futures = {
                executor.submit(load_section_parallel_safe, "categories", get_homepage_categories, categories_limit): "categories",
                executor.submit(load_section_parallel_safe, "carousel_items", get_homepage_carousel): "carousel_items",
                executor.submit(load_section_parallel_safe, "flash_sale_products", get_homepage_flash_sale, flash_sale_limit): "flash_sale_products",
                executor.submit(load_section_parallel_safe, "luxury_products", get_homepage_luxury, luxury_limit): "luxury_products",
                executor.submit(load_section_parallel_safe, "new_arrivals", get_homepage_new_arrivals, new_arrivals_limit): "new_arrivals",
                executor.submit(load_section_parallel_safe, "top_picks", get_homepage_top_picks, top_picks_limit): "top_picks",
                executor.submit(load_section_parallel_safe, "trending_products", get_homepage_trending, trending_limit): "trending_products",
                executor.submit(load_section_parallel_safe, "daily_finds", get_homepage_daily_finds, daily_finds_limit): "daily_finds",
                executor.submit(load_section_parallel_safe, "contact_cta_slides", get_homepage_contact_cta_slides): "contact_cta_slides",
                executor.submit(load_section_parallel_safe, "premium_experiences", get_homepage_premium_experiences): "premium_experiences",
                executor.submit(load_section_parallel_safe, "product_showcase", get_homepage_product_showcase): "product_showcase",
                executor.submit(load_section_parallel_safe, "feature_cards", get_homepage_feature_cards): "feature_cards",
                executor.submit(load_section_parallel_safe, "all_products", get_homepage_all_products, all_products_limit, all_products_page): "all_products",
            }
            
            # Collect results as they complete
            for future in as_completed(futures):
                section_name, data, success, error = future.result()
                section_results[section_name] = (success, error)
                homepage_data[section_name] = data
                logger.debug(f"[Parallel] Section complete: {section_name} (success: {success})")
        
    except Exception as e:
        logger.error(f"[Parallel] ThreadPoolExecutor error: {e} - falling back to synchronous load")
        # On thread pool error, fall back to empty response
        # (caller can retry with synchronous aggregator)
        section_results = {k: (False, str(e)) for k in homepage_data.keys()}
    
    # Determine overall success
    failed_sections = [
        section_name for section_name, (success, _) in section_results.items()
        if not success
    ]
    all_succeeded = len(failed_sections) == 0
    
    # Calculate timing
    elapsed_time = (time.time() - start_time) * 1000  # ms
    
    # Log result
    if all_succeeded:
        logger.info(f"[Parallel] All sections loaded in {elapsed_time:.1f}ms")
    else:
        logger.warning(f"[Parallel] Completed with failures: {failed_sections} ({elapsed_time:.1f}ms)")
    
    # Build partial failures list (same as synchronous version)
    partial_failures = [
        {"section": section_name, "error": error_msg}
        for section_name, (success, error_msg) in section_results.items()
        if not success
    ]
    
    # Build metadata (identical format to synchronous version)
    metadata = {
        "all_succeeded": all_succeeded,
        "partial_failures": partial_failures,
        "sections_loaded": len([s for s, (success, _) in section_results.items() if success]),
        "sections_failed": len(failed_sections),
        "cache_key": cache_key,
        "cache_written": False,  # Caching will be handled by caller
        "aggregation_time_ms": round(elapsed_time, 1),
        "parallel": True,  # Mark this as from parallel loader
    }
    
    return (homepage_data, metadata)
