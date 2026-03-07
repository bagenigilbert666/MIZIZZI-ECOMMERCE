"""Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections."""
import asyncio
import logging
from typing import Dict, Any
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

logger = logging.getLogger(__name__)

# Top-level homepage cache
HOMEPAGE_CACHE_KEY = "mizizzi:homepage:data"
HOMEPAGE_CACHE_TTL = 60  # 1 minute


async def get_homepage_data(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
) -> Dict[str, Any]:
    """
    Aggregator for all homepage data - loads all sections in parallel.
    
    Architecture:
    - Each section is a separate, focused loader
    - All sections load in parallel for maximum performance
    - Individual section failures don't affect others
    - Each section has its own Redis cache layer
    - Top-level cache wraps entire response
    
    Args:
        Various limits for each section
        
    Returns:
        Complete homepage data dictionary with all sections
    """
    try:
        # Check top-level cache first
        if product_cache:
            cached = product_cache.get(HOMEPAGE_CACHE_KEY)
            if cached:
                logger.debug("[Homepage Aggregator] Full homepage data loaded from cache")
                return cached
        
        logger.debug("[Homepage Aggregator] Loading all homepage sections in parallel...")
        
        # Load all sections in parallel
        results = await asyncio.gather(
            get_homepage_categories(categories_limit),
            get_homepage_carousel(),
            get_homepage_flash_sale(flash_sale_limit),
            get_homepage_luxury(luxury_limit),
            get_homepage_new_arrivals(new_arrivals_limit),
            get_homepage_top_picks(top_picks_limit),
            get_homepage_trending(trending_limit),
            get_homepage_daily_finds(daily_finds_limit),
            get_homepage_all_products(all_products_limit),
            return_exceptions=True,  # Don't let one error block others
        )
        
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
        }
        
        # Log any errors
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"[Homepage Aggregator] Section {i} error: {result}")
        
        # Cache the complete response
        if product_cache:
            product_cache.set(HOMEPAGE_CACHE_KEY, homepage_data, HOMEPAGE_CACHE_TTL)
        
        logger.debug("[Homepage Aggregator] All sections loaded successfully")
        return homepage_data
        
    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        # Return empty structure instead of failing
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
        }
