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
    OPTIMIZATION: Uses column-specific query to load only needed fields (no full model).
    This avoids loading large binary relationships while still getting image data paths.
    
    Args:
        limit: Maximum number of categories to return
        
    Returns:
        List of category dictionaries with id, name, slug, image_url, description
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            # IMPORTANT: Use `is not None` NOT `if cached:` to handle empty arrays
            if cached is not None:
                logger.debug("[Homepage] Categories loaded from cache")
                return cached
        
        # Query full Category objects to access both image_url and image_data for proper URL generation
        # We need the image_data field to know if stored image exists, to generate correct API endpoint
        categories = db.session.query(Category)\
         .filter(Category.is_active == True)\
         .order_by(Category.sort_order.asc(), Category.created_at.desc())\
         .limit(limit)\
         .all()
        
        # Serialize using to_dict() which handles image_url generation correctly:
        # - If image_data exists: returns API endpoint `/api/admin/shop-categories/categories/{id}/image`
        # - Otherwise: returns image_url field from database
        result = [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "image_url": cat.to_dict()["image_url"],  # Use to_dict() for proper image URL generation
                "description": cat.description or "",
                "is_active": True
            }
            for cat in categories
        ]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.info(f"[Homepage] Loaded {len(result)} categories with images")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading categories: {e}", exc_info=True)
        return []
