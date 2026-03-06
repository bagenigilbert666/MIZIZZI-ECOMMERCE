# Redis Quick Start Guide

## Overview

Your MIZIZZI ecommerce platform is now integrated with **Upstash Redis** for high-performance caching. This guide gets you testing in 5 minutes.

## Quick Setup Checklist

- [ ] **Environment Variables Set** - Added `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` in project settings
- [ ] **Dependencies Installed** - `@upstash/redis` is in your package.json
- [ ] **pnpm Workspace Configured** - `pnpm-workspace.yaml` exists (created automatically)
- [ ] **Development Server Running** - `npm run dev` or `pnpm dev`

## Test Redis Connection

### Option 1: Using cURL (Quickest)

```bash
# Test Redis health
curl http://localhost:3000/api/redis/health

# Expected response:
# {"status":"healthy","message":"Redis is connected and operational"}
```

### Option 2: Using the Test Script

```bash
# From project root
cd frontend
node ../scripts/test-redis.mjs
```

This will run through 6 comprehensive tests and show you exactly what's working.

## Test Product Caching

### First Request (Cache Miss - Data from Database)
```bash
curl -i http://localhost:3000/api/products?page=1&limit=10

# Look for header: X-Cache-Source: database
# Response time: ~200-500ms
```

### Second Request (Cache Hit - Data from Redis)
```bash
curl -i http://localhost:3000/api/products?page=1&limit=10

# Look for header: X-Cache-Source: redis
# Response time: ~50-100ms (4-5x faster!)
```

## What's Being Cached

| Route | Cache Time | Use Case |
|-------|-----------|----------|
| `GET /api/products` | 5 min | Product listings |
| `GET /api/products/[id]` | 15 min | Product details |
| `GET /api/products/category/[slug]` | 10 min | Category listings |

## Cache Expiration & Invalidation

### Manually Clear All Cache

```bash
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-all"}'
```

### Clear Specific Patterns

```bash
# Clear all product caches
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "invalidate-pattern", "pattern": "products:*"}'
```

## Monitoring

### Check Redis Status in Upstash Console

1. Go to [Upstash Console](https://console.upstash.com)
2. Select your "mizizzi" Redis database
3. Monitor:
   - **Commands:** Number of cache hits/misses
   - **Bandwidth:** Data transferred
   - **Storage:** Memory used

### Track Performance

Response times should improve:
- **Before Redis:** 200-500ms (database queries)
- **After Redis:** 50-100ms (cache hits)
- **Performance Gain:** 75-80% faster

## Troubleshooting

### Problem: "Redis connection error"

```bash
# Fix: Check environment variables
1. Go to v0 project settings → Vars
2. Verify UPSTASH_REDIS_URL exists
3. Verify UPSTASH_REDIS_TOKEN exists
4. Restart dev server: Ctrl+C, then npm run dev
```

### Problem: All responses show "database" instead of "redis"

```bash
# Fix: Clear cache and try again
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-all"}'

# Then make a new request - should now show "redis"
```

### Problem: 503 errors on `/api/redis/health`

```bash
# Fix: Check token
1. Verify token length (should be ~50+ characters)
2. Verify token doesn't have spaces
3. Try removing and re-adding environment variables
4. Wait 30 seconds and retry
```

## What's Running

### New API Endpoints
- `GET /api/redis/health` - Check Redis connection status
- `POST /api/redis/invalidate` - Clear cache by pattern or all

### Updated Product Routes
- All existing product routes now check Redis first
- Automatic cache management with configurable TTLs
- Response headers show cache source (redis vs database)

### New Files
- `/frontend/lib/redis.ts` - Redis client configuration
- `/app/api/redis/health/route.ts` - Health check endpoint
- `/app/api/redis/invalidate/route.ts` - Cache invalidation
- `pnpm-workspace.yaml` - Workspace configuration

## Next Steps

1. **Deploy** - Push changes to your Git repository
2. **Verify** - Test caching in your live environment
3. **Monitor** - Watch Upstash console for cache metrics
4. **Extend** - Add caching to other API routes following the same pattern

## Documentation Files

- **REDIS_SETUP.md** - Detailed setup guide with architecture
- **REDIS_TESTING_GUIDE.md** - Complete testing procedures
- **REDIS_QUICK_START.md** - This file

## Support

For issues:
1. Check the troubleshooting section above
2. Review detailed guides: REDIS_SETUP.md and REDIS_TESTING_GUIDE.md
3. Check Upstash console for connection details
4. Verify environment variables in project settings

---

**You're all set!** Your Redis integration is ready. Start by running the health check or testing a product request.
