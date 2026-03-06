# Redis Setup Guide - MIZIZZI E-Commerce

## Overview

Your e-commerce platform now has **Redis caching integrated** using **Upstash** for serverless Redis operations. This guide explains the current setup and how to use it across all routes.

## Current Status: ✅ CONFIGURED

### Environment Variables Set:
- `UPSTASH_REDIS_REST_URL`: Your Redis endpoint
- `UPSTASH_REDIS_REST_TOKEN`: Your REST API authentication token

### Upstash Console:
- **Endpoint**: `nearby-rabbit-63956.upstash.io`
- **Port**: 6379
- **Region**: Cape Town, South Africa
- **Type**: Free Tier

---

## Architecture Overview

### 1. **Redis Client (`/frontend/lib/redis.ts`)**

The Redis client is initialized with the Upstash REST API credentials:

```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

### 2. **Cache Configuration**

Pre-configured cache patterns for your e-commerce data:

```typescript
export const CACHE_CONFIG = {
  PRODUCTS_LIST: {
    key: 'products:list',
    ttl: 5 * 60, // 5 minutes
  },
  PRODUCTS_CATEGORY: {
    key: 'products:category',
    ttl: 10 * 60, // 10 minutes
  },
  PRODUCT_DETAIL: {
    key: 'product:detail',
    ttl: 15 * 60, // 15 minutes
  },
  PRODUCT_IMAGES: {
    key: 'product:images',
    ttl: 30 * 60, // 30 minutes
  },
}
```

### 3. **Utility Functions**

#### `getCachedData<T>(key: string): Promise<T | null>`
Retrieves cached data from Redis.
```typescript
const cachedProducts = await getCachedData(cacheKey)
```

#### `setCachedData<T>(key: string, value: T, ttl: number): Promise<void>`
Stores data in Redis with optional TTL.
```typescript
await setCachedData(cacheKey, products, 300) // 5 minutes
```

#### `invalidateCache(pattern: string): Promise<void>`
Clears all cache keys matching a pattern.
```typescript
await invalidateCache('products:list') // Clears all products:list* keys
```

#### `clearAllCache(): Promise<void>`
Clears the entire Redis database.
```typescript
await clearAllCache()
```

#### `getRedisHealth(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }>`
Checks Redis connection status.
```typescript
const health = await getRedisHealth()
```

---

## Current Product Routes with Redis Caching

### 1. **GET `/api/products`** - List Products
📍 **File**: `/frontend/app/api/products/route.ts`

**Features:**
- Caches product lists with optional query parameters
- TTL: 5 minutes
- Cache key: `products:list:{JSON.stringify(params)}`
- Returns: Products + cache source indicator (`redis-cache` or `api`)

**Example Response:**
```json
{
  "data": [...products],
  "source": "redis-cache",
  "timestamp": "2026-03-06T10:00:00.000Z"
}
```

### 2. **GET `/api/products/[id]`** - Product Details
📍 **File**: `/frontend/app/api/products/[id]/route.ts`

**Features:**
- Caches individual product details
- TTL: 15 minutes
- Cache key: `product:detail:{id}`
- Validates product ID before caching

### 3. **GET `/api/products/category/[slug]`** - Products by Category
📍 **File**: `/frontend/app/api/products/category/[slug]/route.ts`

**Features:**
- Caches products grouped by category slug
- TTL: 10 minutes
- Cache key: `products:category:{slug}`
- Handles both slug and numeric category IDs

### 4. **POST `/api/redis/invalidate`** - Cache Invalidation
📍 **File**: `/frontend/app/api/redis/invalidate/route.ts`

**Usage:**
```bash
# Invalidate pattern
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{ "pattern": "products:list" }'

# Clear all cache
curl -X POST http://localhost:3000/api/redis/invalidate \
  -H "Content-Type: application/json" \
  -d '{ "clearAll": true }'
```

### 5. **GET `/api/redis/health`** - Redis Health Check
📍 **File**: `/frontend/app/api/redis/health/route.ts`

**Usage:**
```bash
curl http://localhost:3000/api/redis/health
```

**Response:**
```json
{
  "status": "healthy",
  "message": "Redis is connected and operational"
}
```

---

## How Caching Works

### Product List Request Flow:

```
1. Frontend requests GET /api/products?category=electronics
   ↓
2. API generates cache key: `products:list:{"category":"electronics"}`
   ↓
3. Check Redis for cached data
   ├─ HIT → Return cached data with X-Cache-Source: redis
   └─ MISS → Fetch from backend service
      ↓
4. Store result in Redis with TTL (5 minutes)
   ↓
5. Return data with X-Cache-Source: api
```

### Response Headers:

```
Cache-Control: public, max-age=300
X-Cache-Source: redis          // or "api" if fresh fetch
```

---

## Extending Redis to Other Routes

### Template for Adding Redis to a New Route:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCachedData, setCachedData, invalidateCache, CACHE_CONFIG } from '@/lib/redis'
import { yourService } from '@/services/your-service'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const cacheKey = `your:cache:key`
    
    // Try cache first
    const cached = await getCachedData(cacheKey)
    if (cached) {
      return NextResponse.json(
        {
          data: cached,
          source: 'redis-cache',
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'X-Cache-Source': 'redis',
          },
        }
      )
    }

    // Fetch fresh data
    const data = await yourService.getData()

    // Cache the result
    await setCachedData(cacheKey, data, 300) // 5 min TTL

    return NextResponse.json(
      {
        data,
        source: 'api',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache-Source': 'api',
        },
      }
    )
  } catch (error) {
    console.error('[v0] API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}
```

---

## Best Practices

### ✅ DO:
- Use meaningful cache keys following pattern: `entity:type:identifier`
- Set appropriate TTLs based on data freshness requirements
- Use cache invalidation patterns after data mutations
- Check cache health before critical operations
- Log cache hits/misses for performance monitoring

### ❌ DON'T:
- Store sensitive user data (passwords, tokens) in Redis
- Set very short TTLs that defeat caching purpose
- Forget to invalidate cache after updates
- Cache inconsistent data states
- Store extremely large objects (>1MB)

---

## Cache Invalidation Triggers

### Manual Invalidation Points (Add These to Your Services):

1. **After Product Updates:**
   ```typescript
   // In product update endpoint
   await invalidateCache('products:list')
   await invalidateCache('products:category')
   await invalidateCache(`product:detail:${productId}`)
   ```

2. **After Inventory Changes:**
   ```typescript
   await invalidateCache(`product:detail:${productId}`)
   ```

3. **After Webhook Events:**
   ```typescript
   // In webhook handler
   POST /api/webhooks/cache-invalidate
   ```

---

## Monitoring & Debugging

### Check Cache Status:
```bash
GET /api/redis/health
```

### View Cache Metrics:
- **Commands**: 3.2K/100k per month
- **Bandwidth**: 0 B / 50 GB
- **Storage**: 54 KB / 256 MB
- **Cost**: $0.00

### Enable Debug Logging:
Add to any route to see cache operations:
```typescript
console.log('[v0] Cache HIT: ' + cacheKey)
console.log('[v0] Cache MISS: ' + cacheKey)
console.log('[v0] Cache SET: ' + cacheKey + ' (TTL: ' + ttl + 's)')
```

---

## Performance Impact

### Expected Improvements:
- **First Request**: ~500-1000ms (direct API call)
- **Cached Requests**: ~50-100ms (Redis lookup)
- **Speed Improvement**: **10x faster** for cached data

### Cache Hit Rate Targets:
- Product Lists: 80-90% hit rate (5 min TTL)
- Category Products: 75-85% hit rate (10 min TTL)
- Product Details: 85-95% hit rate (15 min TTL)

---

## Troubleshooting

### Issue: "Redis connection error"
- ✅ Check environment variables are set correctly
- ✅ Verify Upstash console shows green status
- ✅ Check network connectivity to `nearby-rabbit-63956.upstash.io`

### Issue: "Cache misses on all requests"
- ✅ Verify cache key generation is consistent
- ✅ Check TTL isn't set to 0
- ✅ Ensure `setCachedData` is being called

### Issue: "Stale data being served"
- ✅ Reduce TTL for that cache pattern
- ✅ Add manual invalidation after updates
- ✅ Check if data updates aren't triggering invalidation

---

## Next Steps

1. **Monitor Cache Performance**
   - Add analytics to track hit/miss rates
   - Monitor response times before/after caching

2. **Expand to Other Routes**
   - Apply pattern to: Cart, Orders, Inventory routes
   - Use template provided above

3. **Implement Cache Warming**
   - Pre-load popular products on deployment
   - Refresh cache before expiration for high-traffic items

4. **Add Cache Tags**
   - Implement tag-based invalidation for related data
   - Example: `product:123` affects `category:electronics`

---

## Support & References

- **Upstash Docs**: https://upstash.com/docs/redis/overall/getstarted
- **Redis Commands**: https://redis.io/commands/
- **Next.js Caching**: https://nextjs.org/docs/app/building-your-application/caching

---

**Last Updated**: March 6, 2026
**Redis Status**: ✅ Healthy
**Configured Routes**: 3 + 2 utility endpoints
