"""
Cache key definitions for Mizizzi E-commerce platform.
Provides separate namespaces for public and admin caches to prevent data leakage.
"""

# ----------------------
# Public Cache Keys (only active, visible products)
# ----------------------

# Single product detail (public users only see active/visible)
PUBLIC_PRODUCT_KEY = "mizizzi:product:public:{id}"
PUBLIC_PRODUCT_SLUG_KEY = "mizizzi:product:public:slug:{slug}"

# Product lists
PUBLIC_LIST_KEY = "mizizzi:products:public"
PUBLIC_CATEGORY_KEY = "mizizzi:category:public:{slug}"
PUBLIC_BRAND_KEY = "mizizzi:brand:public:{slug}"

# Featured sections
PUBLIC_FEATURED_KEY = "mizizzi:featured:public:{section}"
PUBLIC_TRENDING_KEY = "mizizzi:featured:public:trending"
PUBLIC_FLASH_SALE_KEY = "mizizzi:featured:public:flash_sale"
PUBLIC_NEW_ARRIVALS_KEY = "mizizzi:featured:public:new_arrivals"
PUBLIC_TOP_PICKS_KEY = "mizizzi:featured:public:top_picks"
PUBLIC_DAILY_FINDS_KEY = "mizizzi:featured:public:daily_finds"
PUBLIC_LUXURY_DEALS_KEY = "mizizzi:featured:public:luxury_deals"

# Search
PUBLIC_SEARCH_KEY = "mizizzi:search:public:{query_hash}"

# Fast endpoints (pre-serialized JSON)
FAST_TRENDING_KEY = "mizizzi:fast:trending"
FAST_FLASH_SALE_KEY = "mizizzi:fast:flash_sale"
FAST_NEW_ARRIVALS_KEY = "mizizzi:fast:new_arrivals"
FAST_ALL_PRODUCTS_KEY = "mizizzi:fast:all_products"

# ----------------------
# Admin Cache Keys (all products including inactive/invisible)
# ----------------------

# Single product detail (admin sees all fields)
ADMIN_PRODUCT_KEY = "mizizzi:product:admin:{id}"
ADMIN_PRODUCT_SLUG_KEY = "mizizzi:product:admin:slug:{slug}"

# Product lists (admin sees all products)
ADMIN_LIST_KEY = "mizizzi:products:admin"
ADMIN_CATEGORY_KEY = "mizizzi:category:admin:{slug}"
ADMIN_BRAND_KEY = "mizizzi:brand:admin:{slug}"

# Search (admin searches include inactive)
ADMIN_SEARCH_KEY = "mizizzi:search:admin:{query_hash}"

# ----------------------
# Cache TTL Configuration (in seconds)
# ----------------------

CACHE_TTL = {
    # Single product detail - medium TTL
    'product_detail': 600,       # 10 minutes
    'product_detail_admin': 300, # 5 minutes (admin sees changes faster)
    
    # Product lists - shorter TTL
    'product_list': 300,         # 5 minutes
    'product_list_admin': 180,   # 3 minutes
    
    # Category/Brand lists
    'category_list': 300,        # 5 minutes
    'brand_list': 300,           # 5 minutes
    
    # Featured sections - varies by urgency
    'featured_trending': 120,    # 2 minutes
    'featured_flash_sale': 60,   # 1 minute (time-sensitive)
    'featured_new_arrivals': 180,# 3 minutes
    'featured_top_picks': 120,   # 2 minutes
    'featured_daily_finds': 300, # 5 minutes
    'featured_luxury_deals': 180,# 3 minutes
    
    # Search results - short TTL
    'search': 120,               # 2 minutes
    'search_admin': 60,          # 1 minute
    
    # Fast endpoints (pre-serialized JSON)
    'fast_trending': 60,         # 1 minute
    'fast_flash_sale': 30,       # 30 seconds (most time-sensitive)
    'fast_new_arrivals': 120,    # 2 minutes
    'fast_all_products': 600,    # 10 minutes
    
    # All products cache (for cache warming)
    'all_products': 600,         # 10 minutes
}

# ----------------------
# Cache Pattern Definitions (for invalidation)
# ----------------------

CACHE_PATTERNS = {
    # Invalidate all public caches for a product
    'product_public': [
        "mizizzi:product:public:*",
        "mizizzi:products:public*",
    ],
    
    # Invalidate all admin caches for a product
    'product_admin': [
        "mizizzi:product:admin:*",
        "mizizzi:products:admin*",
    ],
    
    # Invalidate all list caches
    'all_lists': [
        "mizizzi:products:*",
        "mizizzi:category:*",
        "mizizzi:brand:*",
    ],
    
    # Invalidate all featured section caches
    'all_featured': [
        "mizizzi:featured:*",
        "mizizzi:fast:*",
    ],
    
    # Invalidate all search caches
    'all_search': [
        "mizizzi:search:*",
    ],
    
    # Nuclear option - invalidate everything
    'all': [
        "mizizzi:*",
    ],
}


def get_public_product_key(product_id):
    """Generate cache key for public product detail."""
    return PUBLIC_PRODUCT_KEY.format(id=product_id)


def get_admin_product_key(product_id):
    """Generate cache key for admin product detail."""
    return ADMIN_PRODUCT_KEY.format(id=product_id)


def get_public_product_slug_key(slug):
    """Generate cache key for public product by slug."""
    return PUBLIC_PRODUCT_SLUG_KEY.format(slug=slug)


def get_admin_product_slug_key(slug):
    """Generate cache key for admin product by slug."""
    return ADMIN_PRODUCT_SLUG_KEY.format(slug=slug)


def get_public_category_key(category_slug):
    """Generate cache key for public category products."""
    return PUBLIC_CATEGORY_KEY.format(slug=category_slug)


def get_admin_category_key(category_slug):
    """Generate cache key for admin category products."""
    return ADMIN_CATEGORY_KEY.format(slug=category_slug)


def get_public_featured_key(section):
    """Generate cache key for public featured section."""
    return PUBLIC_FEATURED_KEY.format(section=section)


def get_search_key(query_hash, for_admin=False):
    """Generate cache key for search results."""
    if for_admin:
        return ADMIN_SEARCH_KEY.format(query_hash=query_hash)
    return PUBLIC_SEARCH_KEY.format(query_hash=query_hash)
