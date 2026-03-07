"""
Homepage Aggregator Service - Refactored

Fixes for Issues #2, #3, #4, #5, #6, #7:
- all_products_page now passed through pipeline
- Missing sections added (premium_experiences, product_showcase, contact_cta_slides, feature_cards)
- Returns cache metadata from aggregator (not read in route)
- Cleaner async handling
- Consistent response shape
- Proper error isolation per section
"""
import asyncio
import logging
from typing import Dict, Any, List, Tuple
from app.utils.redis_cache import product_cache

# Import all existing homepage loaders
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

# Import new missing section loaders
from .get_homepage_premium_experiences import get_homepage_premium_experiences
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_contact_cta_slides import get_homepage_contact_cta_slides
from .get_homepage_feature_cards import get_homepage_feature_cards

# Import cache key builder
from app.utils.cache_key_builder import build_homepage_cache_key

logger = logging.getLogger(__name__)

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
    all_products_page: int = 1,  # FIX #2: Added missing parameter
) -> Dict[str, Any]:
    """
    Aggregator for all homepage data - loads all sections in parallel.
    
    Returns structured data with cache metadata for the route to use.
    
    Returns:
        {
            "data": {
                "categories": [],
                "carousel_items": [],
                "flash_sale_products": [],
                "luxury_products": [],
                "new_arrivals": [],
                "top_picks": [],
                "trending_products": [],
                "daily_finds": [],
                "premium_experiences": [],  # FIX #3: New section
                "product_showcase": [],      # FIX #3: New section
                "contact_cta_slides": [],    # FIX #3: New section
                "feature_cards": [],         # FIX #3: New section
                "all_products": {...}
            },
            "meta": {
                "cache_hit": bool,
                "cache_key": str,
                "partial_failures": [...]
            }
        }
    """
    try:
        # FIX #1: Build dynamic cache key based on ALL parameters
        cache_key = build_homepage_cache_key(
            categories_limit=categories_limit,
            flash_sale_limit=flash_sale_limit,
            luxury_limit=luxury_limit,
            new_arrivals_limit=new_arrivals_limit,
            top_picks_limit=top_picks_limit,
            trending_limit=trending_limit,
            daily_finds_limit=daily_finds_limit,
            all_products_limit=all_products_limit,
            all_products_page=all_products_page,
        )
        
        # Check top-level cache with dynamic key
        cache_hit = False
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage Aggregator] Full homepage data loaded from cache: {cache_key}")
                # Return cached data with meta indicating hit
                return {
                    "data": cached,
                    "meta": {
                        "cache_hit": True,
                        "cache_key": cache_key,
                        "partial_failures": []
                    }
                }
            cache_hit = False
        
        logger.debug("[Homepage Aggregator] Loading all homepage sections in parallel...")
        
        # Load all sections in parallel
        # FIX #2: all_products_page now passed to get_homepage_all_products
        # FIX #3: Added 4 new missing sections
        results = await asyncio.gather(
            get_homepage_categories(categories_limit),
            get_homepage_carousel(),
            get_homepage_flash_sale(flash_sale_limit),
            get_homepage_luxury(luxury_limit),
            get_homepage_new_arrivals(new_arrivals_limit),
            get_homepage_top_picks(top_picks_limit),
            get_homepage_trending(trending_limit),
            get_homepage_daily_finds(daily_finds_limit),
            get_homepage_all_products(all_products_limit, all_products_page),  # FIX #2: page added
            get_homepage_premium_experiences(),  # FIX #3: New
            get_homepage_product_showcase(),      # FIX #3: New
            get_homepage_contact_cta_slides(),    # FIX #3: New
            get_homepage_feature_cards(),         # FIX #3: New
            return_exceptions=True,  # FIX #6: Isolate failures per section
        )
        
        # Map results to response
        # FIX #6: Handle exceptions gracefully per section
        partial_failures = []
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
            "premium_experiences": results[9] if not isinstance(results[9], Exception) else [],  # FIX #3
            "product_showcase": results[10] if not isinstance(results[10], Exception) else [],    # FIX #3
            "contact_cta_slides": results[11] if not isinstance(results[11], Exception) else [], # FIX #3
            "feature_cards": results[12] if not isinstance(results[12], Exception) else [],      # FIX #3
        }
        
        # Log any errors (FIX #6: preserve section isolation)
        section_names = [
            "categories", "carousel", "flash_sale", "luxury", "new_arrivals",
            "top_picks", "trending", "daily_finds", "all_products",
            "premium_experiences", "product_showcase", "contact_cta_slides", "feature_cards"
        ]
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                section_name = section_names[i] if i < len(section_names) else f"section_{i}"
                logger.error(f"[Homepage Aggregator] {section_name} failed: {result}")
                partial_failures.append({
                    "section": section_name,
                    "error": str(result)
                })
        
        # Cache the complete response with dynamic key
        if product_cache:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
        
        logger.debug(f"[Homepage Aggregator] All sections loaded. Cached as: {cache_key}")
        
        # FIX #4: Return structured metadata from aggregator
        return {
            "data": homepage_data,
            "meta": {
                "cache_hit": False,
                "cache_key": cache_key,
                "partial_failures": partial_failures
            }
        }
        
    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        # FIX #6: Keep consistent fallback structure
        return {
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
