"""Homepage Feature Cards Loader - Loads feature cards for homepage display."""
import logging
from typing import List, Dict, Any
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

FEATURE_CARDS_CACHE_KEY = "mizizzi:homepage:feature_cards"
FEATURE_CARDS_CACHE_TTL = 900  # 15 minutes

# Hardcoded feature cards (can be extended to load from database if needed)
DEFAULT_FEATURE_CARDS = [
    {
        "id": 1,
        "title": "Fast Delivery",
        "description": "Same-day delivery available in major cities",
        "icon": "Zap",
        "color": "from-orange-400 to-orange-600",
    },
    {
        "id": 2,
        "title": "Secure Payments",
        "description": "100% secure transactions with multiple payment options",
        "icon": "Shield",
        "color": "from-green-400 to-green-600",
    },
    {
        "id": 3,
        "title": "Easy Returns",
        "description": "30-day returns for all products, no questions asked",
        "icon": "RefreshCw",
        "color": "from-blue-400 to-blue-600",
    },
    {
        "id": 4,
        "title": "Customer Support",
        "description": "24/7 support via chat, email, or phone",
        "icon": "Headphones",
        "color": "from-purple-400 to-purple-600",
    },
]


def get_homepage_feature_cards() -> List[Dict[str, Any]]:
    """
    Fetch feature cards for homepage display.
    
    Feature cards highlight key selling points and are typically static or rarely changed.
    Uses Redis caching with 15-minute TTL.
    
    Returns:
        List of feature card dictionaries
        
    Note:
        Currently returns default hardcoded cards. Can be extended to load from
        a database table (FeatureCard model) if dynamic management is needed.
    """
    try:
        # Check cache first
        if product_cache:
            cached = product_cache.get(FEATURE_CARDS_CACHE_KEY)
            if cached:
                logger.debug("[Feature Cards] Loaded from cache")
                return cached
        
        logger.debug("[Feature Cards] Returning default feature cards")
        
        # For now, return default cards
        # In future, could load from DB: FeatureCard.query.filter(...).all()
        feature_cards = DEFAULT_FEATURE_CARDS
        
        # Cache the result
        if product_cache:
            product_cache.set(
                FEATURE_CARDS_CACHE_KEY,
                feature_cards,
                FEATURE_CARDS_CACHE_TTL
            )
        
        logger.debug(f"[Feature Cards] Loaded {len(feature_cards)} items")
        return feature_cards
        
    except Exception as e:
        logger.error(f"[Feature Cards] Error: {e}")
        return DEFAULT_FEATURE_CARDS
