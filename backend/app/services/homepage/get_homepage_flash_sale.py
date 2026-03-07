"""Homepage Flash Sale Loader - Fetches flash sale products for homepage."""
import logging
from typing import List, Dict, Any
from app.models.models import Product
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache
from app.routes.products.serializers import serialize_product_minimal

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:flash_sale"
CACHE_TTL = 60  # 1 minute - flash sales update frequently


def get_homepage_flash_sale(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch flash sale products for homepage with Redis caching.
    Uses dedicated database index for fast queries.
    
    Args:
        limit: Maximum number of products to return
        
    Returns:
        List of flash sale product dictionaries
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Flash sale loaded from cache")
                return cached
        
        # Query database - uses idx_products_flash_sale index
        products = db.session.query(Product)\
            .filter(Product.is_flash_sale == True)\
            .filter(Product.is_active == True)\
            .order_by(Product.discount_percentage.desc())\
            .limit(limit)\
            .all()
        
        # Serialize using existing serializer
        result = [serialize_product_minimal(p) for p in products]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(result)} flash sale products")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading flash sale products: {e}")
        return []
