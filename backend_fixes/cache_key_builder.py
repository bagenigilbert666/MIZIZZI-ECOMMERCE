"""
Cache Key Builder for Homepage API

Fix for Issue #1: Dynamic cache key based on request parameters
- Prevents different parameter combinations from returning wrong cached data
- Generates consistent, predictable cache keys for all parameter combinations
"""


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
    Build a dynamic cache key based on all homepage parameters.
    
    This ensures that requests with different parameters don't collide
    in the cache and return incorrect data.
    
    Args:
        categories_limit: Limit for categories section
        flash_sale_limit: Limit for flash sale products
        luxury_limit: Limit for luxury products
        new_arrivals_limit: Limit for new arrivals
        top_picks_limit: Limit for top picks
        trending_limit: Limit for trending products
        daily_finds_limit: Limit for daily finds
        all_products_limit: Limit for all products per page
        all_products_page: Page number for all products pagination
    
    Returns:
        Unique cache key like:
        mizizzi:homepage:cat:20:flash:20:lux:12:new:20:top:20:trend:20:daily:20:all:12:page:1
    
    Benefits:
        - Each parameter combination gets its own cache entry
        - Cache keys are deterministic and reproducible
        - Easy to debug which parameters correspond to a cache entry
    """
    cache_key = (
        f"mizizzi:homepage:"
        f"cat:{categories_limit}:"
        f"flash:{flash_sale_limit}:"
        f"lux:{luxury_limit}:"
        f"new:{new_arrivals_limit}:"
        f"top:{top_picks_limit}:"
        f"trend:{trending_limit}:"
        f"daily:{daily_finds_limit}:"
        f"all:{all_products_limit}:"
        f"page:{all_products_page}"
    )
    return cache_key
