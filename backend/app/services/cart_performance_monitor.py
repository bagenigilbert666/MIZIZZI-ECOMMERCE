"""
Cart Performance Monitoring and Metrics
Tracks cart operation performance, cache hit rates, and system health.
"""
import logging
import json
from typing import Dict, List, Any
from datetime import datetime, timedelta
from functools import wraps
import time

from app.cache.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class CartPerformanceMonitor:
    """Monitors and tracks cart performance metrics."""
    
    # Metric keys
    CART_OPERATIONS_PREFIX = "mizizzi:metrics:cart_ops:"
    CACHE_HITS_PREFIX = "mizizzi:metrics:cache_hits:"
    CACHE_MISSES_PREFIX = "mizizzi:metrics:cache_misses:"
    RESPONSE_TIME_PREFIX = "mizizzi:metrics:response_time:"
    ERROR_COUNT_PREFIX = "mizizzi:metrics:errors:"
    
    def __init__(self):
        """Initialize performance monitor."""
        self.redis_client = get_redis_client()
        self.enabled = self.redis_client is not None
    
    def record_operation(self, operation_name: str, duration_ms: float, success: bool, 
                        user_type: str = "user") -> bool:
        """
        Record a cart operation.
        
        Args:
            operation_name: Name of operation (get_cart, add_to_cart, etc.)
            duration_ms: Operation duration in milliseconds
            success: Whether operation was successful
            user_type: 'user' or 'guest'
            
        Returns:
            True if recorded successfully
        """
        if not self.enabled:
            return False
        
        try:
            timestamp = datetime.now().isoformat()
            operation_key = f"{self.CART_OPERATIONS_PREFIX}{operation_name}"
            
            operation_data = {
                'timestamp': timestamp,
                'duration_ms': duration_ms,
                'success': success,
                'user_type': user_type
            }
            
            # Store as JSON string
            self.redis_client.lpush(operation_key, json.dumps(operation_data))
            
            # Keep only last 1000 operations, trim old ones
            self.redis_client.ltrim(operation_key, 0, 999)
            
            # Record in counters
            counter_key = f"{self.CART_OPERATIONS_PREFIX}count:{operation_name}:{user_type}"
            self.redis_client.incr(counter_key)
            
            return True
        except Exception as e:
            logger.error(f"Error recording operation metric: {e}")
            return False
    
    def record_cache_hit(self, cache_type: str, duration_ms: float) -> bool:
        """
        Record cache hit.
        
        Args:
            cache_type: Type of cache (product, guest_cart, etc.)
            duration_ms: Lookup duration in milliseconds
            
        Returns:
            True if recorded successfully
        """
        if not self.enabled:
            return False
        
        try:
            timestamp = datetime.now().isoformat()
            key = f"{self.CACHE_HITS_PREFIX}{cache_type}"
            
            hit_data = {
                'timestamp': timestamp,
                'duration_ms': duration_ms,
                'type': cache_type
            }
            
            self.redis_client.lpush(key, json.dumps(hit_data))
            self.redis_client.ltrim(key, 0, 999)
            
            # Increment hit counter
            counter_key = f"{self.CACHE_HITS_PREFIX}count:{cache_type}"
            self.redis_client.incr(counter_key)
            
            return True
        except Exception as e:
            logger.error(f"Error recording cache hit metric: {e}")
            return False
    
    def record_cache_miss(self, cache_type: str, duration_ms: float) -> bool:
        """
        Record cache miss.
        
        Args:
            cache_type: Type of cache (product, guest_cart, etc.)
            duration_ms: Lookup duration in milliseconds
            
        Returns:
            True if recorded successfully
        """
        if not self.enabled:
            return False
        
        try:
            timestamp = datetime.now().isoformat()
            key = f"{self.CACHE_MISSES_PREFIX}{cache_type}"
            
            miss_data = {
                'timestamp': timestamp,
                'duration_ms': duration_ms,
                'type': cache_type
            }
            
            self.redis_client.lpush(key, json.dumps(miss_data))
            self.redis_client.ltrim(key, 0, 999)
            
            # Increment miss counter
            counter_key = f"{self.CACHE_MISSES_PREFIX}count:{cache_type}"
            self.redis_client.incr(counter_key)
            
            return True
        except Exception as e:
            logger.error(f"Error recording cache miss metric: {e}")
            return False
    
    def record_error(self, operation_name: str, error_message: str, user_type: str = "user") -> bool:
        """
        Record operation error.
        
        Args:
            operation_name: Name of operation that failed
            error_message: Error message
            user_type: 'user' or 'guest'
            
        Returns:
            True if recorded successfully
        """
        if not self.enabled:
            return False
        
        try:
            timestamp = datetime.now().isoformat()
            key = f"{self.ERROR_COUNT_PREFIX}{operation_name}"
            
            error_data = {
                'timestamp': timestamp,
                'error': error_message,
                'user_type': user_type
            }
            
            self.redis_client.lpush(key, json.dumps(error_data))
            self.redis_client.ltrim(key, 0, 999)
            
            # Increment error counter
            counter_key = f"{self.ERROR_COUNT_PREFIX}count:{operation_name}"
            self.redis_client.incr(counter_key)
            
            return True
        except Exception as e:
            logger.error(f"Error recording error metric: {e}")
            return False
    
    def get_operation_stats(self, operation_name: str, hours: int = 1) -> Dict[str, Any]:
        """
        Get statistics for a specific operation.
        
        Args:
            operation_name: Name of operation
            hours: Number of hours to look back
            
        Returns:
            Dictionary with operation statistics
        """
        if not self.enabled:
            return {}
        
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            operation_key = f"{self.CART_OPERATIONS_PREFIX}{operation_name}"
            
            # Get all operations
            operations = self.redis_client.lrange(operation_key, 0, -1)
            if not operations:
                return {
                    'operation': operation_name,
                    'total_count': 0,
                    'success_count': 0,
                    'error_count': 0,
                    'avg_duration_ms': 0,
                    'min_duration_ms': 0,
                    'max_duration_ms': 0
                }
            
            # Parse operations
            recent_ops = []
            for op in operations:
                try:
                    op_data = json.loads(op) if isinstance(op, str) else json.loads(op.decode())
                    op_time = datetime.fromisoformat(op_data['timestamp'])
                    if op_time > cutoff_time:
                        recent_ops.append(op_data)
                except:
                    pass
            
            # Calculate stats
            if not recent_ops:
                return {
                    'operation': operation_name,
                    'total_count': 0,
                    'success_count': 0,
                    'error_count': 0,
                    'avg_duration_ms': 0,
                    'min_duration_ms': 0,
                    'max_duration_ms': 0
                }
            
            durations = [op['duration_ms'] for op in recent_ops]
            successful = [op for op in recent_ops if op.get('success', True)]
            failed = [op for op in recent_ops if not op.get('success', True)]
            
            return {
                'operation': operation_name,
                'total_count': len(recent_ops),
                'success_count': len(successful),
                'error_count': len(failed),
                'avg_duration_ms': round(sum(durations) / len(durations), 2),
                'min_duration_ms': round(min(durations), 2),
                'max_duration_ms': round(max(durations), 2),
                'success_rate': round((len(successful) / len(recent_ops)) * 100, 2),
                'period_hours': hours
            }
        except Exception as e:
            logger.error(f"Error getting operation stats: {e}")
            return {}
    
    def get_cache_stats(self, cache_type: str = None, hours: int = 1) -> Dict[str, Any]:
        """
        Get cache hit/miss statistics.
        
        Args:
            cache_type: Specific cache type, or None for all
            hours: Number of hours to look back
            
        Returns:
            Dictionary with cache statistics
        """
        if not self.enabled:
            return {}
        
        try:
            stats = {
                'period_hours': hours,
                'caches': {}
            }
            
            cache_types = [cache_type] if cache_type else ['product', 'guest_cart', 'checkout_lock']
            
            for ctype in cache_types:
                hits_key = f"{self.CACHE_HITS_PREFIX}count:{ctype}"
                misses_key = f"{self.CACHE_MISSES_PREFIX}count:{ctype}"
                
                try:
                    hits = int(self.redis_client.get(hits_key) or 0)
                    misses = int(self.redis_client.get(misses_key) or 0)
                    
                    total = hits + misses
                    hit_rate = (hits / total * 100) if total > 0 else 0
                    
                    stats['caches'][ctype] = {
                        'hits': hits,
                        'misses': misses,
                        'total_requests': total,
                        'hit_rate_percent': round(hit_rate, 2)
                    }
                except:
                    pass
            
            return stats
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {}
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Get comprehensive dashboard metrics.
        
        Returns:
            Dictionary with all important metrics
        """
        if not self.enabled:
            return {'enabled': False}
        
        try:
            metrics = {
                'enabled': True,
                'timestamp': datetime.now().isoformat(),
                'operations': {
                    'get_cart': self.get_operation_stats('get_cart'),
                    'add_to_cart': self.get_operation_stats('add_to_cart'),
                    'update_cart': self.get_operation_stats('update_cart'),
                    'delete_from_cart': self.get_operation_stats('delete_from_cart')
                },
                'cache': self.get_cache_stats(hours=1),
                'errors': {
                    'total_errors': self._get_total_errors()
                }
            }
            
            return metrics
        except Exception as e:
            logger.error(f"Error getting dashboard metrics: {e}")
            return {'enabled': False, 'error': str(e)}
    
    def _get_total_errors(self) -> int:
        """Get total error count across all operations."""
        try:
            total = 0
            operations = ['get_cart', 'add_to_cart', 'update_cart', 'delete_from_cart']
            
            for op in operations:
                counter_key = f"{self.ERROR_COUNT_PREFIX}count:{op}"
                count = self.redis_client.get(counter_key)
                if count:
                    total += int(count)
            
            return total
        except Exception as e:
            logger.error(f"Error getting total errors: {e}")
            return 0


def monitor_cart_operation(operation_name: str, user_type: str = "user"):
    """
    Decorator to monitor cart operation performance.
    
    Usage:
        @monitor_cart_operation('get_cart')
        def get_cart():
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            monitor = CartPerformanceMonitor()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                monitor.record_operation(operation_name, duration_ms, True, user_type)
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                monitor.record_operation(operation_name, duration_ms, False, user_type)
                monitor.record_error(operation_name, str(e), user_type)
                raise
        
        return wrapper
    return decorator


# Singleton instance
_monitor = None

def get_cart_monitor() -> CartPerformanceMonitor:
    """Get or create singleton performance monitor."""
    global _monitor
    
    if _monitor is None:
        _monitor = CartPerformanceMonitor()
    
    return _monitor
