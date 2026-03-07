"""Homepage Contact CTA Slides Loader - Fetches contact CTA slides for homepage."""
import logging
from typing import List, Dict, Any
from app.models.contact_cta_model import ContactCTA
from app.configuration.extensions import db
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

CACHE_KEY = "mizizzi:homepage:contact_cta_slides"
CACHE_TTL = 3600  # 1 hour - stable admin content, long TTL to maximize reuse


def get_homepage_contact_cta_slides() -> List[Dict[str, Any]]:
    """
    Fetch contact CTA slides for homepage with Redis caching.
    
    Returns:
        List of contact CTA slide dictionaries
    """
    try:
        # Try to get from Redis cache
        if product_cache:
            cached = product_cache.get(CACHE_KEY)
            if cached:
                logger.debug("[Homepage] Contact CTA slides loaded from cache")
                return cached
        
        # Query database
        slides = db.session.query(ContactCTA)\
            .filter(ContactCTA.is_active == True)\
            .order_by(ContactCTA.sort_order.asc())\
            .all()
        
        # Serialize
        result = [slide.to_dict() for slide in slides]
        
        # Cache result
        if product_cache:
            product_cache.set(CACHE_KEY, result, CACHE_TTL)
        
        logger.debug(f"[Homepage] Loaded {len(result)} contact CTA slides")
        return result
        
    except Exception as e:
        logger.error(f"[Homepage] Error loading contact CTA slides: {e}")
        return []
