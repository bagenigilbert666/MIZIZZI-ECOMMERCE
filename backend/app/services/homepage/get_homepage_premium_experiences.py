"""Homepage Premium Experiences Loader - Fetches premium experience side panels."""
import logging
from typing import List, Dict, Any
from app.models.side_panel_model import SidePanel
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:premium_experiences"
CACHE_TTL = 300  # 5 minutes


async def get_homepage_premium_experiences() -> List[Dict[str, Any]]:
    """
    Fetch active premium_experience side panels for homepage with Redis caching.

    Returns:
        List of premium experience panel dictionaries.
    """
    try:
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Premium experience panels loaded from cache")
                return cached

        panels = (
            db.session.query(SidePanel)
            .filter(
                SidePanel.panel_type == "premium_experience",
                SidePanel.is_active == True,
            )
            .order_by(SidePanel.sort_order.asc())
            .all()
        )

        result = [panel.to_dict() for panel in panels]

        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)

        logger.debug(f"[Homepage] Loaded {len(result)} premium experience panels")
        return result

    except Exception as e:
        logger.error(f"[Homepage] Error loading premium experience panels: {e}")
        return []
