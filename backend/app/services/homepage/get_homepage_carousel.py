"""Homepage Carousel Loader - Fetches carousel items for homepage."""
import logging
import time
from typing import List, Dict, Any
from app.models.carousel_model import CarouselBanner
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:carousel"
CACHE_TTL = 600  # 10 minutes


def get_homepage_carousel() -> List[Dict[str, Any]]:
    """
    Fetch carousel items for homepage with Redis caching.
    OPTIMIZATION: Column-specific query with index-based tuple access.
    Only returns active homepage carousel items ordered by sort_order.
    
    Target: <50ms cold, <1ms warm (cached)
    """
    try:
        # Cache hit check
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Carousel loaded from cache")
                return cached
        
        # Precise timing: SQL query execution
        query_start = time.perf_counter()
        
        rows = (
            db.session.query(
                CarouselBanner.id,
                CarouselBanner.title,
                CarouselBanner.description,
                CarouselBanner.image_url,
                CarouselBanner.button_text,
                CarouselBanner.link_url,
                CarouselBanner.position,
                CarouselBanner.sort_order,
            )
            .filter(CarouselBanner.is_active.is_(True))
            .filter(CarouselBanner.position == 'homepage')  # Only homepage carousel
            .order_by(CarouselBanner.sort_order.asc())
            .all()
        )
        
        query_time = time.perf_counter() - query_start
        
        # Precise timing: Serialization
        serialize_start = time.perf_counter()
        
        # OPTIMIZATION: Use index-based tuple access instead of attribute access
        # This avoids SQLAlchemy's internal attribute resolution overhead
        result = [
            {
                "id": row[0],
                "title": row[1] or "",
                "description": row[2] or "",
                "image_url": row[3] or "",
                "button_text": row[4] or "",
                "button_url": row[5] or "",
                "position": row[6] or "",
                "sort_order": row[7] or 0,
            }
            for row in rows
        ]
        
        serialize_time = time.perf_counter() - serialize_start
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        total_time = query_time + serialize_time
        logger.debug(
            f"[Homepage] Carousel: {len(result)} items | "
            f"Query: {query_time*1000:.2f}ms | "
            f"Serialize: {serialize_time*1000:.2f}ms | "
            f"Total: {total_time*1000:.2f}ms"
        )
        
        return result

    except Exception as e:
        logger.error(f"[Homepage] Error loading carousel: {e}")
        return []
