"""
Cache invalidation utilities for Mizizzi E-commerce platform.
Provides comprehensive cache invalidation for product changes.
"""
import logging
from typing import Optional, List
from flask import current_app

from app.utils.redis_cache import product_cache
from .cache_keys import (
    PUBLIC_PRODUCT_KEY, ADMIN_PRODUCT_KEY,
    PUBLIC_PRODUCT_SLUG_KEY, ADMIN_PRODUCT_SLUG_KEY,
    PUBLIC_CATEGORY_KEY, ADMIN_CATEGORY_KEY,
    CACHE_PATTERNS
)

logger = logging.getLogger(__name__)


def invalidate_product_cache(
    product_id: int,
    slug: Optional[str] = None,
    category_slug: Optional[str] = None,
    invalidate_type: str = 'all',
    changed_flags: Optional[List[str]] = None
):
    """
    Invalidate product-related caches based on the type of change.
    
    Args:
        product_id: ID of the product that changed
        slug: Product slug (for slug-based cache keys)
        category_slug: Category slug (for category-based cache keys)
        invalidate_type: Type of invalidation
            - 'single': Only invalidate the single product cache
            - 'lists': Invalidate product lists, category caches, featured caches
            - 'featured': Invalidate featured section caches
            - 'search': Invalidate search caches
            - 'all': Clear all affected caches (default)
        changed_flags: List of feature flags that changed (for targeted featured invalidation)
    
    Returns:
        dict with invalidation results
    """
    if not product_cache or not getattr(product_cache, 'is_connected', False):
        logger.warning("Cache not connected, skipping invalidation")
        return {'success': False, 'reason': 'cache_not_connected'}
    
    results = {
        'product_id': product_id,
        'invalidate_type': invalidate_type,
        'keys_deleted': 0,
        'patterns_processed': []
    }
    
    try:
        # Always invalidate the single product cache (both public and admin)
        if invalidate_type in ['single', 'all']:
            _invalidate_single_product(product_id, slug, results)
        
        # Invalidate list caches
        if invalidate_type in ['lists', 'all']:
            _invalidate_lists(category_slug, results)
        
        # Invalidate featured section caches
        if invalidate_type in ['featured', 'all'] or changed_flags:
            _invalidate_featured(changed_flags, results)
        
        # Invalidate search caches
        if invalidate_type in ['search', 'all']:
            _invalidate_search(results)
        
        results['success'] = True
        logger.info(f"Cache invalidation complete: {results}")
        
    except Exception as e:
        logger.error(f"Error during cache invalidation: {e}")
        results['success'] = False
        results['error'] = str(e)
    
    return results


def _invalidate_single_product(product_id: int, slug: Optional[str], results: dict):
    """Invalidate single product caches."""
    keys_to_delete = [
        PUBLIC_PRODUCT_KEY.format(id=product_id),
        ADMIN_PRODUCT_KEY.format(id=product_id),
    ]
    
    if slug:
        keys_to_delete.extend([
            PUBLIC_PRODUCT_SLUG_KEY.format(slug=slug),
            ADMIN_PRODUCT_SLUG_KEY.format(slug=slug),
        ])
    
    for key in keys_to_delete:
        try:
            if product_cache.delete(key):
                results['keys_deleted'] += 1
        except Exception as e:
            logger.warning(f"Failed to delete key {key}: {e}")
    
    results['patterns_processed'].append('single_product')


def _invalidate_lists(category_slug: Optional[str], results: dict):
    """Invalidate product list caches."""
    patterns = CACHE_PATTERNS.get('all_lists', [])
    
    # Also invalidate specific category if provided
    if category_slug:
        patterns.extend([
            PUBLIC_CATEGORY_KEY.format(slug=category_slug),
            ADMIN_CATEGORY_KEY.format(slug=category_slug),
        ])
    
    for pattern in patterns:
        try:
            deleted = product_cache.delete_pattern(pattern)
            results['keys_deleted'] += deleted
        except Exception as e:
            logger.warning(f"Failed to delete pattern {pattern}: {e}")
    
    results['patterns_processed'].append('lists')


def _invalidate_featured(changed_flags: Optional[List[str]], results: dict):
    """Invalidate featured section caches."""
    patterns = CACHE_PATTERNS.get('all_featured', [])
    
    for pattern in patterns:
        try:
            deleted = product_cache.delete_pattern(pattern)
            results['keys_deleted'] += deleted
        except Exception as e:
            logger.warning(f"Failed to delete pattern {pattern}: {e}")
    
    results['patterns_processed'].append('featured')
    if changed_flags:
        results['changed_flags'] = changed_flags


def _invalidate_search(results: dict):
    """Invalidate search caches."""
    patterns = CACHE_PATTERNS.get('all_search', [])
    
    for pattern in patterns:
        try:
            deleted = product_cache.delete_pattern(pattern)
            results['keys_deleted'] += deleted
        except Exception as e:
            logger.warning(f"Failed to delete pattern {pattern}: {e}")
    
    results['patterns_processed'].append('search')


def invalidate_all_product_caches():
    """
    Nuclear option: Invalidate ALL product-related caches.
    Use sparingly, e.g., after bulk imports or major data migrations.
    
    Returns:
        dict with invalidation results
    """
    if not product_cache or not getattr(product_cache, 'is_connected', False):
        logger.warning("Cache not connected, skipping invalidation")
        return {'success': False, 'reason': 'cache_not_connected'}
    
    results = {
        'keys_deleted': 0,
        'patterns_processed': []
    }
    
    try:
        patterns = CACHE_PATTERNS.get('all', [])
        
        for pattern in patterns:
            try:
                deleted = product_cache.delete_pattern(pattern)
                results['keys_deleted'] += deleted
            except Exception as e:
                logger.warning(f"Failed to delete pattern {pattern}: {e}")
        
        results['patterns_processed'] = ['all']
        results['success'] = True
        logger.info(f"Full cache invalidation complete: {results}")
        
    except Exception as e:
        logger.error(f"Error during full cache invalidation: {e}")
        results['success'] = False
        results['error'] = str(e)
    
    return results


def invalidate_category_cache(category_slug: str):
    """
    Invalidate all caches for a specific category.
    Use when category is updated or products are moved between categories.
    
    Args:
        category_slug: Slug of the category
    
    Returns:
        dict with invalidation results
    """
    if not product_cache or not getattr(product_cache, 'is_connected', False):
        return {'success': False, 'reason': 'cache_not_connected'}
    
    results = {
        'category_slug': category_slug,
        'keys_deleted': 0
    }
    
    try:
        keys_to_delete = [
            PUBLIC_CATEGORY_KEY.format(slug=category_slug),
            ADMIN_CATEGORY_KEY.format(slug=category_slug),
        ]
        
        for key in keys_to_delete:
            try:
                if product_cache.delete(key):
                    results['keys_deleted'] += 1
            except Exception as e:
                logger.warning(f"Failed to delete key {key}: {e}")
        
        # Also invalidate list caches as they may include category filtering
        deleted = product_cache.delete_pattern("mizizzi:products:*")
        results['keys_deleted'] += deleted
        
        results['success'] = True
        
    except Exception as e:
        logger.error(f"Error during category cache invalidation: {e}")
        results['success'] = False
        results['error'] = str(e)
    
    return results


def get_changed_flags(old_product: dict, new_data: dict) -> List[str]:
    """
    Detect which feature flags changed between old and new product data.
    Used for targeted featured section cache invalidation.
    
    Args:
        old_product: Previous product data as dict
        new_data: New product data as dict
    
    Returns:
        List of flag names that changed
    """
    flag_fields = [
        'is_featured', 'is_new', 'is_sale', 'is_flash_sale',
        'is_luxury_deal', 'is_trending', 'is_top_pick',
        'is_daily_find', 'is_new_arrival'
    ]
    
    changed = []
    for flag in flag_fields:
        old_val = old_product.get(flag, False)
        new_val = new_data.get(flag, old_val)  # Default to old value if not provided
        if old_val != new_val:
            changed.append(flag)
    
    return changed


def should_invalidate_visibility(old_product: dict, new_data: dict) -> bool:
    """
    Check if visibility-related fields changed (affects public cache separation).
    
    Args:
        old_product: Previous product data as dict
        new_data: New product data as dict
    
    Returns:
        True if visibility changed and requires full invalidation
    """
    visibility_fields = ['is_active', 'is_visible', 'is_searchable']
    
    for field in visibility_fields:
        old_val = old_product.get(field)
        new_val = new_data.get(field)
        if new_val is not None and old_val != new_val:
            return True
    
    return False
