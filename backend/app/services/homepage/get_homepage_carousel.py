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
    """
    try:
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Carousel loaded from cache")
                return cached

        rows = (
            db.session.query(
                CarouselBanner.id,
                CarouselBanner.title,
                CarouselBanner.description,
                CarouselBanner.image_url,
                CarouselBanner.button_text,
                CarouselBanner.link_url,
                CarouselBanner.position,
            )
            .filter(CarouselBanner.is_active.is_(True))
            .order_by(CarouselBanner.position.asc())
            .all()
        )

        result = [
            {
                "id": row.id,
                "title": row.title or "",
                "description": row.description or "",
                "image_url": row.image_url or "",
                "button_text": row.button_text or "",
                "button_url": row.link_url or "",
                "position": row.position or 0,
            }
            for row in rows
        ]

        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)

        logger.debug(f"[Homepage] Loaded {len(result)} carousel items")
        return result

    except Exception as e:
        logger.error(f"[Homepage] Error loading carousel: {e}")
        return []