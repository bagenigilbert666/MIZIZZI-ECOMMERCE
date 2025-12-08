"""
Redis Cache Utility for Mizizzi E-commerce platform.
Provides high-performance caching with Redis for product data.
"""
import os
import json
import logging
from functools import wraps
from datetime import datetime
from typing import Any, Optional, Callable
import hashlib

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis package not installed. Using in-memory fallback cache.")

# In-memory fallback cache
_memory_cache = {}
_memory_cache_timestamps = {}


class RedisCache:
    """
    High-performance Redis cache wrapper with fallback to in-memory cache.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize Redis connection.
        
        Args:
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
        """
        self.redis_url = redis_url or os.environ.get('REDIS_URL')
        self._client = None
        self._connected = False
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'errors': 0
        }
        
        if REDIS_AVAILABLE and self.redis_url:
            try:
                self._client = redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                # Test connection
                self._client.ping()
                self._connected = True
                logger.info("Redis cache connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed, using memory cache: {e}")
                self._connected = False
        else:
            logger.info("Redis not configured, using in-memory cache")
    
    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        return self._connected and self._client is not None
    
    @property
    def stats(self) -> dict:
        """Get cache statistics."""
        total = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total * 100) if total > 0 else 0
        return {
            **self._stats,
            'total_requests': total,
            'hit_rate_percent': round(hit_rate, 2)
        }

    def _generate_key(self, prefix: str, params: dict) -> str:
        """
        Generate a cache key from prefix and parameters.
        
        Args:
            prefix: Cache key prefix
            params: Query parameters to include in key
            
        Returns:
            A unique cache key string
        """
        # Sort params for consistent key generation
        sorted_params = sorted(params.items())
        param_str = json.dumps(sorted_params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()[:12]
        return f"mizizzi:{prefix}:{param_hash}"
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        try:
            if self.is_connected:
                value = self._client.get(key)
                if value:
                    logger.debug(f"CACHE HIT: {key}")
                    self._stats['hits'] += 1  # Track hits
                    return json.loads(value)
                logger.debug(f"CACHE MISS: {key}")
                self._stats['misses'] += 1  # Track misses
                return None
            else:
                # Memory cache fallback
                if key in _memory_cache:
                    timestamp = _memory_cache_timestamps.get(key, 0)
                    # Check if expired (default 5 minutes)
                    if datetime.now().timestamp() - timestamp < 300:
                        logger.debug(f"MEMORY CACHE HIT: {key}")
                        self._stats['hits'] += 1  # Track hits
                        return _memory_cache[key]
                    else:
                        # Expired, remove it
                        del _memory_cache[key]
                        del _memory_cache_timestamps[key]
                logger.debug(f"MEMORY CACHE MISS: {key}")
                self._stats['misses'] += 1  # Track misses
                return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            self._stats['errors'] += 1  # Track errors
            return None
    
    def set(self, key: str, value: Any, ttl: int = 30) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default 30)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            json_value = json.dumps(value, default=str)
            
            if self.is_connected:
                self._client.setex(key, ttl, json_value)
                logger.debug(f"CACHE SET: {key} (TTL: {ttl}s)")
                self._stats['sets'] += 1  # Track sets
                return True
            else:
                # Memory cache fallback
                _memory_cache[key] = value
                _memory_cache_timestamps[key] = datetime.now().timestamp()
                logger.debug(f"MEMORY CACHE SET: {key}")
                self._stats['sets'] += 1  # Track sets
                return True
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            self._stats['errors'] += 1  # Track errors
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.is_connected:
                self._client.delete(key)
                logger.debug(f"CACHE DELETE: {key}")
                return True
            else:
                if key in _memory_cache:
                    del _memory_cache[key]
                    if key in _memory_cache_timestamps:
                        del _memory_cache_timestamps[key]
                return True
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Pattern to match (e.g., "mizizzi:products:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            if self.is_connected:
                keys = self._client.keys(pattern)
                if keys:
                    deleted = self._client.delete(*keys)
                    logger.info(f"CACHE PATTERN DELETE: {pattern} ({deleted} keys)")
                    return deleted
                return 0
            else:
                # Memory cache fallback - simple prefix matching
                prefix = pattern.replace('*', '')
                keys_to_delete = [k for k in _memory_cache.keys() if k.startswith(prefix)]
                for key in keys_to_delete:
                    del _memory_cache[key]
                    if key in _memory_cache_timestamps:
                        del _memory_cache_timestamps[key]
                return len(keys_to_delete)
        except Exception as e:
            logger.error(f"Cache pattern delete error for {pattern}: {e}")
            return 0
    
    def invalidate_products(self) -> int:
        """Invalidate all product-related cache entries."""
        return self.delete_pattern("mizizzi:products:*")
    
    def invalidate_featured(self) -> int:
        """Invalidate all featured product cache entries."""
        return self.delete_pattern("mizizzi:featured:*")
    
    def flush_all(self) -> bool:
        """
        Flush all cache entries. Use with caution!
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.is_connected:
                # Only flush keys with our prefix for safety
                keys = self._client.keys("mizizzi:*")
                if keys:
                    self._client.delete(*keys)
                logger.info("CACHE FLUSH: All mizizzi keys cleared")
                return True
            else:
                _memory_cache.clear()
                _memory_cache_timestamps.clear()
                logger.info("MEMORY CACHE FLUSH: All keys cleared")
                return True
        except Exception as e:
            logger.error(f"Cache flush error: {e}")
            return False


# Global cache instance
product_cache = RedisCache()


def cached_response(prefix: str, ttl: int = 30, key_params: Optional[list] = None):
    """
    Decorator for caching Flask route responses.
    
    Args:
        prefix: Cache key prefix (e.g., "products", "featured")
        ttl: Cache time to live in seconds (default 30)
        key_params: List of request args to include in cache key
        
    Usage:
        @cached_response("products", ttl=30, key_params=["page", "per_page", "category_id"])
        def get_products():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from flask import request, jsonify, current_app
            
            try:
                # Build cache key from specified params
                params = {}
                if key_params:
                    for param in key_params:
                        value = request.args.get(param)
                        if value is not None:
                            params[param] = value
                
                cache_key = product_cache._generate_key(prefix, params)
                
                # Try to get from cache
                cached = product_cache.get(cache_key)
                if cached is not None:
                    current_app.logger.info(f"[CACHE HIT] {prefix} - {cache_key}")
                    response = jsonify(cached)
                    response.headers['X-Cache'] = 'HIT'
                    response.headers['X-Cache-Key'] = cache_key
                    return response, 200
                
                current_app.logger.info(f"[CACHE MISS] {prefix} - {cache_key}")
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Handle tuple returns (data, status_code)
                if isinstance(result, tuple):
                    data, status_code = result[0], result[1] if len(result) > 1 else 200
                    if status_code == 200:
                        # Cache only successful responses
                        if hasattr(data, 'get_json'):
                            json_data = data.get_json()
                        else:
                            json_data = data
                        product_cache.set(cache_key, json_data, ttl)
                    return result
                else:
                    # Single return value
                    if hasattr(result, 'get_json'):
                        json_data = result.get_json()
                        product_cache.set(cache_key, json_data, ttl)
                    return result
                    
            except Exception as e:
                current_app.logger.error(f"Cache decorator error: {e}")
                # On cache error, just execute the function normally
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def invalidate_on_change(prefixes: list):
    """
    Decorator to invalidate cache after successful mutations (POST, PUT, DELETE).
    
    Args:
        prefixes: List of cache prefixes to invalidate
        
    Usage:
        @invalidate_on_change(["products", "featured"])
        def update_product():
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from flask import current_app
            
            result = func(*args, **kwargs)
            
            # Check if operation was successful
            if isinstance(result, tuple):
                status_code = result[1] if len(result) > 1 else 200
            else:
                status_code = 200
            
            # Invalidate cache on successful mutations
            if 200 <= status_code < 300:
                for prefix in prefixes:
                    count = product_cache.delete_pattern(f"mizizzi:{prefix}:*")
                    current_app.logger.info(f"[CACHE INVALIDATE] {prefix} ({count} keys)")
            
            return result
        
        return wrapper
    return decorator
