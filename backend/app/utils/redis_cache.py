"""
Upstash Redis Cache Utility for Mizizzi E-commerce platform.
OPTIMIZED: High-performance caching with Upstash Redis (serverless, HTTP-based).
"""
import os
import logging
from functools import wraps
from datetime import datetime
from typing import Any, Optional, Callable
import hashlib

logger = logging.getLogger(__name__)

try:
    import orjson
    
    def fast_json_dumps(obj):
        return orjson.dumps(obj, default=str).decode('utf-8')
    
    def fast_json_loads(s):
        return orjson.loads(s)
    
    FAST_JSON = True
    logger.info("Using orjson for fast JSON serialization")
except ImportError:
    import json
    
    def fast_json_dumps(obj):
        return json.dumps(obj, default=str, separators=(',', ':'))
    
    def fast_json_loads(s):
        return json.loads(s)
    
    FAST_JSON = False
    logger.info("orjson not available, using standard json")

try:
    from upstash_redis import Redis as UpstashRedis
    UPSTASH_AVAILABLE = True
except ImportError:
    UPSTASH_AVAILABLE = False
    logger.warning("upstash-redis package not installed. Using in-memory fallback cache.")

# In-memory fallback cache
_memory_cache = {}
_memory_cache_timestamps = {}


class RedisCache:
    """
    High-performance Upstash Redis cache wrapper with fallback to in-memory cache.
    OPTIMIZED: Uses Upstash REST API for serverless-friendly caching.
    """
    
    def __init__(self):
        """
        Initialize Upstash Redis connection using environment variables.
        Required env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
        (or KV_REST_API_URL and KV_REST_API_TOKEN from Vercel integration)
        """
        self.upstash_url = (
            os.environ.get('UPSTASH_REDIS_REST_URL') or 
            os.environ.get('KV_REST_API_URL')
        )
        self.upstash_token = (
            os.environ.get('UPSTASH_REDIS_REST_TOKEN') or 
            os.environ.get('KV_REST_API_TOKEN')
        )
        
        self._client = None
        self._connected = False
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'errors': 0
        }
        
        if not self.upstash_url or not self.upstash_token:
            logger.warning(
                "Upstash Redis credentials not found in environment variables. "
                "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env file. "
                "Using in-memory cache as fallback."
            )
            return
        
        if UPSTASH_AVAILABLE:
            try:
                self._client = UpstashRedis(
                    url=self.upstash_url,
                    token=self.upstash_token
                )
                # Test connection with a ping
                self._client.ping()
                self._connected = True
                logger.info(f"Upstash Redis cache connected successfully to {self.upstash_url}")
            except Exception as e:
                logger.warning(f"Upstash Redis connection failed, using memory cache: {e}")
                self._connected = False
        else:
            logger.info("upstash-redis not installed, using in-memory cache")
    
    @property
    def is_connected(self) -> bool:
        """Check if Upstash Redis is connected."""
        return self._connected and self._client is not None
    
    @property
    def stats(self) -> dict:
        """Get cache statistics."""
        total = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total * 100) if total > 0 else 0
        return {
            **self._stats,
            'total_requests': total,
            'hit_rate_percent': round(hit_rate, 2),
            'fast_json': FAST_JSON,
            'cache_type': 'upstash' if self.is_connected else 'memory'
        }

    def _generate_key(self, prefix: str, params: dict) -> str:
        """
        Generate a cache key from prefix and parameters.
        """
        sorted_params = sorted(params.items())
        param_str = fast_json_dumps(sorted_params)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()[:12]
        return f"mizizzi:{prefix}:{param_hash}"
    
    def get_raw(self, key: str) -> Optional[str]:
        """
        Get raw string value from cache (for pre-serialized JSON).
        Returns the raw string without deserializing.
        """
        try:
            if self.is_connected:
                value = self._client.get(key)
                if value:
                    logger.debug(f"CACHE HIT (raw): {key}")
                    self._stats['hits'] += 1
                    return value
                logger.debug(f"CACHE MISS (raw): {key}")
                self._stats['misses'] += 1
                return None
            else:
                # Memory cache fallback
                if key in _memory_cache:
                    timestamp = _memory_cache_timestamps.get(key, 0)
                    if datetime.now().timestamp() - timestamp < 300:
                        logger.debug(f"MEMORY CACHE HIT (raw): {key}")
                        self._stats['hits'] += 1
                        return _memory_cache[key]
                    else:
                        del _memory_cache[key]
                        del _memory_cache_timestamps[key]
                logger.debug(f"MEMORY CACHE MISS (raw): {key}")
                self._stats['misses'] += 1
                return None
        except Exception as e:
            logger.error(f"Cache get_raw error for {key}: {e}")
            self._stats['errors'] += 1
            return None
    
    def set_raw(self, key: str, value: str, ttl: int = 30) -> bool:
        """
        Set raw string value in cache (pre-serialized JSON).
        Stores the string directly without serializing.
        """
        try:
            if self.is_connected:
                self._client.set(key, value, ex=ttl)
                logger.debug(f"CACHE SET (raw): {key} (TTL: {ttl}s)")
                self._stats['sets'] += 1
                return True
            else:
                _memory_cache[key] = value
                _memory_cache_timestamps[key] = datetime.now().timestamp()
                logger.debug(f"MEMORY CACHE SET (raw): {key}")
                self._stats['sets'] += 1
                return True
        except Exception as e:
            logger.error(f"Cache set_raw error for {key}: {e}")
            self._stats['errors'] += 1
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache and deserialize.
        """
        try:
            if self.is_connected:
                value = self._client.get(key)
                if value:
                    logger.debug(f"CACHE HIT: {key}")
                    self._stats['hits'] += 1
                    return fast_json_loads(value) if isinstance(value, str) else value
                logger.debug(f"CACHE MISS: {key}")
                self._stats['misses'] += 1
                return None
            else:
                # Memory cache fallback
                if key in _memory_cache:
                    timestamp = _memory_cache_timestamps.get(key, 0)
                    if datetime.now().timestamp() - timestamp < 300:
                        logger.debug(f"MEMORY CACHE HIT: {key}")
                        self._stats['hits'] += 1
                        return _memory_cache[key]
                    else:
                        del _memory_cache[key]
                        del _memory_cache_timestamps[key]
                logger.debug(f"MEMORY CACHE MISS: {key}")
                self._stats['misses'] += 1
                return None
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            self._stats['errors'] += 1
            return None
    
    def set(self, key: str, value: Any, ttl: int = 30) -> bool:
        """
        Serialize value and set in cache.
        """
        try:
            json_value = fast_json_dumps(value)
            
            if self.is_connected:
                self._client.set(key, json_value, ex=ttl)
                logger.debug(f"CACHE SET: {key} (TTL: {ttl}s)")
                self._stats['sets'] += 1
                return True
            else:
                _memory_cache[key] = value
                _memory_cache_timestamps[key] = datetime.now().timestamp()
                logger.debug(f"MEMORY CACHE SET: {key}")
                self._stats['sets'] += 1
                return True
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            self._stats['errors'] += 1
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from cache.
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
                    # Delete keys one by one (Upstash REST API)
                    for key in keys:
                        self._client.delete(key)
                    logger.info(f"CACHE PATTERN DELETE: {pattern} ({len(keys)} keys)")
                    return len(keys)
                return 0
            else:
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
        count = self.delete_pattern("mizizzi:featured:*")
        count += self.delete_pattern("mizizzi:fast:*")
        return count
    
    def flush_all(self) -> bool:
        """
        Flush all mizizzi cache entries. Use with caution!
        """
        try:
            if self.is_connected:
                keys = self._client.keys("mizizzi:*")
                if keys:
                    for key in keys:
                        self._client.delete(key)
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
                        if hasattr(data, 'get_json'):
                            json_data = data.get_json()
                        else:
                            json_data = data
                        product_cache.set(cache_key, json_data, ttl)
                    return result
                else:
                    if hasattr(result, 'get_json'):
                        json_data = result.get_json()
                        product_cache.set(cache_key, json_data, ttl)
                    return result
                    
            except Exception as e:
                current_app.logger.error(f"Cache decorator error: {e}")
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


def fast_cached_response(prefix: str, ttl: int = 30, key_params: Optional[list] = None):
    """
    ULTRA-FAST decorator that caches pre-serialized JSON strings.
    Bypasses Flask's jsonify() on cache hits for maximum speed.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            from flask import request, Response, current_app
            
            try:
                # Build cache key
                params = {}
                if key_params:
                    for param in key_params:
                        value = request.args.get(param)
                        if value is not None:
                            params[param] = value
                
                cache_key = product_cache._generate_key(prefix, params)
                
                # Try to get pre-serialized JSON from cache
                cached_json = product_cache.get_raw(cache_key)
                if cached_json is not None:
                    current_app.logger.info(f"[FAST CACHE HIT] {prefix} - {cache_key}")
                    response = Response(
                        cached_json,
                        status=200,
                        mimetype='application/json'
                    )
                    response.headers['X-Cache'] = 'HIT'
                    response.headers['X-Cache-Key'] = cache_key
                    response.headers['X-Fast-Cache'] = 'true'
                    return response
                
                current_app.logger.info(f"[FAST CACHE MISS] {prefix} - {cache_key}")
                
                # Execute function - expects dict return
                result = func(*args, **kwargs)
                
                # Handle tuple returns (data, status_code)
                if isinstance(result, tuple):
                    data, status_code = result[0], result[1] if len(result) > 1 else 200
                else:
                    data, status_code = result, 200
                
                if status_code == 200:
                    json_str = fast_json_dumps(data)
                    product_cache.set_raw(cache_key, json_str, ttl)
                    
                    response = Response(
                        json_str,
                        status=200,
                        mimetype='application/json'
                    )
                    response.headers['X-Cache'] = 'MISS'
                    response.headers['X-Cache-Key'] = cache_key
                    return response
                else:
                    return Response(
                        fast_json_dumps(data),
                        status=status_code,
                        mimetype='application/json'
                    )
                    
            except Exception as e:
                current_app.logger.error(f"Fast cache decorator error: {e}")
                result = func(*args, **kwargs)
                if isinstance(result, tuple):
                    data, status_code = result[0], result[1] if len(result) > 1 else 200
                else:
                    data, status_code = result, 200
                return Response(
                    fast_json_dumps(data),
                    status=status_code,
                    mimetype='application/json'
                )
        
        return wrapper
    return decorator


def invalidate_on_change(prefixes: list):
    """
    Decorator to invalidate cache after successful mutations (POST, PUT, DELETE).
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
