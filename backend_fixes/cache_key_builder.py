"""
Cache Key Builder - Generates dynamic cache keys based on request parameters.

FIX #1: The old static key 'mizizzi:homepage:data' caused cache collisions
when different parameter combinations were requested. This builder creates
unique keys per parameter set.
"""

from typing import Optional


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
    
    Returns a key like:
    mizizzi:homepage:cat:20:flash:20:lux:12:new:20:top:20:trend:20:daily:20:all:12:page:1
    """
    return (
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


def build_section_cache_key(section_name: str, **params) -> str:
    """
    Build a cache key for individual sections.
    
    Example: mizizzi:homepage:flash_sale:limit:20
    """
    param_str = ":".join(f"{k}:{v}" for k, v in sorted(params.items()))
    return f"mizizzi:homepage:{section_name}:{param_str}" if param_str else f"mizizzi:homepage:{section_name}"
