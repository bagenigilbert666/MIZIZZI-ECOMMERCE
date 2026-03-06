"""
Homepage All Products Service
Handles fetching the general product listing for homepage.
Keeps product listing logic isolated and reusable.
"""
from sqlalchemy.orm import load_only
from app.models.models import Product
from app.routes.products.serializers import serialize_product_minimal
from app.utils.redis_cache import cached_response


def get_homepage_all_products(limit=12):
    """
    Fetch all active/visible products for homepage listing.
    Returns dict with products list and hasMore flag.
    Uses Redis caching with 5-minute TTL.
    """
    cache_key = "mizizzi:homepage:all_products"
    
    @cached_response(cache_key, ttl=300)
    def _fetch():
        products = Product.query.filter(
            Product.is_active == True,
            Product.is_visible == True
        ).options(
            load_only(
                Product.id,
                Product.name,
                Product.slug,
                Product.price,
                Product.sale_price,
                Product.thumbnail_url,
                Product.image_urls,
            )
        ).order_by(Product.created_at.desc()).limit(limit + 1).all()
        
        has_more = len(products) > limit
        products = products[:limit]
        
        return {
            "products": [serialize_product_minimal(p) for p in products],
            "has_more": has_more,
        }
    
    return _fetch()
