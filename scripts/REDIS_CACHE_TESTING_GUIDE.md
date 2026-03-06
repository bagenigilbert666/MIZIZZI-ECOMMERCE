# Redis Cache Testing Guide - Products API

## Overview
This guide provides step-by-step curl commands to test Redis caching in the Mizizzi E-commerce Products API. Each endpoint is tested twice - first for a CACHE MISS, then for a CACHE HIT.

---

## Prerequisites
- Backend running on `http://localhost:5000`
- Redis/Upstash connected and configured
- `curl` installed

---

## Quick Start

Run the automated test script:
```bash
chmod +x scripts/test_redis_cache.sh
./scripts/test_redis_cache.sh
```

Or test manually using the commands below.

---

## Individual Endpoint Tests

### 1. Health Check
Verify the products service is running:
```bash
curl -i http://localhost:5000/api/products/health
```
**Expected Response:** 200 OK with service status

---

### 2. Cache Status
Get comprehensive cache statistics:
```bash
curl -i http://localhost:5000/api/products/cache/status
```
**Expected Response:** 
- `connected: true` (if Redis is connected)
- `stats.hit_rate_percent`: Shows cache hit percentage
- `stats.hits`, `stats.misses`, `stats.sets`: Cache statistics
- `warming` state information

**Example Output:**
```json
{
  "connected": true,
  "type": "upstash",
  "stats": {
    "cache_type": "upstash",
    "errors": 0,
    "fast_json": true,
    "hit_rate_percent": 17.65,
    "hits": 6,
    "misses": 28,
    "sets": 23,
    "total_requests": 34
  }
}
```

---

## Product Listing Tests

### Test 3: Get All Products (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?page=1&per_page=12"
```

**Second Request (CACHE HIT - should be faster):**
```bash
curl -i "http://localhost:5000/api/products/?page=1&per_page=12"
```

**What to look for:**
- First response: `X-Cache: MISS`, `X-Response-Time-Ms: ~200-500ms`
- Second response: `X-Cache: HIT`, `X-Cache-Time-Ms: ~1-5ms`

---

### Test 4: Filter by Category (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?category_id=1&page=1"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/?category_id=1&page=1"
```

**Note:** Different categories will have separate cache keys:
```bash
# Category 1
curl -i "http://localhost:5000/api/products/?category_id=1"

# Category 2 (different cache)
curl -i "http://localhost:5000/api/products/?category_id=2"
```

---

### Test 5: Filter by Brand (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?brand_id=1"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/?brand_id=1"
```

---

### Test 6: Sort by Price (MISS → HIT)

**Ascending Price (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?sort_by=price_asc"
```

**Ascending Price Again (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/?sort_by=price_asc"
```

**Different Sort Order (different cache key):**
```bash
# Descending Price (new CACHE MISS)
curl -i "http://localhost:5000/api/products/?sort_by=price_desc"
```

---

## Featured Products Tests

### Test 7: Flash Sale Products (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/flash-sale?limit=20"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/flash-sale?limit=20"
```

**Note:** TTL is shorter (30-60 seconds) for flash sales due to time sensitivity

---

### Test 8: Trending Products (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/trending?limit=20"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/trending?limit=20"
```

---

### Test 9: New Arrivals (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/new-arrivals?limit=20"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/new-arrivals?limit=20"
```

---

### Test 10: Featured Products (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/featured?limit=20"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/featured?limit=20"
```

---

## Single Product Tests

### Test 11: Get Product by ID (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/1"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/1"
```

**Different Product (different cache key):**
```bash
curl -i "http://localhost:5000/api/products/2"
```

---

### Test 12: Get Product by Slug (MISS → HIT)

**First Request (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/product/test-product"
```

**Second Request (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/product/test-product"
```

---

## Search Tests

### Test 13: Search Products (MISS → HIT)

**First Search (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?search=shirt"
```

**Second Search (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/?search=shirt"
```

**Different Search (different cache key):**
```bash
curl -i "http://localhost:5000/api/products/?search=pants"
```

---

## Pagination Tests

### Test 14: Different Pages (Separate Cache Keys)

**Page 1 (CACHE MISS, then HIT):**
```bash
curl -i "http://localhost:5000/api/products/?page=1&per_page=12"
curl -i "http://localhost:5000/api/products/?page=1&per_page=12"
```

**Page 2 (Different cache key - CACHE MISS, then HIT):**
```bash
curl -i "http://localhost:5000/api/products/?page=2&per_page=12"
curl -i "http://localhost:5000/api/products/?page=2&per_page=12"
```

**Different Per Page (different cache key):**
```bash
curl -i "http://localhost:5000/api/products/?page=1&per_page=24"
```

---

## Complex Filter Tests

### Test 15: Multiple Filters (MISS → HIT)

**Category + Featured + Sort (CACHE MISS):**
```bash
curl -i "http://localhost:5000/api/products/?category_id=1&is_featured=1&sort_by=price_asc"
```

**Same Filters (CACHE HIT):**
```bash
curl -i "http://localhost:5000/api/products/?category_id=1&is_featured=1&sort_by=price_asc"
```

**Category + Sale (Different cache key):**
```bash
curl -i "http://localhost:5000/api/products/?category_id=1&is_sale=1"
```

---

## Special Endpoints

### Get All Cached Products
Pre-fetches all products from cache (or warms if empty):
```bash
curl -i "http://localhost:5000/api/products/cache/all"
```

---

## Cache Management (Admin Only)

### Invalidate All Cache
Clear all product caches:
```bash
# Requires admin token
curl -i -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/products/cache/invalidate"
```

### Warm Cache
Populate cache with all featured products:
```bash
# Requires admin token
curl -i -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/products/cache/warm"
```

### Get Cache Warming Status
```bash
# Requires admin token
curl -i -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:5000/api/products/cache/warming-status"
```

---

## Response Headers to Monitor

| Header | Meaning |
|--------|---------|
| `X-Cache: HIT` | Response came from cache |
| `X-Cache: MISS` | Response was computed and cached |
| `X-Cache-Time-Ms` | Time to fetch from cache (usually 1-5ms) |
| `X-Response-Time-Ms` | Time to compute response (usually 200-500ms) |
| `X-Products-Cached` | Number of products in response |
| `X-All-Products-Cache` | Indicates all products cached endpoint |

---

## Performance Benchmarks

Expected performance improvements with Redis caching:

| Scenario | Without Cache | With Cache (HIT) | Improvement |
|----------|---------------|------------------|-------------|
| Get 12 products | 200-500ms | 1-5ms | **40-500x faster** |
| Search | 300-800ms | 2-10ms | **30-400x faster** |
| Flash sale | 150-400ms | 1-3ms | **50-400x faster** |

---

## Troubleshooting

### Cache Not Working (All MISS)
1. Check Redis is connected:
   ```bash
   curl http://localhost:5000/api/products/cache/status
   ```
   Look for `"connected": true`

2. Check if caching is disabled in code

3. Verify Upstash credentials in environment

### Cache Keys Not Matching
- Ensure you use exact same query parameters
- Order of parameters doesn't matter
- Boolean values must be normalized (true/false/1/0)

### High Hit Rates but Slow Responses
- May indicate network latency to Redis
- Check Redis connection health
- Consider cache warming during off-peak hours

### Stale Data in Cache
- Check TTL values in `cache_keys.py`
- Manually invalidate with `/cache/invalidate` endpoint
- Wait for TTL to expire naturally

---

## Monitoring Cache Performance

Monitor cache statistics over time:
```bash
# Every 5 seconds
while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:5000/api/products/cache/status | jq '.stats'
  sleep 5
done
```

---

## Testing Best Practices

1. **Clear Redis before testing:** Ensures consistent results
2. **Test each endpoint twice:** First for MISS, second for HIT
3. **Wait between requests:** Ensures previous response is fully cached
4. **Monitor response times:** Verify actual performance improvements
5. **Check hit rates:** Should increase with more requests
6. **Test with different parameters:** Each unique combination has its own cache key

---

## Notes

- Cache TTLs vary by endpoint (see `cache_keys.py` for details)
- Different filters create different cache keys
- Admin users bypass cache for security
- Flash sale endpoints have shorter TTLs (time-sensitive)
- Search and trending sections have very short TTLs
