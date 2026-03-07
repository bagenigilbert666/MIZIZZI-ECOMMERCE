"""Homepage All Products Loader - Fetches all products with pagination."""
import logging
import time
from typing import Dict, Any
from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:all_products"
CACHE_TTL = 120  # 2 minutes


def get_homepage_all_products(limit: int = 12, page: int = 1) -> Dict[str, Any]:
    """
    Fetch paginated all products for homepage with Redis caching.
    OPTIMIZATION: Queries only 6 needed columns instead of full Product ORM objects.
    Eliminates redundant COUNT query using fetch-limit+1 pattern.
    
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
        
        # Precise timing: SQL query execution
        query_start = time.perf_counter()
        
        # OPTIMIZATION: Query ONLY 6 needed columns instead of full Product objects
        # Fetch limit+1 to determine has_more without separate COUNT query
        rows = db.session.query(
            Product.id,
            Product.name,
            Product.slug,
            Product.price,
            Product.sale_price,
            Product.thumbnail_url
        ).filter(Product.is_active == True)\
         .order_by(Product.created_at.desc())\
         .limit(limit + 1)\
         .offset(offset)\
         .all()
        
        query_time = time.perf_counter() - query_start
        
        # Precise timing: Serialization
        serialize_start = time.perf_counter()
        
        # Determine if there are more results beyond this page
        has_more = len(rows) > limit
        if has_more:
            rows = rows[:limit]  # Trim to actual limit
        
        # OPTIMIZATION: Use index-based tuple access instead of attribute access
        product_list = [
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
        
        # Build response
        result = {
            "products": product_list,
            "has_more": has_more,
            "page": page
        }
        
        # Cache result
        if product_cache:
            product_cache.set(cache_key, result, CACHE_TTL)
        
        total_time = query_time + serialize_time
        logger.debug(
            f"[Homepage] All products page {page}: {len(product_list)} items | "
            f"Query: {query_time*1000:.2f}ms | "
            f"Serialize: {serialize_time*1000:.2f}ms | "
            f"Total: {total_time*1000:.2f}ms | "
            f"has_more: {has_more}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading all products: {e}")
        return {"products": [], "has_more": False, "page": 1}
