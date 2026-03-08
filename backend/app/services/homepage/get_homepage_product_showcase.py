"""Homepage Product Showcase Loader - Loads product showcase side panels."""
import logging
from typing import List, Dict, Any
from app.models.side_panel_model import SidePanel
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

PRODUCT_SHOWCASE_CACHE_KEY = "mizizzi:homepage:product_showcase"
PRODUCT_SHOWCASE_CACHE_TTL = 600  # 10 minutes


def get_homepage_product_showcase() -> List[Dict[str, Any]]:
    """
    Fetch product showcase panels for homepage display.
    
    Loads side panels with type='product_showcase' sorted by order.
    Uses Redis caching with 10-minute TTL.
    
    Returns:
        List of product showcase panel dictionaries, or empty list on error
        
    Performance:
        - Cached: <10ms (Redis)
        - First load: ~20-30ms (DB query with indexed fields)
    """
    try:
        # Check cache first
        if product_cache:
            cached = product_cache.get(PRODUCT_SHOWCASE_CACHE_KEY)
            if cached:
                logger.debug("[Product Showcase] Loaded from cache")
                return cached
        
        logger.debug("[Product Showcase] Querying database...")
        
        # Query active product showcase panels sorted by position
        panels = SidePanel.query.filter(
            SidePanel.panel_type == 'product_showcase',
            SidePanel.is_active == True
        ).order_by(SidePanel.sort_order.asc()).all()
        
        # Serialize panels with image support
        product_showcase = []
        for panel in panels:
            product_showcase.append({
                "id": panel.id,
                "title": panel.title,
                "metric": panel.metric,
                "description": panel.description,
                "icon_name": panel.icon_name,
                "image_url": panel.image_url or "",
                "image": panel.image_url or "",  # Backward compatibility
                "gradient": panel.gradient or "from-rose-500 to-pink-600",
                "features": panel.features or [],
                "position": panel.position,
                "is_active": panel.is_active,
            })
        
        # Cache the result
        if product_cache:
            product_cache.set(
                PRODUCT_SHOWCASE_CACHE_KEY,
                product_showcase,
                PRODUCT_SHOWCASE_CACHE_TTL
            )
        
        logger.debug(f"[Product Showcase] Loaded {len(product_showcase)} items")
        return product_showcase
        
    except Exception as e:
        logger.error(f"[Product Showcase] Error: {e}")
        return []
