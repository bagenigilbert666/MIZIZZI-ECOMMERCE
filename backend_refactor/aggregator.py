"""
Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections.

This module loads all homepage data sections in parallel and handles:
- Cache metadata tracking (cache hits/misses)
- Partial failure handling (one section failing doesn't break the whole response)
- Dynamic cache keys based on request parameters
- Structured metadata response for cache tracking
"""
import asyncio
import logging
from typing import Dict, Any, List, Tuple
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
from .get_homepage_premium_experiences import get_homepage_premium_experiences
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_contact_cta import get_homepage_contact_cta_slides
from .get_homepage_feature_cards import get_homepage_feature_cards

# Cache key builder
from .homepage_cache_key_builder import build_homepage_cache_key

logger = logging.getLogger(__name__)

# Cache TTL
HOMEPAGE_CACHE_TTL = 60  # 1 minute


async def get_homepage_data_with_metadata(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> Dict[str, Any]:
    """
    Aggregator for all homepage data - loads all sections in parallel.
    
    Returns structured response with cache metadata:
    {
        "data": { ...homepage sections... },
        "meta": {
            "cache_hit": bool,
            "cache_key": str,
            "partial_failures": [list of sections that failed],
            "sections_loaded": int
        }
    }
    
    Args:
        categories_limit: Number of categories
        flash_sale_limit: Number of flash sale products
        luxury_limit: Number of luxury products
        new_arrivals_limit: Number of new arrivals
        top_picks_limit: Number of top picks
        trending_limit: Number of trending
        daily_finds_limit: Number of daily finds
        all_products_limit: Number of all products per page
        all_products_page: Page number for pagination
    
    Returns:
        Dict with "data" and "meta" keys containing homepage data and cache metadata
    """
    try:
        # Build dynamic cache key based on parameters
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
        
        # Check top-level cache first
        cache_hit = False
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage Aggregator] Cache HIT for key: {cache_key}")
                cache_hit = True
                return {
                    "data": cached,
                    "meta": {
                        "cache_hit": True,
                        "cache_key": cache_key,
                        "partial_failures": [],
                        "sections_loaded": 9,  # All sections from cache
                    }
                }
        
        logger.debug("[Homepage Aggregator] Cache MISS - Loading all sections in parallel...")
        
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
            get_homepage_all_products(all_products_limit, all_products_page),
            get_homepage_premium_experiences(),
            get_homepage_product_showcase(),
            get_homepage_contact_cta_slides(),
            get_homepage_feature_cards(),
            return_exceptions=True,
        )
        
        # Track partial failures
        partial_failures: List[str] = []
        section_names = [
            "categories",
            "carousel_items",
            "flash_sale_products",
            "luxury_products",
            "new_arrivals",
            "top_picks",
            "trending_products",
            "daily_finds",
            "all_products",
            "premium_experiences",
            "product_showcase",
            "contact_cta_slides",
            "feature_cards",
        ]
        
        # Map results to response
        homepage_data = {}
        sections_loaded = 0
        
        for i, (section_name, result) in enumerate(zip(section_names, results)):
            if isinstance(result, Exception):
                logger.error(f"[Homepage Aggregator] {section_name} failed: {result}")
                partial_failures.append(section_name)
                
                # Provide safe fallback based on section type
                if section_name == "all_products":
                    homepage_data[section_name] = {
                        "products": [],
                        "has_more": False,
                        "total": 0,
                        "page": all_products_page,
                    }
                else:
                    homepage_data[section_name] = []
            else:
                homepage_data[section_name] = result
                sections_loaded += 1
        
        # Cache the complete response
        if product_cache:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
            logger.debug(f"[Homepage Aggregator] Cached response with key: {cache_key}")
        
        logger.debug(f"[Homepage Aggregator] Loaded {sections_loaded}/{len(section_names)} sections")
        
        return {
            "data": homepage_data,
            "meta": {
                "cache_hit": False,
                "cache_key": cache_key,
                "partial_failures": partial_failures,
                "sections_loaded": sections_loaded,
            }
        }
        
    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        
        # Return safe fallback with error metadata
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
                "all_products": {
                    "products": [],
                    "has_more": False,
                    "total": 0,
                    "page": all_products_page,
                },
                "premium_experiences": [],
                "product_showcase": [],
                "contact_cta_slides": [],
                "feature_cards": [],
            },
            "meta": {
                "cache_hit": False,
                "cache_key": "",
                "partial_failures": section_names,
                "sections_loaded": 0,
                "error": str(e),
            }
        }


# Backward compatibility wrapper - for existing code that doesn't expect metadata
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
) -> Dict[str, Any]:
    """
    Legacy aggregator function for backward compatibility.
    Returns only the data dict, not the full response with metadata.
    """
    result = await get_homepage_data_with_metadata(
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
    return result["data"]
