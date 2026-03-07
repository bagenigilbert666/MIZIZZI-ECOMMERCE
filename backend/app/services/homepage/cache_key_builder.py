"""Homepage Cache Key Builder - Generates dynamic, parameter-aware cache keys."""


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
    Build a dynamic Redis cache key that encodes all query parameters.

    Different parameter combinations produce different cache keys so
    each unique request is cached separately and stale data from one
    parameter set never leaks into another.

    Returns:
        A namespaced string like:
        mizizzi:homepage:cat20:flash20:lux12:arr20:top20:trend20:daily20:all12:pg1
    """
    return (
        f"mizizzi:homepage:"
        f"cat{categories_limit}:"
        f"flash{flash_sale_limit}:"
        f"lux{luxury_limit}:"
        f"arr{new_arrivals_limit}:"
        f"top{top_picks_limit}:"
        f"trend{trending_limit}:"
        f"daily{daily_finds_limit}:"
        f"all{all_products_limit}:"
        f"pg{all_products_page}"
    )
