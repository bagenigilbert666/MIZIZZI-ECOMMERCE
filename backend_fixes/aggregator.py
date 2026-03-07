"""
Homepage Aggregator Service - Orchestrates parallel loading of all homepage sections.

FIXES APPLIED:
- FIX #1: Uses dynamic cache key from cache_key_builder
- FIX #2: Passes all_products_page through the entire pipeline
- FIX #3: Includes all missing sections (premium_experiences, product_showcase, etc.)
- FIX #4: Returns cache metadata for accurate X-Cache headers
- FIX #6: Consistent response structure for success and error
- FIX #7: Consistent snake_case naming throughout
"""

import asyncio
import logging
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass, field

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

# Import missing sections (FIX #3)
from .get_homepage_premium_experiences import get_homepage_premium_experiences
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_contact_cta_slides import get_homepage_contact_cta_slides
from .get_homepage_feature_cards import get_homepage_feature_cards

logger = logging.getLogger(__name__)

HOMEPAGE_CACHE_TTL = 60  # 1 minute


@dataclass
class HomepageResult:
    """
    Structured result from the homepage aggregator.
    FIX #4: Includes metadata for accurate cache headers.
    """
    data: Dict[str, Any]
    cache_hit: bool = False
    cache_key: str = ""
    partial_failures: List[str] = field(default_factory=list)
    sections_loaded: int = 0
    total_sections: int = 0


# Section definitions for cleaner iteration
SECTION_LOADERS = [
    ("categories", get_homepage_categories, ["categories_limit"]),
    ("carousel_items", get_homepage_carousel, []),
    ("flash_sale_products", get_homepage_flash_sale, ["flash_sale_limit"]),
    ("luxury_products", get_homepage_luxury, ["luxury_limit"]),
    ("new_arrivals", get_homepage_new_arrivals, ["new_arrivals_limit"]),
    ("top_picks", get_homepage_top_picks, ["top_picks_limit"]),
    ("trending_products", get_homepage_trending, ["trending_limit"]),
    ("daily_finds", get_homepage_daily_finds, ["daily_finds_limit"]),
    ("all_products", get_homepage_all_products, ["all_products_limit", "all_products_page"]),
    # FIX #3: Missing sections added
    ("premium_experiences", get_homepage_premium_experiences, []),
    ("product_showcase", get_homepage_product_showcase, []),
    ("contact_cta_slides", get_homepage_contact_cta_slides, []),
    ("feature_cards", get_homepage_feature_cards, []),
]

# Default fallback values for each section
SECTION_DEFAULTS = {
    "categories": [],
    "carousel_items": [],
    "flash_sale_products": [],
    "luxury_products": [],
    "new_arrivals": [],
    "top_picks": [],
    "trending_products": [],
    "daily_finds": [],
    "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
    "premium_experiences": [],
    "product_showcase": [],
    "contact_cta_slides": [],
    "feature_cards": [],
}


async def get_homepage_data(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,  # FIX #2: Now properly passed through
) -> HomepageResult:
    """
    Aggregator for all homepage data - loads all sections in parallel.
    
    Returns HomepageResult with data and metadata for cache headers.
    """
    # FIX #1: Build dynamic cache key based on all parameters
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
    
    total_sections = len(SECTION_LOADERS)
    
    try:
        # Check top-level cache first with dynamic key
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage Aggregator] Cache HIT for key: {cache_key}")
                return HomepageResult(
                    data=cached,
                    cache_hit=True,
                    cache_key=cache_key,
                    sections_loaded=total_sections,
                    total_sections=total_sections,
                )
        
        logger.debug(f"[Homepage Aggregator] Cache MISS - loading {total_sections} sections in parallel...")
        
        # Build params dict for loaders
        params = {
            "categories_limit": categories_limit,
            "flash_sale_limit": flash_sale_limit,
            "luxury_limit": luxury_limit,
            "new_arrivals_limit": new_arrivals_limit,
            "top_picks_limit": top_picks_limit,
            "trending_limit": trending_limit,
            "daily_finds_limit": daily_finds_limit,
            "all_products_limit": all_products_limit,
            "all_products_page": all_products_page,  # FIX #2: Included in params
        }
        
        # Build coroutines for each section
        async def load_section(name: str, loader, param_keys: List[str]) -> Tuple[str, Any, bool]:
            """Load a single section with error isolation."""
            try:
                # Build args for this loader
                args = [params[k] for k in param_keys]
                result = await loader(*args)
                return (name, result, True)
            except Exception as e:
                logger.error(f"[Homepage Aggregator] Section '{name}' failed: {e}")
                return (name, SECTION_DEFAULTS.get(name, []), False)
        
        # Load all sections in parallel with error isolation
        tasks = [
            load_section(name, loader, param_keys)
            for name, loader, param_keys in SECTION_LOADERS
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=False)
        
        # Build homepage data from results
        homepage_data = {}
        partial_failures = []
        sections_loaded = 0
        
        for name, data, success in results:
            homepage_data[name] = data
            if success:
                sections_loaded += 1
            else:
                partial_failures.append(name)
        
        # Cache the complete response with dynamic key
        if product_cache and not partial_failures:
            product_cache.set(cache_key, homepage_data, HOMEPAGE_CACHE_TTL)
            logger.debug(f"[Homepage Aggregator] Cached result with key: {cache_key}")
        
        logger.debug(f"[Homepage Aggregator] Loaded {sections_loaded}/{total_sections} sections")
        
        return HomepageResult(
            data=homepage_data,
            cache_hit=False,
            cache_key=cache_key,
            partial_failures=partial_failures,
            sections_loaded=sections_loaded,
            total_sections=total_sections,
        )
        
    except Exception as e:
        logger.error(f"[Homepage Aggregator] Critical error: {e}")
        # FIX #6: Return consistent structure even on critical failure
        return HomepageResult(
            data=SECTION_DEFAULTS.copy(),
            cache_hit=False,
            cache_key=cache_key,
            partial_failures=list(SECTION_DEFAULTS.keys()),
            sections_loaded=0,
            total_sections=total_sections,
        )


def get_homepage_data_sync(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> HomepageResult:
    """
    Synchronous wrapper for get_homepage_data.
    FIX #5: Clean event loop handling for Flask routes.
    """
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(
            get_homepage_data(
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
        )
    finally:
        loop.close()
