"""
Homepage Categories Service
Handles fetching categories for the homepage.
Keeps category logic isolated and reusable.
"""
from sqlalchemy.orm import load_only
from app.models.models import Category
from app.configuration.extensions import db
from app.utils.redis_cache import cached_response


def get_homepage_categories(limit=20):
    """
    Fetch categories for homepage.
    Returns list of serialized categories.
    Uses Redis caching with 1-hour TTL.
    """
    cache_key = "mizizzi:homepage:categories"
    
    @cached_response(cache_key, ttl=3600)
    def _fetch():
        categories = Category.query.filter(
            Category.is_active == True
        ).order_by(Category.name).limit(limit).all()
        
        return [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "image_url": c.image_url,
                "description": c.description,
            }
            for c in categories
        ]
    
    return _fetch()
