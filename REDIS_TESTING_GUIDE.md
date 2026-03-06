# Redis Testing Guide

This guide walks you through testing your Upstash Redis integration with the MIZIZZI ecommerce platform.

## Prerequisites

Before testing, ensure you have:
1. Added `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` to your environment variables (via Vercel project settings)
2. Your development server running with `npm run dev` or `pnpm dev`
3. curl or Postman installed for API testing

## Step 1: Verify Environment Variables

First, make sure your Redis credentials are set up:

**Option 1: Check via Vercel Settings**
1. Open your project in v0
2. Click the settings icon (gear) in the top right
3. Go to "Vars" section
4. Verify `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are present

**Option 2: Add Environment Variables Manually**
```bash
# In frontend/.env.local (for local testing)
UPSTASH_REDIS_URL=https://nearby-rabbit-63956.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here
```

## Step 2: Check Redis Health Endpoint

Test if Redis is connected and working:

```bash
curl -X GET http://localhost:3000/api/redis/health
```

**Expected Response (Healthy):**
```json
{
  "status": "healthy",
  "message": "Redis is connected and operational"
}
```

**Expected Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "message": "Redis connection error: [error message]"
}
```

If you see an unhealthy response, check:
- Environment variables are set correctly
- Your internet connection is working
- Redis credentials are correct

## Step 3: Test Product Caching

### Test 1: First Product Request (Cache Miss)

```bash
curl -i -X GET http://localhost:3000/api/products?page=1&limit=10
```

Look for the `X-Cache-Source` header in the response:
- **First request:** `X-Cache-Source: database` (data comes from database)
- Response time: ~200-500ms (slower due to database query)

### Test 2: Second Product Request (Cache Hit)

```bash
curl -i -X GET http://localhost:3000/api/products?page=1&limit=10
```

Look for the `X-Cache-Source` header:
- **Second request:** `X-Cache-Source: redis` (data comes from Redis cache)
- Response time: ~50-100ms (much faster!)

## Step 4: Test Individual Product Caching

### First Request (Cache Miss):
```bash
curl -i -X GET http://localhost:3000/api/products/1
```

### Second Request (Cache Hit):
```bash
curl -i -X GET http://localhost:3000/api/products/1
```

## Step 5: Test Category Products Caching

### First Request (Cache Miss):
```bash
curl -i -X GET http://localhost:3000/api/products/category/electronics?page=1&limit=10
```

### Second Request (Cache Hit):
```bash
curl -i -X GET http://localhost:3000/api/products/category/electronics?page=1&limit=10
```

## Step 6: Test Cache Invalidation

### Clear All Cache:
```bash
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-all"}'
```

**Response:**
```json
{
  "status": "success",
  "message": "All cache cleared successfully"
}
```

### Invalidate Specific Pattern:
```bash
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "invalidate-pattern", "pattern": "products:*"}'
```

## Cache Expiration Times

Your routes have these cache durations:

| Endpoint | Cache Duration | TTL |
|----------|---|---|
| `/api/products` | List of products | 5 minutes (300s) |
| `/api/products/[id]` | Single product details | 15 minutes (900s) |
| `/api/products/category/[slug]` | Products by category | 10 minutes (600s) |

## Performance Metrics to Track

When testing, monitor:

1. **Response Time:**
   - Cache miss (database): 200-500ms
   - Cache hit (Redis): 50-100ms
   - Performance improvement: 4-5x faster

2. **X-Cache-Source Header:**
   - `redis`: Data served from cache
   - `database`: Data fetched fresh from database

3. **Bandwidth Usage:**
   - Check Upstash console for bandwidth metrics
   - Should remain low (~0B if no large data transfers)

## Troubleshooting

### Problem: "Redis connection error"

**Solution:**
1. Verify environment variables are set in project settings
2. Check that your Redis endpoint is correct (https://nearby-rabbit-63956.upstash.io)
3. Verify the token is not expired or revoked
4. Restart your dev server

### Problem: All responses show "X-Cache-Source: database"

**Solution:**
1. Run: `curl -X POST http://localhost:3000/api/redis/invalidate -H "Content-Type: application/json" -d '{"action": "clear-all"}'`
2. Make a new request to the endpoint
3. Second request should show `X-Cache-Source: redis`

### Problem: 503 errors on health check

**Solution:**
1. Ensure `UPSTASH_REDIS_TOKEN` is set and not empty
2. Check firewall/network settings allow outbound HTTPS to Upstash
3. Restart the dev server
4. Check console for detailed error messages

## Manual Redis Cache Management

### Clear All Cache:
```bash
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-all"}'
```

### Check Cache Stats:
```bash
curl -X GET http://localhost:3000/api/redis/health
```

## Next Steps

After confirming Redis is working:

1. **Add caching to other routes** - Use the same pattern implemented in product routes
2. **Monitor performance** - Track response times and cache hit rates in Upstash console
3. **Optimize cache keys** - Consider what data changes frequently and adjust TTLs
4. **Set up alerts** - Configure Upstash alerts for high memory usage

## Additional Resources

- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Upstash Console](https://console.upstash.com)
- [Redis CLI Usage](https://redis.io/commands/)
