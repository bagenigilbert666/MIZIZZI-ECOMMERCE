# Redis Quick Reference Card

## Setup Verification Checklist

```bash
# 1. Check environment variables are set
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# 2. Run Redis connectivity test
python scripts/test_redis_backend.py

# 3. Verify configuration
python backend/config_redis.py

# 4. Test a product route
curl -i http://localhost:5000/api/products

# Expected first request header:
# X-Cache: MISS

# Make same request again
curl -i http://localhost:5000/api/products

# Expected second request header:
# X-Cache: HIT
```

## Redis Operations Cheat Sheet

### Using Redis Client Directly

```python
from app.cache.redis_client import get_redis_client

client = get_redis_client()

# String operations
client.set("key", "value", ex=3600)    # Set with 1 hour TTL
value = client.get("key")              # Get value
client.delete("key")                   # Delete key

# List operations
client.lpush("list", "item1", "item2") # Push to list
items = client.lrange("list", 0, -1)   # Get all items

# Hash operations
client.hset("hash", "field", "value")  # Set hash field
data = client.hgetall("hash")          # Get all fields

# Counter operations
count = client.incr("counter")         # Increment counter

# Key operations
keys = client.keys("pattern:*")        # Find keys by pattern
```

### Using Cache Manager

```python
from app.cache.cache import cache_manager

# Set value (auto JSON serialization)
cache_manager.set("products", {"items": [...]}, ttl=300)

# Get value (auto JSON deserialization)
data = cache_manager.get("products")

# Delete operations
cache_manager.delete("products")
cache_manager.delete_pattern("products:*")
cache_manager.invalidate_products()
cache_manager.invalidate_all()

# View statistics
stats = cache_manager.stats
print(f"Hit rate: {stats['hit_rate_percent']}%")
print(f"Cache type: {stats['cache_type']}")  # 'upstash' or 'memory'
```

## Common Decorators

```python
from app.cache.cache import cached_response, fast_cached_response

# Standard caching decorator
@cached_response("namespace", ttl=60, key_params=["page", "limit"])
def my_route():
    return {"data": [...]}

# Ultra-fast caching (no deserialization)
@fast_cached_response("fast_namespace", ttl=60)
def my_fast_route():
    return {"data": [...]}  # Return dict, not jsonify()
```

## Cache Configuration

### Product Route TTLs (Already Set)

| Route | TTL | Purpose |
|-------|-----|---------|
| GET /api/products | 5 min | Product list |
| GET /api/products/<id> | 15 min | Product details |
| GET /api/products/category/<slug> | 10 min | Category products |

### Recommended TTLs for New Routes

```python
# Static data (categories, brands)
ttl=3600  # 1 hour

# Product lists
ttl=300   # 5 minutes

# Product details
ttl=900   # 15 minutes

# User-specific data
ttl=60    # 1 minute

# Search results
ttl=300   # 5 minutes
```

## Troubleshooting Commands

```bash
# Show current configuration
python backend/config_redis.py

# Run detailed tests
python backend/config_redis.py --test

# Reset all caches
python backend/config_redis.py --reset

# View test output
python scripts/test_redis_backend.py

# Check Redis logs
tail -f backend/app.log | grep -i redis
```

## Performance Targets

```
✓ Cache hit response time:    50-100ms
✓ Cache miss response time:   500-1000ms
✓ Performance improvement:    10x faster with cache
✓ Target hit rate:            80-95%
✓ Database load reduction:    80-90%
```

## Response Headers Reference

```
X-Cache: HIT              # Data served from cache
X-Cache: MISS             # Data fetched from database
X-Cache-Key: mizizzi:... # Cache key used
X-Fast-Cache: true       # Ultra-fast cached endpoint
```

## Environment Variables

```
UPSTASH_REDIS_REST_URL=https://nearby-rabbit-63956.upstash.io
UPSTASH_REDIS_REST_TOKEN=AfnUAAIncDI4NmVmOGJhM2I1OTU0NWE0OTAwYmVkNzYzZWU4ZTIyMHAyNjM5NTY
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/cache/redis_client.py` | HTTP-based Redis client |
| `backend/app/cache/cache.py` | Cache manager |
| `scripts/test_redis_backend.py` | Connectivity tests |
| `backend/config_redis.py` | Configuration utility |
| `REDIS_INTEGRATION_GUIDE.md` | Full documentation |
| `REDIS_FIX_SUMMARY.md` | Implementation summary |

## Quick Start

1. **Verify Connection**
   ```bash
   python scripts/test_redis_backend.py
   ```

2. **Start Backend**
   ```bash
   cd backend && python app.py
   ```

3. **Test Caching**
   ```bash
   # First request (cache miss)
   curl -i http://localhost:5000/api/products
   
   # Second request (cache hit)
   curl -i http://localhost:5000/api/products
   ```

4. **Monitor Performance**
   ```python
   from app.cache.cache import cache_manager
   print(cache_manager.stats)
   ```

## Support

- Full Guide: See `REDIS_INTEGRATION_GUIDE.md`
- Implementation Notes: See `REDIS_FIX_SUMMARY.md`
- Troubleshooting: Run `python backend/config_redis.py --test`
