"""Homepage Feature Cards Loader - Loads feature cards for homepage display.

Feature cards are shortcut buttons that highlight key navigation items and promotions.
Each card includes:
  - icon: Name of lucide-react icon (e.g., "Zap", "Crown", "Heart")
  - title: Card title (uppercase, e.g., "FLASH SALES")
  - description: Short description (e.g., "Limited Time Offers")
  - href: Link destination (e.g., "/flash-sales")
  - iconBg: Tailwind gradient class for icon background
  - iconColor: Tailwind text color class for icon
  - hoverBg: Tailwind class for hover state background color
  - badge: Optional badge text (e.g., "HOT", "VIP")

Frontend component: frontend/components/carousel/feature-cards.tsx
"""
import logging
from typing import List, Dict, Any
from app.utils.redis_cache import product_cache

logger = logging.getLogger(__name__)

FEATURE_CARDS_CACHE_KEY = "mizizzi:homepage:feature_cards"
FEATURE_CARDS_CACHE_TTL = 900  # 15 minutes

# Feature cards with complete styling information for frontend UI
# Each card is designed to be a 2-column grid item (100px height on mobile)
DEFAULT_FEATURE_CARDS = [
    {
        "icon": "Zap",
        "title": "FLASH SALES",
        "description": "Limited Time Offers",
        "href": "/flash-sales",
        "iconBg": "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100",
        "iconColor": "text-amber-600",
        "hoverBg": "hover:bg-amber-50/80",
        "badge": "HOT",
    },
    {
        "icon": "Crown",
        "title": "LUXURY DEALS",
        "description": "Premium Collections",
        "href": "/luxury",
        "iconBg": "bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100",
        "iconColor": "text-violet-600",
        "hoverBg": "hover:bg-violet-50/80",
        "badge": "VIP",
    },
    {
        "icon": "Heart",
        "title": "WISHLIST",
        "description": "Save Your Favorites",
        "href": "/wishlist",
        "iconBg": "bg-gradient-to-br from-rose-100 via-pink-50 to-red-100",
        "iconColor": "text-rose-600",
        "hoverBg": "hover:bg-rose-50/80",
    },
    {
        "icon": "Package",
        "title": "ORDERS",
        "description": "Track Your Purchases",
        "href": "/orders",
        "iconBg": "bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100",
        "iconColor": "text-sky-600",
        "hoverBg": "hover:bg-sky-50/80",
    },
    {
        "icon": "HeadphonesIcon",
        "title": "SUPPORT",
        "description": "24/7 Assistance",
        "href": "/help",
        "iconBg": "bg-gradient-to-br from-emerald-100 via-green-50 to-teal-100",
        "iconColor": "text-emerald-600",
        "hoverBg": "hover:bg-emerald-50/80",
    },
    {
        "icon": "Search",
        "title": "PRODUCTS",
        "description": "Browse All Items",
        "href": "/products",
        "iconBg": "bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100",
        "iconColor": "text-slate-600",
        "hoverBg": "hover:bg-slate-50/80",
    },
]


def get_homepage_feature_cards() -> List[Dict[str, Any]]:
    """
    Fetch feature cards for homepage display.
    
    Feature cards are navigation shortcuts and promotion highlights displayed as a 
    2x3 grid on the homepage. Each card includes complete styling information (gradient 
    colors, hover states, badges) to render directly in the frontend.
    
    Uses Redis caching with 15-minute TTL.
    
    Returns:
        List of 6 feature card dictionaries, each with icon, title, description, 
        href, and complete UI styling properties (iconBg, iconColor, hoverBg, badge).
        
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
        
        # For now, return default cards with complete styling
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
