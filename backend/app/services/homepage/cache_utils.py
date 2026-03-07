"""Homepage Cache Utilities - Centralized cache key generation and management."""
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Homepage cache configuration
# Optimized TTLs for performance - tuned for first-uncached-build speed
HOMEPAGE_CACHE_TTL = 600  # 10 minutes for main cache (increased from 180s per recommendations)

# Section-level TTLs optimized for content type:
# - Stable content (categories, carousel, etc.): 1800-3600s (reusable for many requests)
# - Dynamic content (flash sales, products): 60-300s (updates more frequently)
SECTIONS_CACHE_TTL = {
    # Stable content - rarely changes, long TTLs to maximize cache reuse
    "categories": 3600,           # 1 hour - stable admin content
    "carousel": 3600,             # 1 hour - stable admin content
    "contact_cta": 3600,          # 1 hour - stable admin content
    "premium_experiences": 3600,  # 1 hour - stable admin content
    "product_showcase": 3600,     # 1 hour - stable admin content
    "feature_cards": 3600,        # 1 hour - stable feature cards
    
    # Dynamic content - updates frequently, shorter TTLs
    "flash_sale": 120,            # 2 minutes - changes often
    "luxury": 300,                # 5 minutes - less frequent updates
    "new_arrivals": 300,          # 5 minutes - less frequent updates
    "top_picks": 300,             # 5 minutes - curated content
    "trending": 300,              # 5 minutes - algorithm-based
    "daily_finds": 1800,          # 30 minutes - curated daily content (long TTL to avoid recomputation)
    "all_products": 300,          # 5 minutes - paginated product list
}

# Pagination limits
MIN_LIMIT = 5
MAX_LIMIT = 100
MIN_PAGE = 1
MAX_PAGE = 1000

# Critical sections - if these fail, don't cache the top-level response
CRITICAL_SECTIONS = {"categories", "carousel"}


def get_empty_homepage_data() -> Dict[str, Any]:
    """
    Returns the empty/fallback homepage data structure.
    
    CENTRALIZED FALLBACK: Used as single source of truth when sections fail to load.
    Ensures response shape is always consistent across all failure paths.
    
    If new sections are added to homepage response, add them here.
    This prevents typos and ensures every failure mode returns valid data.
    
    Returns:
        Dictionary with all 13 homepage sections initialized as empty
    """
    return {
        "categories": [],
        "carousel_items": [],
        "flash_sale_products": [],
        "luxury_products": [],
        "new_arrivals": [],
        "top_picks": [],
        "trending_products": [],
        "daily_finds": [],
        "contact_cta_slides": [],
        "premium_experiences": [],
        "product_showcase": [],
        "feature_cards": [],
        "all_products": {
            "products": [],
            "has_more": False,
            "total": 0,
            "page": 1
        },
    }


def validate_pagination_params(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> Tuple[int, int, int, int, int, int, int, int, int]:
    """
    Validate and constrain ALL homepage pagination parameters to safe ranges.
    
    Args:
        categories_limit: Number of categories (default: 20)
        flash_sale_limit: Number of flash sale products (default: 20)
        luxury_limit: Number of luxury products (default: 12)
        new_arrivals_limit: Number of new arrivals (default: 20)
        top_picks_limit: Number of top picks (default: 20)
        trending_limit: Number of trending products (default: 20)
        daily_finds_limit: Number of daily finds (default: 20)
        all_products_limit: Number of all products (default: 12)
        all_products_page: Page number for pagination (default: 1)
        
    Returns:
        Tuple of 9 validated limits
    """
    categories_limit = min(max(categories_limit, MIN_LIMIT), MAX_LIMIT)
    flash_sale_limit = min(max(flash_sale_limit, MIN_LIMIT), MAX_LIMIT)
    luxury_limit = min(max(luxury_limit, MIN_LIMIT), MAX_LIMIT)
    new_arrivals_limit = min(max(new_arrivals_limit, MIN_LIMIT), MAX_LIMIT)
    top_picks_limit = min(max(top_picks_limit, MIN_LIMIT), MAX_LIMIT)
    trending_limit = min(max(trending_limit, MIN_LIMIT), MAX_LIMIT)
    daily_finds_limit = min(max(daily_finds_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_limit = min(max(all_products_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_page = min(max(all_products_page, MIN_PAGE), MAX_PAGE)
    
    return (categories_limit, flash_sale_limit, luxury_limit, new_arrivals_limit, 
            top_picks_limit, trending_limit, daily_finds_limit, all_products_limit, all_products_page)


def build_homepage_cache_key(
    categories_limit: int,
    flash_sale_limit: int,
    luxury_limit: int,
    new_arrivals_limit: int,
    top_picks_limit: int,
    trending_limit: int,
    daily_finds_limit: int,
    all_products_limit: int,
    all_products_page: int,
) -> str:
    """
    Generate a UNIQUE cache key based on ALL 9 homepage pagination parameters.
    
    SAFEGUARD #1: KEY IDENTITY
    ===========================
    This function MUST be called by both:
    1. Homepage route (to check cache before aggregation)
    2. Aggregator (to cache response after loading all sections)
    
    If they don't use the same function, cache keys will mismatch and cache hits
    will be impossible or wrong cached data will be returned.
    
    Every parameter that changes output must be included in the key.
    This prevents cache poisoning where different requests return wrong cached results.
    
    Without including all params, different requests with different limits
    will get the same cache key and return incorrect data.
    
    Args:
        All 9 homepage request parameters that affect output
        
    Returns:
        Formatted cache key string with all parameters included
        
    Example:
        >>> build_homepage_cache_key(20, 20, 12, 20, 20, 20, 20, 12, 1)
        'mizizzi:homepage:cat_20:flash_20:lux_12:arr_20:top_20:trend_20:daily_20:all_12:page_1'
    """
    cache_key = (
        f"mizizzi:homepage:"
        f"cat_{categories_limit}:"
        f"flash_{flash_sale_limit}:"
        f"lux_{luxury_limit}:"
        f"arr_{new_arrivals_limit}:"
        f"top_{top_picks_limit}:"
        f"trend_{trending_limit}:"
        f"daily_{daily_finds_limit}:"
        f"all_{all_products_limit}:"
        f"page_{all_products_page}"
    )
    return cache_key


def build_section_cache_key(section_name: str, *args) -> str:
    """
    Generate cache key for individual homepage sections.
    
    Args:
        section_name: Name of the section
        *args: Additional parameters for the section (e.g., page number, limit)
        
    Returns:
        Formatted section cache key
        
    Example:
        >>> build_section_cache_key("all_products", 1, 12)
        'mizizzi:homepage:all_products:page_1:limit_12'
    """
    if args:
        params = ":".join(str(arg) for arg in args)
        return f"mizizzi:homepage:{section_name}:{params}"
    return f"mizizzi:homepage:{section_name}"
