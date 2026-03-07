"""Homepage Cache Utilities - Centralized cache key generation and management."""
import logging
from typing import Tuple

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


def validate_pagination_params(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> Tuple[int, int, int, int, int]:
    """
    Validate and constrain pagination parameters to safe ranges.
    
    Args:
        categories_limit: Number of categories (default: 20)
        flash_sale_limit: Number of flash sale products (default: 20)
        luxury_limit: Number of luxury products (default: 12)
        all_products_limit: Number of all products (default: 12)
        all_products_page: Page number for pagination (default: 1)
        
    Returns:
        Tuple of validated limits
    """
    categories_limit = min(max(categories_limit, MIN_LIMIT), MAX_LIMIT)
    flash_sale_limit = min(max(flash_sale_limit, MIN_LIMIT), MAX_LIMIT)
    luxury_limit = min(max(luxury_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_limit = min(max(all_products_limit, MIN_LIMIT), MAX_LIMIT)
    all_products_page = min(max(all_products_page, MIN_PAGE), MAX_PAGE)
    
    return categories_limit, flash_sale_limit, luxury_limit, all_products_limit, all_products_page


def build_homepage_cache_key(
    categories_limit: int,
    flash_sale_limit: int,
    luxury_limit: int,
    all_products_limit: int,
    all_products_page: int,
) -> str:
    """
    Generate a unique cache key based on all homepage pagination parameters.
    
    This ensures that different parameter combinations don't return cached
    results from different requests (cache poisoning prevention).
    
    Args:
        categories_limit: Number of categories
        flash_sale_limit: Number of flash sale products
        luxury_limit: Number of luxury products
        all_products_limit: Number of all products per page
        all_products_page: Page number for all products
        
    Returns:
        Formatted cache key string
        
    Example:
        >>> build_homepage_cache_key(20, 20, 12, 12, 1)
        'mizizzi:homepage:cat_20:flash_20:lux_12:all_12:page_1'
    """
    cache_key = (
        f"mizizzi:homepage:"
        f"cat_{categories_limit}:"
        f"flash_{flash_sale_limit}:"
        f"lux_{luxury_limit}:"
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
