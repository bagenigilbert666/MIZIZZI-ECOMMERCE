"""Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections."""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

from app.utils.redis_cache import product_cache
from .cache_key_builder import build_homepage_cache_key

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
from .get_homepage_topbar_slides import get_homepage_topbar_slides
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_premium_experiences import get_homepage_premium_experiences

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
    all_products_page: int = 1,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Aggregator for all homepage data - loads all sections in parallel.

    Architecture:
    - Each section is a separate, focused loader
    - All sections load in parallel for maximum performance
    - Individual section failures don't affect others
    - Each section has its own Redis cache layer
    - Top-level cache wraps entire response using a dynamic key that
      encodes all parameters, preventing stale data from being served

    Returns:
        Tuple of (homepage_data, meta) where meta contains:
        - cache_hit: bool - whether data came from top-level cache
        - cache_key: str - the actual key used
        - timestamp: str - ISO 8601 response time
        - partial_failures: list of section indices that raised exceptions
    """
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
    if product_cache:
        cached = product_cache.get(cache_key)
        if cached:
            logger.debug(f"[Homepage Aggregator] Cache HIT: {cache_key}")
            meta = {
                "cache_hit": True,
                "cache_key": cache_key,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "partial_failures": [],
            }
            return cached, meta

    logger.debug(f"[Homepage Aggregator] Cache MISS: {cache_key} — loading sections in parallel")

    try:
        results = await asyncio.gather(
            get_homepage_categories(categories_limit),           # 0
            get_homepage_carousel(),                             # 1
            get_homepage_flash_sale(flash_sale_limit),          # 2
            get_homepage_luxury(luxury_limit),                   # 3
            get_homepage_new_arrivals(new_arrivals_limit),       # 4
            get_homepage_top_picks(top_picks_limit),             # 5
            get_homepage_trending(trending_limit),               # 6
            get_homepage_daily_finds(daily_finds_limit),         # 7
            get_homepage_all_products(all_products_limit, all_products_page),  # 8
            get_homepage_contact_cta_slides(),                   # 9
            get_homepage_topbar_slides(),                        # 10
            get_homepage_product_showcase(),                     # 11
            get_homepage_premium_experiences(),                  # 12
            return_exceptions=True,
        )

        section_names = [
            "categories", "carousel_items", "flash_sale_products",
            "luxury_products", "new_arrivals", "top_picks",
            "trending_products", "daily_finds", "all_products",
            "contact_cta_slides", "topbar_slides",
            "product_showcase", "premium_experiences",
        ]

        section_fallbacks = {
            "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
        }

        partial_failures = []
        homepage_data = {}

        for i, (name, result) in enumerate(zip(section_names, results)):
            if isinstance(result, Exception):
                logger.error(f"[Homepage Aggregator] Section '{name}' failed: {result}")
                partial_failures.append(name)
                homepage_data[name] = section_fallbacks.get(name, [])
            else:
                homepage_data[name] = result

        # Cache the assembled response
        if product_cache:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)

        meta = {
            "cache_hit": False,
            "cache_key": cache_key,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "partial_failures": partial_failures,
        }

        logger.debug(
            f"[Homepage Aggregator] Loaded all sections. "
            f"Failures: {partial_failures or 'none'}"
        )
        return homepage_data, meta

    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        fallback_data = {
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
            "topbar_slides": [],
            "product_showcase": [],
            "premium_experiences": [],
        }
        meta = {
            "cache_hit": False,
            "cache_key": cache_key,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "partial_failures": ["all_sections"],
        }
        return fallback_data, meta
