"""Homepage Categories Loader - Fetches categories for homepage display."""
import logging
from typing import List, Dict, Any
from app.models.models import Category
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache, fast_json_dumps

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:categories"
CACHE_TTL = 300  # 5 minutes


async def get_homepage_categories(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch categories for homepage with Redis caching.
    
    Args:
        limit: Maximum number of categories to return
        
    Returns:
        List of category dictionaries with id, name, slug, image
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Categories loaded from cache")
                return cached
        
        # Query database
        categories = db.session.query(Category).limit(limit).all()
        
        # Serialize
        result = [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "image": c.image,
                "description": c.description or ""
            }
            for c in categories
        ]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(result)} categories")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading categories: {e}")
        return []
