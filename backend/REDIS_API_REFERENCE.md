# Redis Integration API Reference

## New Cache Status Endpoints

### GET `/api/cache/status`
Check the current status and statistics of the Redis cache system.

**Response:**
```json
{
  "connected": true,
  "cache_type": "upstash",
  "cache_prefix": "mizizzi",
  "default_ttl": 30,
  "stats": {
    "hits": 142,
    "misses": 23,
    "sets": 165,
    "errors": 0,
    "total_requests": 165,
    "hit_rate_percent": 86.06,
    "using_orjson": true,
    "cache_type": "upstash"
  }
}
```

**Fields:**
- `connected` (bool) - Redis connection status
- `cache_type` (string) - "upstash" or "memory" (fallback)
- `cache_prefix` (string) - Key prefix used for all cache entries
- `default_ttl` (int) - Default time-to-live in seconds
- `stats.hits` (int) - Number of cache hits
- `stats.misses` (int) - Number of cache misses
- `stats.sets` (int) - Number of cache set operations
- `stats.errors` (int) - Number of cache errors
- `stats.hit_rate_percent` (float) - Cache effectiveness percentage
- `stats.using_orjson` (bool) - Whether fast JSON library is available

---

### GET `/api/ui/batch/status`
Enhanced status endpoint for the UI batch endpoint. Now includes cache statistics.

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "carousel": "connected",
    "topbar": "connected",
    "categories": "connected",
    "side_panels": "connected"
  },
  "cache": "connected",
  "cache_type": "upstash",
  "cache_stats": {
    "hits": 85,
    "misses": 12,
    "sets": 97,
    "hit_rate_percent": 87.63,
    "using_orjson": true
  },
  "endpoint": "/api/ui/batch",
  "sections_available": [
    "carousel",
    "topbar",
    "categories",
    "side_panels"
  ],
  "cache_ttls": {
    "carousel": 60,
    "topbar": 120,
    "categories": 300,
    "side_panels": 300,
    "combined": 60
  },
  "timestamp": "2026-03-05T12:14:10.505641Z"
}
```

**Fields:**
- `status` (string) - "healthy", "degraded", or "error"
- `database` (object) - Connection status for each data source
- `cache` (string) - "connected" or "disconnected"
- `cache_type` (string) - Type of cache (upstash or memory)
- `cache_stats` (object) - Cache statistics
- `cache_ttls` (object) - TTL configuration for each section
- `timestamp` (string) - ISO 8601 timestamp

---

### GET `/api/ui/batch`
Get unified UI data with automatic caching.

**Query Parameters:**
- `cache` (string, default: "true") - Enable/disable caching ("true"/"false")
- `sections` (string, default: "all") - Comma-separated sections to fetch
  - Options: "carousel", "topbar", "categories", "side_panels"

**Example Requests:**
```bash
# Get all sections (cached)
GET /api/ui/batch

# Get specific sections
GET /api/ui/batch?sections=carousel,categories

# Bypass cache for fresh data
GET /api/ui/batch?cache=false

# Mix and match
GET /api/ui/batch?sections=topbar&cache=false
```

**Response:**
```json
{
  "timestamp": "2026-03-05T12:14:10.505641Z",
  "total_execution_ms": 45.32,
  "cached": true,
  "sections": {
    "carousel": {
      "section": "carousel",
      "data": { ... },
      "count": 5,
      "success": true
    },
    "topbar": {
      "section": "topbar",
      "slides": [ ... ],
      "count": 3,
      "success": true
    },
    "categories": {
      "section": "categories",
      "featured": [ ... ],
      "root": [ ... ],
      "featured_count": 8,
      "root_count": 15,
      "success": true
    },
    "side_panels": {
      "section": "side_panels",
      "data": { ... },
      "count": 6,
      "success": true
    }
  },
  "meta": {
    "sections_fetched": 4,
    "parallel_execution": true,
    "cache_key": "mizizzi:batch:ui_all_combined"
  }
}
```

**Performance Metrics:**
- **Cached Response**: 45-60ms
- **Uncached Response**: 150-250ms
- **Expected Hit Rate**: 80-95%

---

## Cache Configuration

### Default Cache TTLs

Located in `app/routes/ui/unified_batch_routes.py`:

```python
BATCH_CACHE_CONFIG = {
    'carousel': {'ttl': 60, 'key': 'batch:carousel'},        # 1 minute
    'topbar': {'ttl': 120, 'key': 'batch:topbar'},           # 2 minutes
    'categories': {'ttl': 300, 'key': 'batch:categories'},   # 5 minutes
    'side_panels': {'ttl': 300, 'key': 'batch:side_panels'}, # 5 minutes
    'ui_all': {'ttl': 60, 'key': 'batch:ui_all_combined'},   # 1 minute
}
```

### Cache Key Format

All cache keys follow this pattern:
```
mizizzi:<namespace>:<hash>
```

Example:
- `mizizzi:batch:carousel`
- `mizizzi:batch:topbar`
- `mizizzi:products:a1b2c3d4e5f6`

---

## Using Cache in Code

### Basic Usage

```python
from app.utils.redis_cache import cache_manager

# Generate a cache key
key = cache_manager.generate_key("products", {"category": "electronics"})

# Store data (JSON safe)
cache_manager.set(key, {"items": [...]}, ttl=300)

# Retrieve data
data = cache_manager.get(key)

# Delete cache
cache_manager.delete(key)

# Invalidate pattern
cache_manager.delete_pattern("mizizzi:products:*")
```

### Using Decorators

```python
from app.utils.redis_cache import cached_response, fast_cached_response

@app.route('/api/products')
@cached_response("products", ttl=60, key_params=["category", "page"])
def get_products():
    """Automatically cached based on query parameters."""
    return {"products": [...]}

@app.route('/api/trending')
@fast_cached_response("trending", ttl=120)
def get_trending():
    """Ultra-fast caching with pre-serialized JSON."""
    return {"items": [...]}
```

### Cache Status Utilities

```python
from app.utils.redis_cache import get_cache_status, invalidate_products

# Check cache status
status = get_cache_status()
print(f"Cache type: {status['cache_type']}")
print(f"Connected: {status['connected']}")
print(f"Stats: {status['stats']}")

# Invalidate specific patterns
invalidate_products()  # Clear all product caches
```

---

## Monitoring & Debugging

### Check Connection

```bash
# API endpoint
curl http://localhost:5000/api/cache/status

# Test script
cd backend
python scripts/test_redis_connection.py
```

### View Cache Statistics

```bash
# Real-time statistics
curl http://localhost:5000/api/cache/status | jq '.stats'

# Example output:
{
  "hits": 142,
  "misses": 23,
  "sets": 165,
  "errors": 0,
  "total_requests": 165,
  "hit_rate_percent": 86.06,
  "using_orjson": true,
  "cache_type": "upstash"
}
```

### Monitor Upstash Console

Visit: https://console.upstash.com/redis

- **Commands**: Total operations executed
- **Hit Rate**: Percentage of read operations that hit cache
- **Data Size**: Current data stored
- **Bandwidth**: Network usage
- **Keys**: All cache keys and their sizes

---

## Response Headers

When caching is enabled, responses include cache headers:

```
X-Cache: HIT
X-Cache-Key: mizizzi:batch:carousel
X-Fast-Cache: true  (only for fast_cached_response)
```

Example:
```bash
curl -i http://localhost:5000/api/ui/batch

HTTP/1.1 200 OK
X-Cache: HIT
X-Cache-Key: mizizzi:batch:ui_all_combined
Content-Type: application/json
...
```

---

## Error Handling

### Cache Connection Failures

If Redis becomes unavailable:
1. System automatically falls back to in-memory cache
2. Endpoints continue to work (no 500 errors)
3. Check `/api/cache/status` → `"connected": false`
4. Cache statistics show errors in `stats.errors`

### Error Response Example

```json
{
  "error": "cache_status_error",
  "message": "Connection timeout",
  "connected": false
}
```

---

## Performance Considerations

### Cache Hit Optimization

1. **Consistent Keys**: Always use same parameters
2. **Optimal TTL**: Balance freshness vs cache efficiency
3. **Pattern Invalidation**: Invalidate only affected data
4. **Monitoring**: Track hit rates in `/api/cache/status`

### Typical Performance

| Operation | Latency |
|-----------|---------|
| Cache Hit | 30-50ms |
| Cache Miss (DB) | 150-250ms |
| Set Operation | 40-60ms |
| Delete Pattern | 50-100ms |

### Reduction in Load

With caching enabled:
- Database queries: ↓ 70-80%
- API response time: ↓ 50-70%
- Bandwidth usage: ↓ 60-75%

---

## Troubleshooting API Issues

### Cache Not Working

Check status endpoint:
```bash
curl http://localhost:5000/api/cache/status
```

If `"connected": false`:
1. Verify environment variables in `.env`
2. Check network connectivity to Upstash
3. Verify credentials in Upstash console
4. Run test script: `python scripts/test_redis_connection.py`

### High Response Times

If `/api/ui/batch` is slow:
1. Check if cached: `"cached": true` in response
2. If `"cached": false`, first request will be slow
3. Check cache hit rate in `/api/cache/status`
4. Monitor Upstash console for latency

### Memory Issues

If cache is using too much memory:
1. Reduce TTL values
2. Reduce cache scope
3. Clear old data: Access Upstash console → FLUSH
4. Monitor data size in Upstash console

---

## Environment Variables

Required (already set in `.env`):

```bash
# Upstash Credentials
UPSTASH_REDIS_REST_URL=https://fancy-mammal-63500.upstash.io
UPSTASH_REDIS_REST_TOKEN=AgBjAAIgcDKuqgxyLFIpI7oAxDPgvJYrfHFKxOoRhE3YU57_0ujP5w

# Alternative (Vercel KV naming)
KV_REST_API_URL=https://fancy-mammal-63500.upstash.io
KV_REST_API_TOKEN=AgBjAAIgcDKuqgxyLFIpI7oAxDPgvJYrfHFKxOoRhE3YU57_0ujP5w
```

Both naming conventions are supported.

---

## Related Documentation

- **Full Setup Guide**: `backend/REDIS_SETUP.md`
- **Quick Start**: `backend/REDIS_QUICK_START.md`
- **Cache Implementation**: `backend/app/cache/cache.py`
- **Redis Client**: `backend/app/cache/redis_client.py`
- **Utils Layer**: `backend/app/utils/redis_cache.py`
