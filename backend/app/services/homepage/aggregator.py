"""Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections."""
import logging
from typing import Dict, Any, Tuple, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.utils.redis_cache import product_cache

# Import all homepage loaders
from .get_homepage_categories import get_homepage_categories
from .get_homepage_carousel import get_homepage_carousel
from .get_homepage_flash_sale import get_homepage_flash_sale
from .get_homepage_featured import (
    get_homepage_luxury,
    get_homepage_new_arrivals,
    get_homepage_top_picks,
    get_homepage_trending,
    get_homepage_daily_finds,
)
from .get_homepage_all_products import get_homepage_all_products
from .get_homepage_contact_cta_slides import get_homepage_contact_cta_slides
from .get_homepage_premium_experiences import get_homepage_premium_experiences
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_feature_cards import get_homepage_feature_cards
from .cache_utils import (
    build_homepage_cache_key, 
    HOMEPAGE_CACHE_TTL,
    CRITICAL_SECTIONS,
    get_empty_homepage_data,
)

logger = logging.getLogger(__name__)

# Thread pool for parallel section loading (CPU count * 2 for I/O bound operations)
_thread_pool = ThreadPoolExecutor(max_workers=16, thread_name_prefix="homepage_loader_")


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
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Aggregator for all homepage data - loads all sections in parallel using ThreadPoolExecutor.
    
    Architecture:
    - Each section is a separate, focused loader (100% synchronous)
    - All sections load in parallel using thread pool for true I/O parallelism
    - Individual section failures don't affect others
    - Each section has its own Redis cache layer
    - Top-level cache wraps entire response with dynamic key based on parameters
    
    Args:
        Various limits for each section
        all_products_page: Page number for pagination (1-indexed)
        
    Returns:
        Tuple of (homepage_data, metadata) where:
        - homepage_data: Complete homepage data dictionary with all sections
        - metadata: Dictionary with cache_hit (bool), cache_key (str), partial_failures (list)
    """
    try:
        # Build dynamic cache key based on ALL parameters
        cache_key = build_homepage_cache_key(
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
        
        # Check top-level cache first
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage Aggregator] Full homepage data loaded from cache (key: {cache_key})")
                metadata = {
                    "cache_hit": True,
                    "cache_key": cache_key,
                    "partial_failures": []
                }
                return cached, metadata
        
        logger.debug(f"[Homepage Aggregator] Loading all homepage sections in parallel with key: {cache_key}...")
        
        # Define section names for logging and tracking failures
        section_names = [
            "categories",
            "carousel",
            "flash_sale",
            "luxury",
            "new_arrivals",
            "top_picks",
            "trending",
            "daily_finds",
            "all_products",
            "contact_cta_slides",
            "premium_experiences",
            "product_showcase",
            "feature_cards",
        ]
        
        # Submit all section loaders to thread pool
        futures = []
        futures.append((_thread_pool.submit(get_homepage_categories, categories_limit), "categories"))
        futures.append((_thread_pool.submit(get_homepage_carousel), "carousel"))
        futures.append((_thread_pool.submit(get_homepage_flash_sale, flash_sale_limit), "flash_sale"))
        futures.append((_thread_pool.submit(get_homepage_luxury, luxury_limit), "luxury"))
        futures.append((_thread_pool.submit(get_homepage_new_arrivals, new_arrivals_limit), "new_arrivals"))
        futures.append((_thread_pool.submit(get_homepage_top_picks, top_picks_limit), "top_picks"))
        futures.append((_thread_pool.submit(get_homepage_trending, trending_limit), "trending"))
        futures.append((_thread_pool.submit(get_homepage_daily_finds, daily_finds_limit), "daily_finds"))
        futures.append((_thread_pool.submit(get_homepage_all_products, all_products_limit, all_products_page), "all_products"))
        futures.append((_thread_pool.submit(get_homepage_contact_cta_slides), "contact_cta_slides"))
        futures.append((_thread_pool.submit(get_homepage_premium_experiences), "premium_experiences"))
        futures.append((_thread_pool.submit(get_homepage_product_showcase), "product_showcase"))
        futures.append((_thread_pool.submit(get_homepage_feature_cards), "feature_cards"))
        
        # Collect results as they complete
        results = {}
        partial_failures: List[str] = []
        
        for future, section_name in futures:
            try:
                result = future.result(timeout=30)  # 30 second timeout per section
                results[section_name] = result
            except Exception as e:
                is_critical = section_name in CRITICAL_SECTIONS
                logger.error(f"[Homepage Aggregator] Section '{section_name}' error: {e} (critical: {is_critical})")
                partial_failures.append(section_name)
                # Set empty result for failed sections
                if section_name == "all_products":
                    results[section_name] = {"products": [], "has_more": False, "total": 0, "page": 1}
                else:
                    results[section_name] = []
        
        # Build response from results
        homepage_data = {
            "categories": results.get("categories", []),
            "carousel_items": results.get("carousel", []),
            "flash_sale_products": results.get("flash_sale", []),
            "luxury_products": results.get("luxury", []),
            "new_arrivals": results.get("new_arrivals", []),
            "top_picks": results.get("top_picks", []),
            "trending_products": results.get("trending", []),
            "daily_finds": results.get("daily_finds", []),
            "all_products": results.get("all_products", {"products": [], "has_more": False, "total": 0, "page": 1}),
            "contact_cta_slides": results.get("contact_cta_slides", []),
            "premium_experiences": results.get("premium_experiences", []),
            "product_showcase": results.get("product_showcase", []),
            "feature_cards": results.get("feature_cards", []),
        }
        
        # Cache decision: Only cache if critical sections are healthy
        has_critical_failures = any(section in CRITICAL_SECTIONS for section in partial_failures)
        
        if product_cache and not has_critical_failures:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
            cache_status = "cached"
        elif has_critical_failures:
            logger.warning(
                f"[Homepage Aggregator] Skipping top-level cache because critical sections failed: "
                f"{partial_failures} (cache_key: {cache_key})"
            )
            cache_status = "not_cached (critical failures)"
        else:
            cache_status = "cache unavailable"
        
        # Log appropriately based on success/failure
        total_sections = len(section_names)
        if not partial_failures:
            logger.debug(f"[Homepage Aggregator] All {total_sections} sections loaded successfully ({cache_status}, cache_key: {cache_key})")
        else:
            logger.warning(f"[Homepage Aggregator] Loaded with {len(partial_failures)}/{total_sections} failures: {partial_failures} ({cache_status}, cache_key: {cache_key})")
        
        metadata = {
            "cache_hit": False,
            "cache_key": cache_key,
            "partial_failures": partial_failures
        }
        
        return homepage_data, metadata
        
        
    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        # Attempt to preserve cache key even on failure
        try:
            failed_cache_key = build_homepage_cache_key(
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
        except Exception:
            failed_cache_key = ""
        
        # Return empty structure instead of failing
        metadata = {
            "cache_hit": False,
            "cache_key": failed_cache_key,
            "partial_failures": ["all_sections"]
        }
        return get_empty_homepage_data(), metadata
