# Redis Setup & Integration Guide

## Overview

Your MIZIZZI e-commerce backend now uses **Upstash Redis** for high-performance caching. This guide explains how Redis is integrated, how to verify it's working, and how to extend caching to additional routes.

## Environment Setup

### Required Environment Variables

```
UPSTASH_REDIS_REST_URL=https://nearby-rabbit-63956.upstash.io
UPSTASH_REDIS_REST_TOKEN=AfnUAAIncDI4NmVmOGJhM2I1OTU0NWE0OTAwYmVkNzYzZWU4ZTIyMHAyNjM5NTY
```

These should be set in your backend `.env` file.

### File Structure

```
backend/
├── app/
│   └── cache/
│       ├── __init__.py
│       ├── redis_client.py      # HTTP-based Redis client (fixed)
│       └── cache.py             # Cache manager with JSON serialization
├── config_redis.py              # Configuration utility
└── ...

scripts/
├── test_redis_backend.py        # Connectivity test
└── setup_redis.py              # Setup helper
```

## How Redis Works in Your App

### 1. Redis Client (HTTP REST API)

The `redis_client.py` module provides an HTTP-based Redis client that communicates with Upstash via REST API:

```python
from app.cache.redis_client import get_redis_client

client = get_redis_client()
if client:
    client.set("key", "value", ex=3600)  # Set with 1 hour TTL
    value = client.get("key")             # Get value
    client.delete("key")                  # Delete
```

**Key Features:**
- Uses HTTP requests instead of SDK dependency
- Proper command formatting for Upstash REST API
- Supports all major Redis operations (GET, SET, DEL, LPUSH, HSET, INCR, etc.)
- Automatic error handling and logging

### 2. Cache Manager

The `cache.py` module provides JSON-safe caching for your product routes:

```python
from app.cache.cache import cache_manager

# Set a value with auto JSON serialization
cache_manager.set("products:list", {"items": [...]}, ttl=30)

# Get value with auto JSON deserialization
data = cache_manager.get("products:list")

# Cache statistics
stats = cache_manager.stats
print(f"Hit rate: {stats['hit_rate_percent']}%")
```

## Testing Redis Connection

### Quick Test

Run the diagnostic test:

```bash
cd /vercel/share/v0-project
python scripts/test_redis_backend.py
```

Expected output:
```
✓ PING command - Connection successful
✓ SET command - Successfully set key
✓ GET command - Retrieved: Hello Redis
✓ LPUSH command - Pushed 3 items
✓ LRANGE command - Retrieved 3 items
✓ HSET command - Set 1 field(s)
✓ HGETALL command - Retrieved 1 fields
✓ INCR #1 - Counter value: 1
✓ INCR #2 - Counter value: 2
✓ INCR #3 - Counter value: 3
```

### Using Config Utility

```bash
# Show current configuration
python backend/config_redis.py

# Run tests
python backend/config_redis.py --test

# Reset cache
python backend/config_redis.py --reset
```

## Current Caching Implementation

### Product Routes

The following routes automatically cache responses:

1. **GET /api/products**
   - Cache TTL: 5 minutes
   - Cached data: Product list with pagination
   - Cache key: `mizizzi:products:{params_hash}`

2. **GET /api/products/<id>**
   - Cache TTL: 15 minutes
   - Cached data: Single product details
   - Cache key: `mizizzi:products:{product_id}`

3. **GET /api/products/category/<slug>**
   - Cache TTL: 10 minutes
   - Cached data: Products in category
   - Cache key: `mizizzi:products:category:{slug}`

### Response Headers

All cached endpoints include cache headers:

```
X-Cache: HIT          # Cache hit
X-Cache: MISS         # Cache miss (first request)
X-Cache-Key: mizizzi:products:abc123
```

## Performance Metrics

### Expected Performance

- **First Request (Cache Miss):** 500-1000ms
- **Cached Request (Cache Hit):** 50-100ms
- **Performance Improvement:** 10x faster with cache

### Monitoring Cache Performance

```python
from app.cache.cache import cache_manager

stats = cache_manager.stats
print(f"Total Requests: {stats['total_requests']}")
print(f"Hit Rate: {stats['hit_rate_percent']}%")
print(f"Cache Type: {stats['cache_type']}")  # 'upstash' or 'memory'
```

## Extending Caching to Other Routes

### Example: Cache a New Route

```python
from flask import Blueprint, jsonify, request
from app.cache.cache import cached_response, cache_manager

api = Blueprint('api', __name__)

@api.route('/api/categories')
@cached_response("categories", ttl=60, key_params=["limit"])
def get_categories():
    """Get categories list - automatically cached for 60 seconds."""
    categories = [...]  # Get from database
    return jsonify(categories)

# Manual caching example
@api.route('/api/trending-products')
def get_trending():
    """Manually cache trending products."""
    cache_key = cache_manager.generate_key("trending_products")
    
    # Try cache first
    cached = cache_manager.get(cache_key)
    if cached:
        return jsonify(cached), 200, {'X-Cache': 'HIT'}
    
    # Fetch fresh data
    products = [...]  # Get from database
    
    # Cache for 1 hour
    cache_manager.set(cache_key, products, ttl=3600)
    
    return jsonify(products), 200, {'X-Cache': 'MISS'}
```

### Decorator Usage

```python
from app.cache.cache import cached_response, fast_cached_response

# Standard caching (includes deserialization)
@cached_response("search_results", ttl=30, key_params=["q", "page"])
def search_products():
    return {"results": [...]}

# Ultra-fast caching (bypasses deserialization)
@fast_cached_response("fast_trending", ttl=60)
def get_fast_trending():
    return {"products": [...]}  # Must return dict, not jsonify()
```

## Cache Invalidation

### Manual Invalidation

```python
from app.cache.cache import cache_manager

# Delete specific key
cache_manager.delete("mizizzi:products:123")

# Delete by pattern
cache_manager.delete_pattern("mizizzi:products:*")

# Invalidate product caches
cache_manager.invalidate_products()

# Invalidate featured product caches
cache_manager.invalidate_featured()

# Clear all caches
cache_manager.invalidate_all()
```

### When to Invalidate

- **Product Created:** `cache_manager.invalidate_products()`
- **Product Updated:** `cache_manager.delete(f"mizizzi:products:{product_id}")`
- **Product Deleted:** `cache_manager.invalidate_products()`
- **Category Updated:** `cache_manager.delete_pattern("mizizzi:products:category:*")`

## Troubleshooting

### Issue: Redis not connecting

**Solution:**
1. Verify environment variables are set: `echo $UPSTASH_REDIS_REST_URL`
2. Run test: `python scripts/test_redis_backend.py`
3. Check logs for connection errors
4. Verify Upstash credentials are correct

### Issue: Cache not working (always cache miss)

**Solution:**
1. Check if Redis client is initialized: `python backend/config_redis.py`
2. Verify routes are using cache decorators
3. Check cache statistics: `cache_manager.stats`
4. Ensure TTL is not expired

### Issue: Performance not improving

**Solution:**
1. Check hit rate: `stats['hit_rate_percent']`
2. Increase TTL for routes: `ttl=300` instead of `ttl=30`
3. Add more routes to caching
4. Monitor response headers for X-Cache

## Best Practices

1. **Set Appropriate TTL Values**
   - Static data (categories): 1 hour (3600s)
   - Product list: 5-10 minutes
   - Product details: 15 minutes
   - User data: 1 minute

2. **Cache Key Naming**
   - Use consistent prefixes: `mizizzi:entity_type:identifier`
   - Include relevant parameters in hash
   - Make keys readable for debugging

3. **Monitor Performance**
   - Track cache hit rates
   - Monitor response times
   - Log cache invalidations
   - Review memory usage

4. **Invalidation Strategy**
   - Invalidate on data changes immediately
   - Use patterns for bulk invalidation
   - Consider delayed invalidation for non-critical data

## Additional Resources

- **Upstash Documentation:** https://upstash.com/docs
- **Redis Commands:** https://redis.io/commands
- **Cache Warmup:** Implement background tasks to pre-populate cache
- **Analytics:** Add cache performance tracking to admin dashboard

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test script output for detailed error messages
3. Check application logs for cache-related errors
4. Verify Upstash dashboard for quota and limits
