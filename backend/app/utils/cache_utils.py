"""
Upstash Redis Cache Utilities

This module provides utility functions for the Redis cache system.
It wraps the cache_manager and provides convenient helpers for testing and monitoring.
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def get_cache_status() -> Dict[str, Any]:
    """
    Get the current status of the cache system.
    
    Returns:
        Dict with cache status information including:
        - connected: bool - Whether Redis is connected
        - cache_type: str - Type of cache ('redis' or 'memory')
        - stats: dict - Cache statistics (hits, misses, etc)
        - timestamp: str - Current timestamp
    """
    try:
        from app.cache.cache import cache_manager
        
        stats = cache_manager.stats
        
        return {
            "connected": cache_manager.is_connected,
            "cache_type": "redis" if cache_manager.is_connected else "memory",
            "status": "operational",
            "stats": stats,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cache status: {e}")
        return {
            "connected": False,
            "cache_type": "unknown",
            "status": "error",
            "error": str(e),
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }


def test_cache_connection() -> Dict[str, Any]:
    """
    Test the cache connection with a simple set/get operation.
    
    Returns:
        Dict with test results including:
        - success: bool - Whether test passed
        - connection_time: float - Connection latency in ms
        - operation_time: float - Operation latency in ms
        - details: dict - Additional details
    """
    try:
        from app.cache.cache import cache_manager
        import time
        
        # Test key
        test_key = "cache_utils:connection_test"
        test_value = {"test": "value", "timestamp": time.time()}
        
        # Time the set operation
        start = time.time()
        cache_manager.set(test_key, test_value, ttl=10)
        set_time = (time.time() - start) * 1000  # Convert to ms
        
        # Time the get operation
        start = time.time()
        retrieved = cache_manager.get(test_key)
        get_time = (time.time() - start) * 1000  # Convert to ms
        
        # Verify
        success = retrieved is not None and retrieved.get("test") == "value"
        
        # Cleanup
        try:
            cache_manager.delete(test_key)
        except:
            pass
        
        return {
            "success": success,
            "connected": cache_manager.is_connected,
            "cache_type": "redis" if cache_manager.is_connected else "memory",
            "set_time_ms": round(set_time, 2),
            "get_time_ms": round(get_time, 2),
            "average_latency_ms": round((set_time + get_time) / 2, 2),
            "details": {
                "test_key": test_key,
                "value_retrieved": success
            }
        }
    except Exception as e:
        logger.error(f"Error testing cache connection: {e}")
        return {
            "success": False,
            "connected": False,
            "error": str(e),
            "details": {}
        }


def clear_cache_stats() -> Dict[str, Any]:
    """
    Clear cache statistics counters.
    
    Returns:
        Dict confirming the operation
    """
    try:
        from app.cache.cache import cache_manager
        
        # Reset stats
        cache_manager.hits = 0
        cache_manager.misses = 0
        cache_manager.sets = 0
        cache_manager.deletes = 0
        
        return {
            "success": True,
            "message": "Cache stats cleared",
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error clearing cache stats: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }


def get_cache_info() -> Dict[str, Any]:
    """
    Get detailed cache information.
    
    Returns:
        Dict with comprehensive cache info
    """
    try:
        from app.cache.cache import cache_manager
        from app.cache.redis_client import is_redis_connected
        
        return {
            "cache_type": "redis" if cache_manager.is_connected else "memory",
            "connected": cache_manager.is_connected,
            "redis_connected": is_redis_connected(),
            "using_orjson": cache_manager.using_orjson,
            "stats": cache_manager.stats,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {
            "error": str(e),
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }


__all__ = [
    "get_cache_status",
    "test_cache_connection",
    "clear_cache_stats",
    "get_cache_info"
]
