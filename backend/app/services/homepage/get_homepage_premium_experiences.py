"""Homepage Premium Experiences Loader - Loads premium experience side panels."""
import logging
from typing import List, Dict, Any
from app.models.side_panel_model import SidePanel
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

PREMIUM_EXPERIENCES_CACHE_KEY = "mizizzi:homepage:premium_experiences"
PREMIUM_EXPERIENCES_CACHE_TTL = 600  # 10 minutes


def get_homepage_premium_experiences() -> List[Dict[str, Any]]:
    """
    Fetch premium experience panels for homepage display.
    
    Loads side panels with type='premium_experience' sorted by order.
    Uses Redis caching with 10-minute TTL.
    
    Returns:
        List of premium experience panel dictionaries, or empty list on error
        
    Performance:
        - Cached: <10ms (Redis)
        - First load: ~20-30ms (DB query with indexed fields)
    """
    try:
        # Check cache first
        if product_cache:
            cached = product_cache.get(PREMIUM_EXPERIENCES_CACHE_KEY)
            if cached:
                logger.debug("[Premium Experiences] Loaded from cache")
                return cached
        
        logger.debug("[Premium Experiences] Querying database...")
        
        # Query active premium experience panels sorted by position
        panels = SidePanel.query.filter(
            SidePanel.panel_type == 'premium_experience',
            SidePanel.is_active == True
        ).order_by(SidePanel.sort_order.asc()).all()
        
        # Serialize panels
        premium_experiences = []
        for panel in panels:
            premium_experiences.append({
                "id": panel.id,
                "title": panel.title,
                "metric": panel.metric,
                "description": panel.description,
                "icon_name": panel.icon_name,
                "image_url": panel.image_url,
                "gradient": panel.gradient,
                "features": panel.features or [],
                "position": panel.position,
            })
        
        # Cache the result
        if product_cache:
            product_cache.set(
                PREMIUM_EXPERIENCES_CACHE_KEY,
                premium_experiences,
                PREMIUM_EXPERIENCES_CACHE_TTL
            )
        
        logger.debug(f"[Premium Experiences] Loaded {len(premium_experiences)} items")
        return premium_experiences
        
    except Exception as e:
        logger.error(f"[Premium Experiences] Error: {e}")
        return []
