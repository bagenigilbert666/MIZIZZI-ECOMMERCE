"""
Homepage Carousel Service
Handles fetching carousel banners/premium experiences.
Keeps carousel logic isolated and reusable.
"""
from app.models.models import CarouselItem
from app.utils.redis_cache import cached_response


def get_homepage_carousel(limit=5):
    """
    Fetch carousel items for homepage.
    Returns list of serialized carousel items.
    Uses Redis caching with 1-hour TTL.
    """
    cache_key = "mizizzi:homepage:carousel"
    
    @cached_response(cache_key, ttl=3600)
    def _fetch():
        carousels = CarouselItem.query.filter(
            CarouselItem.is_active == True
        ).order_by(CarouselItem.order).limit(limit).all()
        
        return [
            {
                "id": c.id,
                "title": c.title,
                "image_url": c.image_url,
                "link": c.link,
                "order": c.order,
            }
            for c in carousels
        ]
    
    return _fetch()
