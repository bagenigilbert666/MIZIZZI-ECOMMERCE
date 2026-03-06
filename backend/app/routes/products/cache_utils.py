"""
Reusable cache and filter utility functions for product routes.
Eliminates duplication between /api/products and /api/products/fast endpoints.
"""
from flask import current_app
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Query
from app.models.models import Product


def normalize_bool_param(value: Any) -> int:
    """
    Normalize boolean query parameters to standardized 0/1 format.
    
    Converts: True, 'true', 'True', '1', 'yes', 'Yes' → 1
    Converts: False, 'false', 'False', '0', 'no', 'No', None → 0
    
    Args:
        value: Raw query parameter value
        
    Returns:
        int: 0 or 1
    """
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, str):
        return 1 if value.lower() in ('true', '1', 'yes') else 0
    if isinstance(value, int):
        return 1 if value != 0 else 0
    return 0


def extract_filter_params(request_args: Dict) -> Dict[str, Any]:
    """
    Extract and normalize filter parameters from request.
    
    Normalizes boolean values to 0/1 for consistent cache keys.
    Validates pagination parameters.
    
    Args:
        request_args: Flask request.args
        
    Returns:
        dict: Cleaned and normalized parameters
    """
    try:
        params = {
            'search': request_args.get('search', '').strip(),
            'category_id': request_args.get('category_id', type=int),
            'brand_id': request_args.get('brand_id', type=int),
            'sort_by': request_args.get('sort_by', 'newest'),
            'page': max(1, request_args.get('page', 1, type=int)),
            'per_page': min(100, max(1, request_args.get('per_page', 12, type=int))),
            # Boolean flags - normalized to 0/1
            'is_featured': normalize_bool_param(request_args.get('is_featured')),
            'is_sale': normalize_bool_param(request_args.get('is_sale')),
            'is_flash_sale': normalize_bool_param(request_args.get('is_flash_sale')),
            'is_new': normalize_bool_param(request_args.get('is_new')),
            'is_trending': normalize_bool_param(request_args.get('is_trending')),
            'is_luxury_deal': normalize_bool_param(request_args.get('is_luxury_deal')),
            'is_daily_find': normalize_bool_param(request_args.get('is_daily_find')),
            'is_top_pick': normalize_bool_param(request_args.get('is_top_pick')),
            'is_new_arrival': normalize_bool_param(request_args.get('is_new_arrival')),
            # Admin-only filters (only used if caller is admin)
            'include_inactive': normalize_bool_param(request_args.get('include_inactive')),
        }
        return params
    except Exception as e:
        current_app.logger.error(f"Error extracting filter params: {str(e)}")
        return {}


def build_cache_key_for_filters(base_key: str, params: Dict[str, Any], include_admin: bool = False) -> str:
    """
    Build a consistent cache key from normalized filter parameters.
    
    Includes only non-default parameters to reduce key length and cache fragmentation.
    Excludes `include_inactive` unless explicitly requested (admin only).
    
    Args:
        base_key: Base cache key (e.g., 'mizizzi:products:public')
        params: Normalized parameters from extract_filter_params()
        include_admin: Whether to include admin-only params like include_inactive
        
    Returns:
        str: Complete cache key
    """
    try:
        parts = [base_key]
        
        # Add active filters (non-default values)
        if params.get('search'):
            parts.append(f"search:{params['search'][:50]}")  # Limit search string
        if params.get('category_id'):
            parts.append(f"cat:{params['category_id']}")
        if params.get('brand_id'):
            parts.append(f"brand:{params['brand_id']}")
        if params.get('is_featured') == 1:
            parts.append("featured:1")
        if params.get('is_sale') == 1:
            parts.append("sale:1")
        if params.get('is_flash_sale') == 1:
            parts.append("flashsale:1")
        if params.get('is_new') == 1:
            parts.append("new:1")
        if params.get('is_trending') == 1:
            parts.append("trending:1")
        if params.get('is_luxury_deal') == 1:
            parts.append("luxury:1")
        if params.get('is_daily_find') == 1:
            parts.append("daily:1")
        if params.get('is_top_pick') == 1:
            parts.append("toppick:1")
        if params.get('is_new_arrival') == 1:
            parts.append("newarr:1")
        if params.get('sort_by') != 'newest':
            parts.append(f"sort:{params['sort_by']}")
        
        # Add pagination
        parts.append(f"p:{params['page']}")
        if params.get('per_page') != 12:
            parts.append(f"pp:{params['per_page']}")
        
        # Admin-only: include_inactive only affects admin cache
        if include_admin and params.get('include_inactive') == 1:
            parts.append("inactive:1")
        
        return ":".join(parts)
    except Exception as e:
        current_app.logger.error(f"Error building cache key: {str(e)}")
        return base_key


def apply_product_filters(query: Query, params: Dict[str, Any], include_inactive: bool = False) -> Query:
    """
    Apply filter parameters to a product query.
    
    Args:
        query: SQLAlchemy query object
        params: Normalized parameters from extract_filter_params()
        include_inactive: Whether to include inactive products (admin only)
        
    Returns:
        Query: Filtered query
    """
    try:
        # Always filter by active and visible unless include_inactive is True
        if not include_inactive:
            query = query.filter(Product.is_active == True, Product.is_visible == True)
        
        # Search
        if params.get('search'):
            search = f"%{params['search']}%"
            query = query.filter(
                (Product.name.ilike(search)) | 
                (Product.description.ilike(search)) |
                (Product.sku.ilike(search))
            )
        
        # Category filter
        if params.get('category_id'):
            query = query.filter(Product.category_id == params['category_id'])
        
        # Brand filter
        if params.get('brand_id'):
            query = query.filter(Product.brand_id == params['brand_id'])
        
        # Feature flags
        if params.get('is_featured') == 1:
            query = query.filter(Product.is_featured == True)
        if params.get('is_sale') == 1:
            query = query.filter(Product.is_sale == True)
        if params.get('is_flash_sale') == 1:
            query = query.filter(Product.is_flash_sale == True)
        if params.get('is_new') == 1:
            query = query.filter(Product.is_new == True)
        if params.get('is_trending') == 1:
            query = query.filter(Product.is_trending == True)
        if params.get('is_luxury_deal') == 1:
            query = query.filter(Product.is_luxury_deal == True)
        if params.get('is_daily_find') == 1:
            query = query.filter(Product.is_daily_find == True)
        if params.get('is_top_pick') == 1:
            query = query.filter(Product.is_top_pick == True)
        if params.get('is_new_arrival') == 1:
            query = query.filter(Product.is_new_arrival == True)
        
        # Sorting
        sort_by = params.get('sort_by', 'newest')
        if sort_by == 'price_asc':
            query = query.order_by(Product.price.asc())
        elif sort_by == 'price_desc':
            query = query.order_by(Product.price.desc())
        elif sort_by == 'popular':
            query = query.order_by(Product.sort_order.asc(), Product.id.desc())
        else:  # 'newest' default
            query = query.order_by(Product.created_at.desc(), Product.id.desc())
        
        return query
    except Exception as e:
        current_app.logger.error(f"Error applying filters: {str(e)}")
        return query


def build_pagination_response(
    products: List,
    serializer_func,
    page: int,
    per_page: int,
    total: int,
    **extra_fields
) -> Dict[str, Any]:
    """
    Build standardized pagination response JSON.
    
    Args:
        products: List of product objects
        serializer_func: Function to serialize each product
        page: Current page number
        per_page: Items per page
        total: Total item count
        **extra_fields: Additional fields to include in response
        
    Returns:
        dict: Pagination response with products, metadata, and extra fields
    """
    try:
        total_pages = (total + per_page - 1) // per_page
        
        return {
            'products': [serializer_func(p) for p in products],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1,
            },
            **extra_fields
        }
    except Exception as e:
        current_app.logger.error(f"Error building pagination response: {str(e)}")
        return {'products': [], 'pagination': {}, 'error': 'Response building failed'}


def safe_cache_get(cache_obj, key: str, default=None):
    """
    Safely get value from cache with error handling.
    
    Uses getattr to handle missing cache methods gracefully.
    
    Args:
        cache_obj: Cache object (Redis or similar)
        key: Cache key
        default: Default value if get fails
        
    Returns:
        Cached value or default
    """
    try:
        get_method = getattr(cache_obj, 'get', None)
        if get_method and callable(get_method):
            return get_method(key)
        return default
    except Exception as e:
        current_app.logger.warning(f"Cache get failed for {key}: {str(e)}")
        return default


def safe_cache_set(cache_obj, key: str, value: Any, ttl: int = 300):
    """
    Safely set value in cache with error handling.
    
    Uses getattr to handle missing cache methods gracefully.
    
    Args:
        cache_obj: Cache object (Redis or similar)
        key: Cache key
        value: Value to cache
        ttl: Time to live in seconds
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        set_method = getattr(cache_obj, 'set', None)
        if set_method and callable(set_method):
            set_method(key, value, ttl=ttl)
            return True
        return False
    except Exception as e:
        current_app.logger.warning(f"Cache set failed for {key}: {str(e)}")
        return False
