"""
Cache Invalidation Utilities for Admin Routes

This module provides functions that admin routes can call to invalidate
cache when products are created, updated, or deleted.

Used by:
  - admin_product_routes.py (product updates)
  - admin_category_routes.py (category updates affecting products)
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def invalidate_product_caches(product_id=None, force_all=False):
    """
    Invalidate product-related caches when admin updates products.
    
    Args:
        product_id (int): Specific product ID to invalidate (smart invalidation)
        force_all (bool): If True, invalidate all product caches
    
    Returns:
        dict: Invalidation result with sections cleared
    """
    try:
        # Import here to avoid circular imports
        from app.routes.products.homepage_batch_routes import (
            invalidate_related_section_caches,
            invalidate_all_homepage_cache
        )
        
        if force_all:
            invalidated = invalidate_all_homepage_cache()
            logger.info(f"Force invalidated all homepage cache: {invalidated} sections")
        elif product_id:
            invalidated = invalidate_related_section_caches(product_id)
            logger.info(f"Smart invalidated cache for product {product_id}: {invalidated} sections")
        else:
            invalidated = invalidate_all_homepage_cache()
            logger.info(f"Invalidated all homepage cache: {invalidated} sections")
        
        return {
            'status': 'success',
            'sections_invalidated': invalidated,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    except Exception as e:
        logger.error(f"Error invalidating product caches: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }


def invalidate_ui_batch_cache():
    """
    Invalidate UI batch cache (carousel, categories, etc.)
    when those elements are updated by admin.
    """
    try:
        # Import here to avoid circular imports
        from app.routes.ui.unified_batch_routes import product_cache
        
        # Clear all UI batch cache keys
        ui_batch_keys = [
            'batch:carousel',
            'batch:topbar',
            'batch:categories',
            'batch:side_panels',
            'batch:ui_all_combined'
        ]
        
        cleared = 0
        for key in ui_batch_keys:
            try:
                product_cache.delete(key)
                cleared += 1
            except Exception as e:
                logger.warning(f"Failed to clear UI cache key {key}: {e}")
        
        logger.info(f"Invalidated {cleared} UI batch cache entries")
        return {
            'status': 'success',
            'entries_cleared': cleared,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    except Exception as e:
        logger.error(f"Error invalidating UI batch cache: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }


def on_product_created(product_id):
    """Called when admin creates a new product."""
    logger.info(f"Product created: {product_id}, invalidating caches")
    return invalidate_product_caches(product_id=product_id)


def on_product_updated(product_id):
    """Called when admin updates a product."""
    logger.info(f"Product updated: {product_id}, invalidating related caches")
    return invalidate_product_caches(product_id=product_id)


def on_product_deleted(product_id):
    """Called when admin deletes a product."""
    logger.info(f"Product deleted: {product_id}, invalidating caches")
    return invalidate_product_caches(force_all=True)


def on_product_bulk_update(product_ids):
    """Called when admin bulk updates multiple products."""
    logger.info(f"Bulk product update: {len(product_ids)} products, invalidating all caches")
    return invalidate_product_caches(force_all=True)


def on_category_updated(category_id):
    """Called when admin updates a category (affects product visibility)."""
    logger.info(f"Category updated: {category_id}, invalidating product caches")
    return invalidate_product_caches(force_all=True)


def on_flash_sale_updated():
    """Called when flash sales are updated."""
    logger.info("Flash sales updated, invalidating homepage cache")
    return invalidate_product_caches(force_all=True)


def on_admin_settings_changed():
    """Called when admin settings that affect caching are changed."""
    logger.info("Admin settings changed, clearing all caches")
    product_invalidation = invalidate_product_caches(force_all=True)
    ui_invalidation = invalidate_ui_batch_cache()
    
    return {
        'status': 'success',
        'product_caches': product_invalidation,
        'ui_caches': ui_invalidation,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
