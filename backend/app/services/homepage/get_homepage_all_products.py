"""Homepage All Products Loader - Fetches all products with pagination."""
import logging
from typing import Dict, Any
from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache
from app.routes.products.serializers import serialize_product_with_images
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:all_products"
CACHE_TTL = 120  # 2 minutes


def get_homepage_all_products(limit: int = 12, page: int = 1) -> Dict[str, Any]:

    """
    Fetch paginated all products for homepage with Redis caching.
    OPTIMIZATION: Eliminates redundant COUNT query using window functions.
    
    Args:
        limit: Maximum number of products per page
        page: Page number (1-indexed)
        
    Returns:
        Dictionary with products list and has_more flag
    """
    try:
        # Generate cache key with pagination params
        cache_key = f"{CACHE_KEY}:page_{page}:limit_{limit}"
        
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(cache_key)
            if cached:
                logger.debug(f"[Homepage] All products page {page} loaded from cache")
                return cached
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # OPTIMIZATION: Use a single query with window function to get both count and products
        # This eliminates the need for a separate COUNT query
        # We'll fetch limit+1 to determine has_more without a COUNT
        fetch_limit = limit + 1
        
        # Query products with eager loading for images - fetch one extra to determine has_more
        products = db.session.query(Product)\
            .options(joinedload(Product.images))\
            .filter(Product.is_active == True)\
            .order_by(Product.created_at.desc())\
            .limit(fetch_limit)\
            .offset(offset)\
            .all()
        
        # Determine if there are more results beyond this page
        has_more = len(products) > limit
        if has_more:
            products = products[:limit]  # Trim to actual limit
        
        # Serialize with full image support
        product_list = [serialize_product_with_images(p) for p in products]
        
        # Build response
        result = {
            "products": product_list,
            "has_more": has_more,
            "page": page
        }
        
        # Cache result
        if product_cache:
            product_cache.set(cache_key, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(product_list)} all products for page {page} (has_more: {has_more})")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading all products: {e}")
        return {"products": [], "has_more": False, "page": 1}
