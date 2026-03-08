"""Homepage Carousel Loader - Fetches carousel items for homepage."""
import logging
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
    Only returns active carousel items ordered by position.
    
    Returns:
        List of carousel item dictionaries
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Carousel loaded from cache")
                return cached
        
        # Query database - only active items
        banners = db.session.query(CarouselBanner)\
            .filter(CarouselBanner.is_active == True)\
            .order_by(CarouselBanner.position.asc())\
            .all()
        
        # Serialize with full image support
        result = [
            {
                "id": b.id,
                "title": b.title or "",
                "subtitle": b.title or "",  # Backup for contact CTA slides
                "description": b.description or "",
                "image_url": b.image_url or "",
                "image": b.image_url or "",  # Backward compatibility
                "button_text": b.button_text or "",
                "button_url": b.link_url or "",
                "link_url": b.link_url or "",
                "position": b.position or 0,
                "is_active": b.is_active
            }
            for b in banners
        ]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(result)} carousel items")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading carousel: {e}")
        return []
