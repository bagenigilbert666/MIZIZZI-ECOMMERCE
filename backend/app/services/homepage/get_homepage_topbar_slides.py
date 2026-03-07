"""Homepage Topbar Slides Loader - Fetches topbar slides for homepage display."""
import logging
from typing import List, Dict, Any
from app.models.topbar_model import TopBarSlide
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:topbar_slides"
CACHE_TTL = 300  # 5 minutes


async def get_homepage_topbar_slides() -> List[Dict[str, Any]]:
    """
    Fetch active topbar slides for homepage with Redis caching.

    Returns:
        List of topbar slide dictionaries.
    """
    try:
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Topbar slides loaded from cache")
                return cached

        slides = (
            db.session.query(TopBarSlide)
            .filter(TopBarSlide.is_active == True)
            .order_by(TopBarSlide.sort_order.asc())
            .all()
        )

        result = [slide.to_dict() for slide in slides]

        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)

        logger.debug(f"[Homepage] Loaded {len(result)} topbar slides")
        return result

    except Exception as e:
        logger.error(f"[Homepage] Error loading topbar slides: {e}")
        return []
