"""Homepage Categories Loader - Fetches categories for homepage display with Cloudinary optimization."""
import logging
from typing import List, Dict, Any
from app.models.models import Category
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache, fast_json_dumps

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:categories"
CACHE_TTL = 300  # 5 minutes

def optimize_cloudinary_url(url: str) -> str:
    """
    Add Cloudinary transformation parameters for optimized delivery:
    - w_600: Responsive width (600px for category cards)
    - q_auto: Auto quality based on browser
    - f_auto: Auto format (WebP for browsers that support it)
    - c_fill: Crop to fill the space
    - ar_1: Aspect ratio 1:1 (square)
    
    Args:
        url: Original Cloudinary URL
        
    Returns:
        Optimized URL with transformation parameters
    """
    if not url or not isinstance(url, str):
        return url
    
    # Only optimize Cloudinary URLs
    if 'res.cloudinary.com' not in url:
        return url
    
    # If URL already has transformations, don't add more
    if '/upload/' in url and any(param in url for param in ['w_', 'q_', 'f_', 'c_', 'ar_']):
        return url
    
    # Insert transformation parameters before the filename
    # Example: https://res.cloudinary.com/account/image/upload/v1234/filename.jpg
    # Becomes: https://res.cloudinary.com/account/image/upload/w_600,q_auto,f_auto,c_fill,ar_1/v1234/filename.jpg
    if '/upload/' in url:
        parts = url.split('/upload/')
        if len(parts) == 2:
            return f"{parts[0]}/upload/w_600,q_auto,f_auto,c_fill,ar_1/{parts[1]}"
    
    return url


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
        # - If image_url contains Cloudinary URL: optimize with transformation parameters
        # - Otherwise: return image_url field from database as-is
        result = [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "image_url": optimize_cloudinary_url(cat.to_dict()["image_url"]),  # Optimize Cloudinary URLs
                "description": cat.description or "",
                "is_active": True
            }
            for cat in categories
        ]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.info(f"[Homepage] Loaded {len(result)} categories with optimized images")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading categories: {e}", exc_info=True)
        return []
