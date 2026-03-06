"""
Cart Redis Caching Layer
Optimizes cart performance with strategic caching for guest carts and product data.
Does NOT cache full cart responses - database remains source of truth for logged-in users.
"""
import json
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from app.cache.redis_client import get_redis_client

logger = logging.getLogger(__name__)

class CartCacheManager:
    """Manages Redis caching for cart operations."""
    
    # Cache key prefixes
    GUEST_CART_PREFIX = "mizizzi:guest_cart:"
    PRODUCT_CACHE_PREFIX = "mizizzi:product_cache:"
    GUEST_SESSION_PREFIX = "mizizzi:guest_session:"
    CHECKOUT_LOCK_PREFIX = "mizizzi:checkout_lock:"
    CART_SNAPSHOT_PREFIX = "mizizzi:cart_snapshot:"
    
    # TTL in seconds
    GUEST_CART_TTL = 86400  # 24 hours
    PRODUCT_CACHE_TTL = 1800  # 30 minutes
    CHECKOUT_LOCK_TTL = 300  # 5 minutes
    CART_SNAPSHOT_TTL = 300  # 5 minutes
    
    def __init__(self):
        """Initialize cart cache manager."""
        self.redis_client = get_redis_client()
        self.enabled = self.redis_client is not None
    
    # ==================== GUEST CART OPERATIONS ====================
    
    def get_guest_cart(self, guest_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve guest cart from Redis.
        
        Args:
            guest_id: Unique guest session identifier
            
        Returns:
            Guest cart data or None if not found/expired
        """
        if not self.enabled:
            return None
        
        try:
            key = f"{self.GUEST_CART_PREFIX}{guest_id}"
            data = self.redis_client.get(key)
            
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error retrieving guest cart {guest_id}: {e}")
        
        return None
    
    def save_guest_cart(self, guest_id: str, cart_data: Dict[str, Any]) -> bool:
        """
        Save guest cart to Redis with TTL.
        
        Args:
            guest_id: Unique guest session identifier
            cart_data: Cart items and metadata
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.GUEST_CART_PREFIX}{guest_id}"
            cart_json = json.dumps(cart_data)
            self.redis_client.set(key, cart_json, ex=self.GUEST_CART_TTL)
            return True
        except Exception as e:
            logger.error(f"Error saving guest cart {guest_id}: {e}")
            return False
    
    def delete_guest_cart(self, guest_id: str) -> bool:
        """
        Delete guest cart from Redis (conversion to logged-in user).
        
        Args:
            guest_id: Unique guest session identifier
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.GUEST_CART_PREFIX}{guest_id}"
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error deleting guest cart {guest_id}: {e}")
            return False
    
    # ==================== PRODUCT CACHE OPERATIONS ====================
    
    def get_product_cache(self, product_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached product data.
        
        Args:
            product_id: Product ID
            
        Returns:
            Cached product data or None
        """
        if not self.enabled:
            return None
        
        try:
            key = f"{self.PRODUCT_CACHE_PREFIX}{product_id}"
            data = self.redis_client.get(key)
            
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error retrieving product cache {product_id}: {e}")
        
        return None
    
    def cache_product_data(self, product_id: int, product_data: Dict[str, Any]) -> bool:
        """
        Cache product data for cart calculations.
        
        Args:
            product_id: Product ID
            product_data: Product info (price, name, images, stock, etc.)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.PRODUCT_CACHE_PREFIX}{product_id}"
            product_json = json.dumps(product_data)
            self.redis_client.set(key, product_json, ex=self.PRODUCT_CACHE_TTL)
            return True
        except Exception as e:
            logger.error(f"Error caching product {product_id}: {e}")
            return False
    
    def get_products_cache(self, product_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """
        Retrieve multiple products from cache.
        
        Args:
            product_ids: List of product IDs
            
        Returns:
            Dictionary mapping product_id to cached data
        """
        products = {}
        
        if not self.enabled:
            return products
        
        for product_id in product_ids:
            product_data = self.get_product_cache(product_id)
            if product_data:
                products[product_id] = product_data
        
        return products
    
    def invalidate_product_cache(self, product_id: int) -> bool:
        """
        Invalidate cached product data (e.g., after price update).
        
        Args:
            product_id: Product ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.PRODUCT_CACHE_PREFIX}{product_id}"
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error invalidating product cache {product_id}: {e}")
            return False
    
    # ==================== CHECKOUT LOCKING ====================
    
    def acquire_checkout_lock(self, user_id: int) -> bool:
        """
        Acquire checkout lock to prevent concurrent checkouts.
        
        Args:
            user_id: User ID
            
        Returns:
            True if lock acquired, False if already locked
        """
        if not self.enabled:
            return True  # Proceed without lock if Redis unavailable
        
        try:
            key = f"{self.CHECKOUT_LOCK_PREFIX}{user_id}"
            # Use SET with NX (only set if not exists)
            result = self.redis_client.set(key, "locked", ex=self.CHECKOUT_LOCK_TTL, nx=True)
            return bool(result)
        except Exception as e:
            logger.error(f"Error acquiring checkout lock for user {user_id}: {e}")
            return True  # Fail open - allow checkout
    
    def release_checkout_lock(self, user_id: int) -> bool:
        """
        Release checkout lock.
        
        Args:
            user_id: User ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.CHECKOUT_LOCK_PREFIX}{user_id}"
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error releasing checkout lock for user {user_id}: {e}")
            return False
    
    # ==================== CART SNAPSHOTS ====================
    
    def save_cart_snapshot(self, user_id: int, snapshot: Dict[str, Any]) -> bool:
        """
        Save temporary cart snapshot for recovery.
        
        Args:
            user_id: User ID
            snapshot: Current cart state
            
        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = f"{self.CART_SNAPSHOT_PREFIX}{user_id}"
            snapshot_json = json.dumps(snapshot)
            self.redis_client.set(key, snapshot_json, ex=self.CART_SNAPSHOT_TTL)
            return True
        except Exception as e:
            logger.error(f"Error saving cart snapshot for user {user_id}: {e}")
            return False
    
    def get_cart_snapshot(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve cart snapshot.
        
        Args:
            user_id: User ID
            
        Returns:
            Snapshot data or None
        """
        if not self.enabled:
            return None
        
        try:
            key = f"{self.CART_SNAPSHOT_PREFIX}{user_id}"
            data = self.redis_client.get(key)
            
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error retrieving cart snapshot for user {user_id}: {e}")
        
        return None
    
    # ==================== MONITORING ====================
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache metrics
        """
        stats = {
            "enabled": self.enabled,
            "guest_cart_ttl": self.GUEST_CART_TTL,
            "product_cache_ttl": self.PRODUCT_CACHE_TTL,
            "checkout_lock_ttl": self.CHECKOUT_LOCK_TTL,
            "cart_snapshot_ttl": self.CART_SNAPSHOT_TTL
        }
        return stats


# Singleton instance
_cart_cache_manager = None

def get_cart_cache_manager() -> CartCacheManager:
    """Get or create singleton cart cache manager."""
    global _cart_cache_manager
    
    if _cart_cache_manager is None:
        _cart_cache_manager = CartCacheManager()
    
    return _cart_cache_manager
