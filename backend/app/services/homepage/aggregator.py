"""Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections."""
import asyncio
import logging
from typing import Dict, Any, Tuple, List
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
from .cache_utils import build_homepage_cache_key, HOMEPAGE_CACHE_TTL

logger = logging.getLogger(__name__)


async def get_homepage_data(
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
    Aggregator for all homepage data - loads all sections in parallel.
    
    Architecture:
    - Each section is a separate, focused loader
    - All sections load in parallel for maximum performance
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
        cache_hit = False
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage Aggregator] Full homepage data loaded from cache (key: {cache_key})")
                cache_hit = True
                metadata = {
                    "cache_hit": True,
                    "cache_key": cache_key,
                    "partial_failures": []
                }
                return cached, metadata
        
        logger.debug(f"[Homepage Aggregator] Loading all homepage sections in parallel with key: {cache_key}...")
        
        # Load all 13 sections in parallel
        results = await asyncio.gather(
            get_homepage_categories(categories_limit),
            get_homepage_carousel(),
            get_homepage_flash_sale(flash_sale_limit),
            get_homepage_luxury(luxury_limit),
            get_homepage_new_arrivals(new_arrivals_limit),
            get_homepage_top_picks(top_picks_limit),
            get_homepage_trending(trending_limit),
            get_homepage_daily_finds(daily_finds_limit),
            get_homepage_all_products(all_products_limit, all_products_page),
            get_homepage_contact_cta_slides(),
            get_homepage_premium_experiences(),
            get_homepage_product_showcase(),
            get_homepage_feature_cards(),
            return_exceptions=True,  # Don't let one error block others
        )
        
        # Track partial failures with named sections
        partial_failures: List[str] = []
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
        
        # Map results to response
        homepage_data = {
            "categories": results[0] if not isinstance(results[0], Exception) else [],
            "carousel_items": results[1] if not isinstance(results[1], Exception) else [],
            "flash_sale_products": results[2] if not isinstance(results[2], Exception) else [],
            "luxury_products": results[3] if not isinstance(results[3], Exception) else [],
            "new_arrivals": results[4] if not isinstance(results[4], Exception) else [],
            "top_picks": results[5] if not isinstance(results[5], Exception) else [],
            "trending_products": results[6] if not isinstance(results[6], Exception) else [],
            "daily_finds": results[7] if not isinstance(results[7], Exception) else [],
            "all_products": (results[8] if not isinstance(results[8], Exception) else {"products": [], "has_more": False, "total": 0, "page": 1}),
            "contact_cta_slides": results[9] if not isinstance(results[9], Exception) else [],
            "premium_experiences": results[10] if not isinstance(results[10], Exception) else [],
            "product_showcase": results[11] if not isinstance(results[11], Exception) else [],
            "feature_cards": results[12] if not isinstance(results[12], Exception) else [],
        }
        
        # Log and track any errors
        critical_sections = {"categories", "carousel"}  # Sections that are critical for homepage
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                section = section_names[i]
                partial_failures.append(section)
                is_critical = section in critical_sections
                logger.error(f"[Homepage Aggregator] Section '{section}' error: {result} (critical: {is_critical})")
        
        # Cache the complete response (even with partial failures, but could check for critical failures)
        if product_cache:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
        
        # Log appropriately based on success/failure
        if not partial_failures:
            logger.debug(f"[Homepage Aggregator] All 13 sections loaded successfully (cache_key: {cache_key})")
        else:
            logger.warning(f"[Homepage Aggregator] Loaded with partial failures: {partial_failures} (cache_key: {cache_key})")
        
        metadata = {
            "cache_hit": cache_hit,
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
        except:
            failed_cache_key = ""
        
        # Return empty structure instead of failing
        metadata = {
            "cache_hit": False,
            "cache_key": failed_cache_key,
            "partial_failures": ["all_sections"]
        }
        return {
            "categories": [],
            "carousel_items": [],
            "flash_sale_products": [],
            "luxury_products": [],
            "new_arrivals": [],
            "top_picks": [],
            "trending_products": [],
            "daily_finds": [],
            "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
            "contact_cta_slides": [],
            "premium_experiences": [],
            "product_showcase": [],
            "feature_cards": [],
        }, metadata
