"""Homepage Cache Utilities - Centralized cache key generation and management."""
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Homepage cache configuration
HOMEPAGE_CACHE_TTL = 60  # 1 minute for main cache
SECTIONS_CACHE_TTL = {
    "categories": 300,  # 5 minutes
    "carousel": 600,    # 10 minutes
    "flash_sale": 180,  # 3 minutes
    "luxury": 180,
    "new_arrivals": 180,
    "top_picks": 120,
    "trending": 120,
    "daily_finds": 300,
    "all_products": 120,
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
    
    Used when sections fail to load or as fallback for errors.
    Centralized here to avoid mistakes if new sections are added.
    
    Returns:
        Dictionary with all 13 homepage sections as empty
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
        "all_products": {"products": [], "has_more": False, "total": 0, "page": 1},
        "contact_cta_slides": [],
        "premium_experiences": [],
        "product_showcase": [],
        "feature_cards": [],
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
    
    CRITICAL: Every parameter that changes output must be included in the key.
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
