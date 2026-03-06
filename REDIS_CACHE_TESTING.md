# Redis Cache Testing Guide with cURL

This guide shows how to test the Redis cache implementation in your product routes one by one using cURL commands.

## Prerequisites

- Your Next.js frontend is running on `http://localhost:3000`
- Redis is configured with Upstash
- The API endpoints are accessible

## 1. Test Product List Cache

### First Request (Cache Miss)
```bash
curl -v "http://localhost:3000/api/products" \
  -H "Accept: application/json"
```

**Expected Output:**
- Response header: `X-Cache-Source: api` (first time, fetches from service)
- `source: "api"` in response body
- Response time: varies based on service response

### Second Request (Cache Hit)
```bash
curl -v "http://localhost:3000/api/products" \
  -H "Accept: application/json"
```

**Expected Output:**
- Response header: `X-Cache-Source: redis` (cached response)
- `source: "redis-cache"` in response body
- Response time: much faster (typically <50ms)

## 2. Test with Query Parameters

### Request with Category Filter (Cache Miss)
```bash
curl -v "http://localhost:3000/api/products?category=electronics" \
  -H "Accept: application/json"
```

**Expected Output:**
- Different cache key based on query parameters
- First call: `source: "api"`
- Should see console log: `[v0] Cache MISS: products:list:{"category":"electronics"}`

### Cached Request with Same Parameters
```bash
curl -v "http://localhost:3000/api/products?category=electronics" \
  -H "Accept: application/json"
```

**Expected Output:**
- `source: "redis-cache"`
- Should see console log: `[v0] Cache HIT: products:list:{"category":"electronics"}`

## 3. Test Cache TTL (Time To Live)

### Check Cache TTL (5 minutes for products list)
```bash
# First request - cache miss
curl -v "http://localhost:3000/api/products?test=ttl" \
  -H "Accept: application/json"

# Wait 10 seconds and request again - should hit cache
sleep 10

curl -v "http://localhost:3000/api/products?test=ttl" \
  -H "Accept: application/json"

# After 5 minutes, cache expires - will be a miss
sleep 300

curl -v "http://localhost:3000/api/products?test=ttl" \
  -H "Accept: application/json"
```

## 4. Test Response Headers

### Check Cache Control Headers
```bash
curl -i "http://localhost:3000/api/products" | grep -E "Cache-Control|X-Cache"
```

**Expected Output:**
```
Cache-Control: public, max-age=300
X-Cache-Source: redis  # On subsequent requests
X-Cache-Source: api    # On first request
```

## 5. Test Cache Keys

### Monitor what's being cached
```bash
# Request with different parameters to create multiple cache keys
curl "http://localhost:3000/api/products?limit=10" \
  -H "Accept: application/json"

curl "http://localhost:3000/api/products?limit=20" \
  -H "Accept: application/json"

curl "http://localhost:3000/api/products?sort=price" \
  -H "Accept: application/json"

curl "http://localhost:3000/api/products?sort=name" \
  -H "Accept: application/json"
```

Each request with different parameters creates a new cache key and will be a cache miss.

## 6. Test Response Times

### Measure Cache Performance
```bash
# First request (cache miss) - measures service + cache set time
time curl "http://localhost:3000/api/products?perf=test1" \
  -H "Accept: application/json" > /dev/null

# Second request (cache hit) - measures redis retrieval only
time curl "http://localhost:3000/api/products?perf=test1" \
  -H "Accept: application/json" > /dev/null
```

**Expected:**
- Cache miss: 100-500ms
- Cache hit: <50ms
- Speed improvement: 5-10x faster

## 7. Test Category Endpoint

### Category Cache (10 minute TTL)
```bash
# First request
curl -v "http://localhost:3000/api/products/category/electronics" \
  -H "Accept: application/json"

# Second request (cached)
curl -v "http://localhost:3000/api/products/category/electronics" \
  -H "Accept: application/json"
```

## 8. Check Redis Health

### Verify Redis Connection Status
```bash
curl "http://localhost:3000/api/products" \
  -H "Accept: application/json" | jq '.source'
```

Should return either:
- `"redis-cache"` - Redis is working
- `"api"` - First request or Redis might have an issue

## 9. Multiple Concurrent Requests

### Test cache under load
```bash
# Fire 10 requests simultaneously (these should be cached after first)
for i in {1..10}; do
  curl -s "http://localhost:3000/api/products" \
    -H "Accept: application/json" &
done
wait
```

Check logs to see:
- First request: `Cache MISS`
- Next 9 requests: `Cache HIT`

## 10. Request Payload Size Test

### Compare cached vs non-cached payload sizes
```bash
# Get full response including headers
curl -i "http://localhost:3000/api/products" \
  -H "Accept: application/json" | head -1

# Check Content-Length header
curl -i "http://localhost:3000/api/products" | grep Content-Length
```

## Response Format

All successful responses follow this format:

```json
{
  "data": [
    {
      "id": "...",
      "name": "...",
      "price": "...",
      ...
    }
  ],
  "source": "redis-cache" | "api",
  "timestamp": "2026-03-07T10:30:45.123Z"
}
```

## Debugging Tips

### Check Console Logs
Look for these patterns in your server logs:

```
[v0] Products API - Cache key: products:list:{}
[v0] Cache MISS: products:list:{}
[v0] Fetching products from service...
[v0] Cache SET: products:list:{} (TTL: 300s)

# Or on cached requests:
[v0] Products API - Cache key: products:list:{}
[v0] Cache HIT: products:list:{}
```

### Response Headers to Watch
- `X-Cache-Source: redis` - Cache hit
- `X-Cache-Source: api` - Cache miss (first request)
- `Cache-Control: public, max-age=300` - Caching enabled

### Common Issues

1. **Always getting "api" as source**: Redis might not be connected
   - Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables

2. **Empty responses**: Check if product service is returning data
   - Verify backend API is running

3. **Slow responses even with cache**: Check Redis connection
   - Use the Redis health check endpoint

## Performance Benchmarking Script

Save this as `bench.sh`:

```bash
#!/bin/bash

echo "=== Redis Cache Performance Benchmark ==="
echo ""

# Test 1: Cache miss
echo "Test 1: First request (cache miss)"
START=$(date +%s%N)
curl -s "http://localhost:3000/api/products" > /dev/null
END=$(date +%s%N)
MISS_TIME=$(( (END - START) / 1000000 ))
echo "Time: ${MISS_TIME}ms"
echo ""

# Test 2: Cache hit
echo "Test 2: Second request (cache hit)"
START=$(date +%s%N)
curl -s "http://localhost:3000/api/products" > /dev/null
END=$(date +%s%N)
HIT_TIME=$(( (END - START) / 1000000 ))
echo "Time: ${HIT_TIME}ms"
echo ""

# Calculate improvement
if [ $HIT_TIME -gt 0 ]; then
  IMPROVEMENT=$((MISS_TIME / HIT_TIME))
  echo "Performance improvement: ${IMPROVEMENT}x faster"
else
  echo "Cache hit too fast to measure accurately (< 1ms)"
fi
```

Run it:
```bash
chmod +x bench.sh
./bench.sh
```

## Next Steps

1. Run individual curl commands and verify cache hits/misses
2. Check server logs for cache operation messages
3. Monitor response times comparing first vs cached requests
4. Test with different query parameters to validate key generation
5. Use the Redis test page UI: `http://localhost:3000/redis-test`

