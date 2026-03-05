# Redis Cache Implementation - MIZIZZI Backend

## Overview

Your backend now has full Redis cache integration using **Upstash Redis** - a serverless Redis database service. This provides high-performance caching for UI batch operations, products, and other frequently accessed data.

## Current Status

✅ **Redis is properly configured** with the following credentials:
- **Endpoint**: `fancy-mammal-63500.upstash.io`
- **Port**: `6379` (with TLS/SSL enabled)
- **Rest API**: `https://fancy-mammal-63500.upstash.io`

## Environment Variables

The following environment variables are already set in your `.env` file:

```bash
# Upstash Naming Convention
UPSTASH_REDIS_REST_URL=https://fancy-mammal-63500.upstash.io
UPSTASH_REDIS_REST_TOKEN=AgBjAAIgcDKuqgxyLFIpI7oAxDPgvJYrfHFKxOoRhE3YU57_0ujP5w

# Vercel KV Integration Aliases (also supported)
KV_REST_API_URL=https://fancy-mammal-63500.upstash.io
KV_REST_API_TOKEN=AgBjAAIgcDKuqgxyLFIpI7oAxDPgvJYrfHFKxOoRhE3YU57_0ujP5w
```

## Architecture

### File Structure

```
backend/
├── app/
│   ├── cache/                          # 🆕 NEW Cache Module
│   │   ├── __init__.py
│   │   ├── redis_client.py            # Upstash Redis client setup
│   │   └── cache.py                   # CacheManager with JSON support
│   │
│   ├── utils/                          # 🆕 NEW Utilities
│   │   ├── __init__.py
│   │   └── redis_cache.py             # Redis cache utilities & exports
│   │
│   └── routes/
│       ├── ui/
│       │   └── unified_batch_routes.py # 🔄 UPDATED with cache status
│       └── ...
│
└── scripts/
    └── test_redis_connection.py        # 🔄 UPDATED comprehensive test
```

### How It Works

1. **Redis Client** (`app/cache/redis_client.py`):
   - Singleton pattern for persistent connection
   - Auto-ping to verify connectivity
   - Fallback to in-memory cache if Redis unavailable
   - Supports both `UPSTASH_REDIS_*` and `KV_REST_API_*` env vars

2. **Cache Manager** (`app/cache/cache.py`):
   - JSON-safe serialization (uses orjson if available)
   - TTL management with configurable defaults
   - MD5-based cache key generation
   - Pattern-based invalidation
   - Cache statistics tracking
   - In-memory fallback for resilience

3. **Utils Layer** (`app/utils/redis_cache.py`):
   - Backwards-compatible wrapper
   - Convenient exports for routes
   - Decorators for easy caching
   - Status monitoring utilities

4. **App Initialization** (`app/__init__.py`):
   - Redis initialized on first request
   - New `/api/cache/status` endpoint
   - Connection logging

5. **Batch Operations** (`app/routes/ui/unified_batch_routes.py`):
   - Enhanced `/api/ui/batch/status` with cache metrics
   - Automatic caching with TTL configuration
   - Cache statistics in response

## Cache Configuration

### Default TTLs

```python
BATCH_CACHE_CONFIG = {
    'carousel': {'ttl': 60},        # 1 minute - changes frequently
    'topbar': {'ttl': 120},         # 2 minutes
    'categories': {'ttl': 300},     # 5 minutes
    'side_panels': {'ttl': 300},    # 5 minutes
    'ui_all': {'ttl': 60},          # 1 minute - combined data
}
```

### Cache Prefix

All cache keys use the prefix `mizizzi:` to organize your data:
- `mizizzi:carousel:*`
- `mizizzi:topbar:*`
- `mizizzi:products:*`
- etc.

## API Endpoints

### Check Cache Status

```bash
curl http://localhost:5000/api/cache/status
```

**Response:**
```json
{
  "connected": true,
  "cache_type": "upstash",
  "cache_prefix": "mizizzi",
  "stats": {
    "hits": 42,
    "misses": 5,
    "sets": 47,
    "errors": 0,
    "hit_rate_percent": 89.36,
    "using_orjson": true
  }
}
```

### Check Batch Endpoint Status

```bash
curl http://localhost:5000/api/ui/batch/status
```

**Response includes:**
```json
{
  "status": "healthy",
  "cache": "connected",
  "cache_type": "upstash",
  "cache_stats": { ... },
  "database": { ... },
  "cache_ttls": { ... }
}
```

### Get UI Batch Data

```bash
# Get all cached UI sections
curl http://localhost:5000/api/ui/batch

# Specific sections only
curl http://localhost:5000/api/ui/batch?sections=carousel,categories

# Bypass cache (for testing)
curl http://localhost:5000/api/ui/batch?cache=false
```

## Testing

### Run Comprehensive Test

```bash
cd backend
python scripts/test_redis_connection.py
```

This runs 7 comprehensive tests:
1. Environment variables check
2. Package installation check
3. Direct Upstash connection
4. Basic Redis operations (SET, GET, DELETE)
5. JSON serialization
6. Cache manager integration
7. Utils redis_cache module

### Expected Output

```
======================================================================
  REDIS CACHE CONNECTION TEST
======================================================================

[1] Checking Environment Variables
  ✅ UPSTASH_REDIS_REST_URL: SET
  ✅ UPSTASH_REDIS_REST_TOKEN: SET

[2] Checking upstash-redis Package
  ✅ upstash-redis package imported successfully

[3] Testing Direct Upstash Connection
  ✅ Ping successful: True

[4] Testing Basic Redis Operations
  ✅ SET operation: 45.32ms
  ✅ GET operation: 32.18ms
  ✅ DELETE operation: 28.91ms

[5] Testing JSON Operations
  📦 Using orjson (fast)
  ✅ orjson serialization: 0.45ms
  ✅ Store JSON in Redis: 43.21ms
  ✅ Retrieve JSON from Redis: 31.87ms
  ✅ JSON parsing successful

[6] Testing Cache Manager Integration
  ✅ Cache connected: True
  ✅ Cache set: 41.25ms
  ✅ Cache get: 28.53ms
  ✅ Cache data integrity verified

  Cache Statistics:
    - Hits: 1
    - Misses: 1
    - Sets: 2
    - Hit Rate: 50.0%
    - Using orjson: True

[7] Testing utils/redis_cache Module
  ✅ Module imported successfully
  ✅ Using orjson: True
  ✅ Product cache set successful
  ✅ Product cache get successful

======================================================================
  TEST SUMMARY
======================================================================

  ✅ PASS - environment
  ✅ PASS - package
  ✅ PASS - direct_connection
  ✅ PASS - basic_operations
  ✅ PASS - json_operations
  ✅ PASS - cache_manager
  ✅ PASS - utils_redis_cache

======================================================================
  ✅ ALL TESTS PASSED - REDIS IS WORKING CORRECTLY!
======================================================================
```

## Usage in Routes

### Using the Cache Manager

```python
from app.utils.redis_cache import cache_manager

# Generate a cache key
cache_key = cache_manager.generate_key("products", {"category": "electronics"})

# Store data
cache_manager.set(cache_key, products_data, ttl=300)

# Retrieve data
cached_products = cache_manager.get(cache_key)

# Delete by pattern
cache_manager.delete_pattern("mizizzi:products:*")
```

### Using Decorators

```python
from app.utils.redis_cache import cached_response

@app.route('/api/products/trending')
@cached_response("products:trending", ttl=60, key_params=["limit", "offset"])
def get_trending_products():
    return {"products": [...]}
```

### Using Fast Cache

```python
from app.utils.redis_cache import fast_cached_response

@app.route('/api/products/featured')
@fast_cached_response("products:featured", ttl=120)
def get_featured_products():
    return {"products": [...]}  # Pre-serialized JSON
```

## Performance Metrics

### Expected Performance

With Upstash Redis (typical latency):
- **Read latency**: 30-50ms
- **Write latency**: 30-50ms
- **Cache hit rate** (UI batch): 80-95%

Benefits:
- **Network overhead**: 1 request instead of 4-5
- **Backend time**: ~250ms total vs 500-800ms without cache
- **Database load**: Reduced by ~70-80%

## Troubleshooting

### Redis Connection Issues

1. **Check environment variables:**
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. **Verify credentials in Upstash console:**
   - Visit https://console.upstash.com/
   - Check your Redis database
   - Confirm URL and token

3. **Check logs for connection attempts:**
   ```bash
   tail -f backend/app.log | grep -i redis
   ```

4. **Test direct connection:**
   ```bash
   curl -X POST "https://fancy-mammal-63500.upstash.io/ping" \
     -H "Authorization: Bearer AgBjAAIgcDKuqgxyLFIpI7oAxDPgvJYrfHFKxOoRhE3YU57_0ujP5w"
   ```

### Cache Not Working

The system automatically falls back to in-memory caching if Redis is unavailable. Check:

1. **Cache status endpoint:**
   ```bash
   curl http://localhost:5000/api/cache/status
   ```

2. **Batch status endpoint:**
   ```bash
   curl http://localhost:5000/api/ui/batch/status
   ```

3. **Logs:**
   ```bash
   grep "cache" backend/app.log
   grep "Redis" backend/app.log
   ```

### Performance Issues

If latency is high (>100ms per operation):

1. **Check network connectivity:**
   - Ping upstash.io from your server
   - Check firewall rules

2. **Monitor cache hit rate:**
   - Visit `/api/cache/status`
   - Look at hit_rate_percent

3. **Check Upstash metrics:**
   - https://console.upstash.com/
   - View bandwidth and request metrics

## Next Steps

1. ✅ **Redis is configured** - Environment variables set
2. ✅ **Test script created** - Run `python backend/scripts/test_redis_connection.py`
3. ✅ **Endpoints available** - Check `/api/cache/status` and `/api/ui/batch/status`
4. **Monitor performance** - Watch cache hit rates in production
5. **Optimize TTLs** - Adjust cache durations based on your needs

## Documentation

For more information:
- [Upstash Redis Docs](https://upstash.com/docs/redis)
- [Python SDK](https://github.com/upstash/upstash-python)
- Cache manager source: `app/cache/cache.py`
- Redis client source: `app/cache/redis_client.py`

## Support

If you need help:
1. Check the troubleshooting section above
2. Review logs: `tail -f backend/app.log`
3. Run test script: `python backend/scripts/test_redis_connection.py`
4. Check Upstash console: https://console.upstash.com/
