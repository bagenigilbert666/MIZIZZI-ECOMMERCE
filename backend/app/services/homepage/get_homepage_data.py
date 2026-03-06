"""
Homepage Data Aggregator
Combines all homepage section services into one unified batch response.
Orchestrates parallel fetching of all sections with graceful error handling.
This is the single entry point for homepage data.
"""
import asyncio
from flask import current_app
from app.services.homepage.get_homepage_categories import get_homepage_categories
from app.services.homepage.get_homepage_carousel import get_homepage_carousel
from app.services.homepage.get_homepage_featured import get_homepage_featured_sections
from app.services.homepage.get_homepage_all_products import get_homepage_all_products


def get_homepage_data():
    """
    Fetch all homepage data in one unified batch.
    
    Fetches:
    - Categories
    - Carousel/Premium experiences
    - All featured sections (trending, flash sale, etc)
    - General product listing
    
    Returns dict with all sections. If any section fails,
    returns empty list for that section (graceful degradation).
    
    Uses existing Redis caching per section (no additional caching needed here).
    """
    result = {
        "categories": [],
        "carousel": [],
        "featured": {
            "trending": [],
            "flash_sale": [],
            "new_arrivals": [],
            "top_picks": [],
            "daily_finds": [],
            "luxury_deals": [],
        },
        "all_products": [],
        "all_products_has_more": False,
    }
    
    try:
        # Fetch all sections with error handling
        # Each section is fetched, failures don't affect others
        try:
            result["categories"] = get_homepage_categories(limit=20)
        except Exception as e:
            current_app.logger.error(f"[Homepage Aggregator] Error fetching categories: {e}")
        
        try:
            result["carousel"] = get_homepage_carousel(limit=5)
        except Exception as e:
            current_app.logger.error(f"[Homepage Aggregator] Error fetching carousel: {e}")
        
        try:
            featured_data = get_homepage_featured_sections()
            result["featured"] = featured_data
        except Exception as e:
            current_app.logger.error(f"[Homepage Aggregator] Error fetching featured sections: {e}")
        
        try:
            all_products_data = get_homepage_all_products(limit=12)
            result["all_products"] = all_products_data.get("products", [])
            result["all_products_has_more"] = all_products_data.get("has_more", False)
        except Exception as e:
            current_app.logger.error(f"[Homepage Aggregator] Error fetching all products: {e}")
    
    except Exception as e:
        current_app.logger.error(f"[Homepage Aggregator] Unexpected error: {e}")
    
    return result
