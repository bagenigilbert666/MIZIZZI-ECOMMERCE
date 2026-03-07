"""
Cache key builder for homepage batch API.

Generates dynamic cache keys based on request parameters to ensure
different parameter combinations don't return incorrect cached data.
"""


def build_homepage_cache_key(
    categories_limit: int = 20,
    flash_sale_limit: int = 20,
    luxury_limit: int = 12,
    new_arrivals_limit: int = 20,
    top_picks_limit: int = 20,
    trending_limit: int = 20,
    daily_finds_limit: int = 20,
    all_products_limit: int = 12,
    all_products_page: int = 1,
) -> str:
    """
    Build a unique cache key based on all homepage request parameters.
    
    This prevents cache collisions where different parameter combinations
    would incorrectly return the same cached result.
    
    Args:
        categories_limit: Number of categories to return
        flash_sale_limit: Number of flash sale products
        luxury_limit: Number of luxury products
        new_arrivals_limit: Number of new arrival products
        top_picks_limit: Number of top picks
        trending_limit: Number of trending products
        daily_finds_limit: Number of daily finds
        all_products_limit: Number of all products per page
        all_products_page: Page number for pagination
    
    Returns:
        str: Unique cache key incorporating all parameters
    """
    return (
        f"mizizzi:homepage:"
        f"cat:{categories_limit}:"
        f"flash:{flash_sale_limit}:"
        f"lux:{luxury_limit}:"
        f"new:{new_arrivals_limit}:"
        f"picks:{top_picks_limit}:"
        f"trend:{trending_limit}:"
        f"daily:{daily_finds_limit}:"
        f"all:{all_products_limit}:"
        f"page:{all_products_page}"
    )
