"""Homepage Featured Products Loaders - Modular loaders for each featured section."""
import logging
import time
from typing import List, Dict, Any
from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

# Cache configuration for each featured section
FEATURED_CACHE_CONFIG = {
    "luxury": {"key": "mizizzi:homepage:luxury", "ttl": 300, "flag": "is_luxury_deal"},
    "new_arrivals": {"key": "mizizzi:homepage:new_arrivals", "ttl": 300, "flag": "is_new_arrival"},
    "top_picks": {"key": "mizizzi:homepage:top_picks", "ttl": 300, "flag": "is_top_pick"},
    "trending": {"key": "mizizzi:homepage:trending", "ttl": 300, "flag": "is_trending"},
    "daily_finds": {"key": "mizizzi:homepage:daily_finds", "ttl": 1800, "flag": "is_daily_find"},  # 30 min - long TTL to avoid recomputation after cache hit
}


def get_featured_products(section: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Generic loader for featured product sections with caching.
    OPTIMIZATION: Queries only 6 needed columns (not full Product ORM objects).
    Avoids loading unused fields like description, specs, image_data, etc.
    
    Args:
        section: Featured section name (luxury, new_arrivals, top_picks, trending, daily_finds)
        limit: Maximum number of products to return
        
    Returns:
        List of product dictionaries or empty list on error
    """
    if section not in FEATURED_CACHE_CONFIG:
        logger.warning(f"[Homepage] Unknown featured section: {section}")
        return []
    
    config = FEATURED_CACHE_CONFIG[section]
    cache_key = config["key"]
    
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage] {section} loaded from cache")
                return cached
        
        # Build filter dynamically
        filter_attr = getattr(Product, config["flag"], None)
        if not filter_attr:
            logger.error(f"[Homepage] Invalid filter attribute for section: {section}")
            return []
        
        # Precise timing: SQL query execution
        query_start = time.perf_counter()
        
        # OPTIMIZATION: Query ONLY 6 needed columns instead of full Product objects
        # This dramatically reduces memory and query time - avoids loading:
        # - description, specs (large text fields)
        # - image_data, banner_data (binary fields)
        # - relationships (reviews, ratings, wishlist, etc.)
        rows = db.session.query(
            Product.id,
            Product.name,
            Product.slug,
            Product.price,
            Product.sale_price,
            Product.thumbnail_url
        ).filter(filter_attr == True)\
         .filter(Product.is_active == True)\
         .order_by(Product.created_at.desc())\
         .limit(limit)\
         .all()
        
        query_time = time.perf_counter() - query_start
        
        # Precise timing: Serialization
        serialize_start = time.perf_counter()
        
        # OPTIMIZATION: Use index-based tuple access instead of attribute access
        result = [
            {
                "id": row[0],
                "name": row[1],
                "slug": row[2],
                "price": float(row[3]) if row[3] else 0,
                "sale_price": float(row[4]) if row[4] else None,
                "image": row[5]
            }
            for row in rows
        ]
        
        serialize_time = time.perf_counter() - serialize_start
        
        # Cache result
        if product_cache:
            product_cache.set(cache_key, result, config["ttl"])
        
        total_time = query_time + serialize_time
        logger.debug(
            f"[Homepage] {section}: {len(result)} items | "
            f"Query: {query_time*1000:.2f}ms | "
            f"Serialize: {serialize_time*1000:.2f}ms | "
            f"Total: {total_time*1000:.2f}ms"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading {section} products: {e}")
        return []


# Convenience functions for each section
def get_homepage_luxury(limit: int = 12) -> List[Dict[str, Any]]:
    """Load luxury deal products for homepage."""
    return get_featured_products("luxury", limit)


def get_homepage_new_arrivals(limit: int = 20) -> List[Dict[str, Any]]:
    """Load new arrival products for homepage."""
    return get_featured_products("new_arrivals", limit)


def get_homepage_top_picks(limit: int = 20) -> List[Dict[str, Any]]:
    """Load top pick products for homepage."""
    return get_featured_products("top_picks", limit)


def get_homepage_trending(limit: int = 20) -> List[Dict[str, Any]]:
    """Load trending products for homepage."""
    return get_featured_products("trending", limit)


def get_homepage_daily_finds(limit: int = 20) -> List[Dict[str, Any]]:
    """Load daily find products for homepage."""
    return get_featured_products("daily_finds", limit)
