"""
Homepage Featured Products Service
Handles fetching all featured product sections in one batch.
Uses the existing featured_sections configuration and helpers.
"""
from flask import current_app
from app.routes.products.featured_routes import FEATURED_SECTIONS, _get_featured_products
from app.routes.products.serializers import serialize_product_minimal
from app.utils.redis_cache import cached_response


def get_homepage_featured_sections():
    """
    Fetch all featured product sections (trending, flash sale, new arrivals, etc).
    Returns dict with all featured sections.
    Uses individual Redis caching per section (from featured_routes config).
    This function orchestrates existing section-level caching.
    """
    result = {}
    
    for section_name in ['trending', 'flash_sale', 'new_arrivals', 'top_picks', 'daily_finds', 'luxury_deals']:
        try:
            products = _get_featured_products(section_name, limit=20)
            result[section_name] = [serialize_product_minimal(p) for p in products]
        except Exception as e:
            current_app.logger.error(f"[Homepage] Error fetching {section_name}: {e}")
            result[section_name] = []
    
    return result
