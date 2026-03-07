"""Homepage Categories Loader - Fetches categories for homepage display."""
import logging
from typing import List, Dict, Any
from app.models.models import Category
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache, fast_json_dumps

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:categories"
CACHE_TTL = 300  # 5 minutes


def get_homepage_categories(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch categories for homepage with Redis caching.
    OPTIMIZATION: Uses column-specific query to load only 5 needed fields (no full model).
    This avoids loading large binary image_data, banner_data, and relationships.
    
    Args:
        limit: Maximum number of categories to return
        
    Returns:
        List of category dictionaries with id, name, slug, image, description
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Categories loaded from cache")
                return cached
        
        # OPTIMIZATION: Query only 5 needed columns, not full model
        # This avoids loading image_data (LargeBinary), banner_data, and subcategories relationship
        # Explicit filter for active categories for future index support
        categories = db.session.query(
            Category.id,
            Category.name,
            Category.slug,
            Category.image_url,
            Category.description
        ).filter(Category.is_active == True)\
         .order_by(Category.sort_order.asc(), Category.created_at.desc())\
         .limit(limit)\
         .all()
        
        # Serialize from tuples directly
        result = [
            {
                "id": row[0],
                "name": row[1],
                "slug": row[2],
                "image": row[3],
                "description": row[4] or ""
            }
            for row in categories
        ]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(result)} categories")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading categories: {e}")
        return []
