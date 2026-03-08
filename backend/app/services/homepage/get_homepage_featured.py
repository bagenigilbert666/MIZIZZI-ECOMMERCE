"""Homepage Featured Products Loaders - Modular loaders for each featured section."""
import logging
from typing import List, Dict, Any
from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache
from app.routes.products.serializers import serialize_product_with_images
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)

# Cache configuration for each featured section
FEATURED_CACHE_CONFIG = {
    "luxury": {"key": "mizizzi:homepage:luxury", "ttl": 180, "flag": "is_luxury_deal"},
    "new_arrivals": {"key": "mizizzi:homepage:new_arrivals", "ttl": 180, "flag": "is_new_arrival"},
    "top_picks": {"key": "mizizzi:homepage:top_picks", "ttl": 120, "flag": "is_top_pick"},
    "trending": {"key": "mizizzi:homepage:trending", "ttl": 120, "flag": "is_trending"},
    "daily_finds": {"key": "mizizzi:homepage:daily_finds", "ttl": 300, "flag": "is_daily_find"},
}


def get_featured_products(section: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Generic loader for featured product sections with caching and N+1 prevention.
    Uses eager loading to prevent N+1 queries on relationships.
    Each section uses a dedicated database index for optimal performance.
    
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
        
        # OPTIMIZATION: Use eager loading to prevent N+1 queries on relationships
        # Query database with eager-loaded images for proper image support
        products = db.session.query(Product)\
            .options(joinedload(Product.images))\
            .filter(filter_attr == True)\
            .filter(Product.is_active == True)\
            .order_by(Product.created_at.desc())\
            .limit(limit)\
            .all()
        
        # Serialize with full image support
        result = [serialize_product_with_images(p) for p in products]
        
        # Cache result
        if product_cache:
            product_cache.set(cache_key, result, config["ttl"])
        
        logger.debug(f"[Homepage] Loaded {len(result)} {section} products")
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
