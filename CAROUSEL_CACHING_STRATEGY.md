# Carousel Caching Strategy - Complete Implementation Guide

## Executive Summary

This document provides a comprehensive caching strategy for carousel routes in your MIZIZZI e-commerce platform. By combining Redis backend caching, Next.js ISR, and edge caching, you can achieve:

- **First Load**: <2 seconds (cached)
- **Carousel Display**: <500ms (LQIP + Redis hit)
- **Cache Hit Rate**: 85-95%
- **Database Load**: <5% of original
- **Memory Usage**: ~50MB Redis for 10,000 carousels

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Browser                               │
│  (Local Cache: 30 days for static assets)                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Vercel Edge Cache (CDN)                            │
│  Carousel: s-maxage=60, SWR=3600                                │
│  Hit Rate: 90%+ for repeated requests                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│           Next.js ISR Cache (On Origin)                         │
│  Revalidate: 60 seconds                                         │
│  Tags: carousel-items, carousel-{id}, carousel-optimized        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│        Backend API with Redis Cache Layer                       │
│  Redis TTL: 15-30 minutes per carousel type                     │
│  Hit Rate: 80-90% after warmup                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Database (Fallback Only)                           │
│  Hit Rate: 5-15% (only on cache miss)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Layer Caching Strategy

### Layer 1: Browser Cache (Client-Side)

**Static Assets** (Images, CSS, JS):
```http
Cache-Control: public, max-age=31536000, immutable
```
- Set for: All `.jpg`, `.png`, `.webp`, `.css`, `.js` with version hashes
- Duration: 1 year
- Effect: Zero requests for unchanged assets

**HTML & Data**:
```http
Cache-Control: public, max-age=300
```
- Set for: `/api/carousel/*` responses
- Duration: 5 minutes
- Effect: Reduces API calls on repeated visits

### Layer 2: Vercel Edge Cache (CDN)

**Carousel Data**:
```http
Cache-Control: public, s-maxage=60, stale-while-revalidate=3600
```
- Duration: 60 seconds fresh, 1 hour stale
- Hit Rate: 90%+ for repeated visitors
- Geographic Distribution: 300+ global locations
- Automatic Purge: On webhook trigger

**Optimized Carousel with LQIP**:
```http
Cache-Control: public, s-maxage=120, stale-while-revalidate=7200
```
- Duration: 120 seconds fresh, 2 hours stale
- Includes: LQIP, responsive URLs, metadata
- Hit Rate: 92%+ (heavier payload, but cached longer)

**Implementation**:
```typescript
// frontend/app/api/carousel/route.ts
export async function GET(request: Request) {
  const response = await fetch('backend/api/carousel/items/optimized', {
    headers: { 'Accept-Encoding': 'gzip' }
  });
  
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
    'CDN-Cache-Control': 'max-age=86400', // Vercel edge: 24 hours
  };
  
  return new Response(response.body, { headers });
}
```

### Layer 3: Next.js ISR Cache (Origin)

**Revalidation Strategy**:
```typescript
// frontend/lib/server/get-carousel-data.ts
export const getCarouselItems = cache(async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/carousel/items/optimized`,
    {
      next: {
        revalidate: 60, // Revalidate every 60 seconds
        tags: [
          'carousel-items',
          'carousel-items-optimized',
          `carousel-${position}`, // Position-specific (e.g., carousel-homepage)
        ]
      }
    }
  );
  
  if (!response.ok) {
    // Fallback to stale data from build time
    return getCarouselItemsFromBuildCache();
  }
  
  return response.json();
});
```

**Revalidation Triggers**:
- **Time-based**: Auto-revalidates after 60 seconds
- **Webhook-based**: Admin updates carousel → webhook fires → cache tags invalidated
- **On-demand**: Manual cache invalidation endpoint

### Layer 4: Backend Redis Cache

**Cache Key Strategy**:
```
mizizzi:carousel:{position}:{version}
  - position: "homepage", "sidebar", "featured", "flash-sale"
  - version: Incremented on cache invalidation
  
Example: mizizzi:carousel:homepage:v2
```

**TTL Configuration**:
```python
# backend/app/cache/cache.py

CAROUSEL_CACHE_TTL = {
    'homepage': 900,        # 15 minutes (high traffic)
    'featured': 600,        # 10 minutes (medium traffic)
    'flash-sale': 300,      # 5 minutes (time-sensitive)
    'sidebar': 1800,        # 30 minutes (low traffic)
    'seasonal': 3600,       # 60 minutes (stable content)
    'recommendations': 300, # 5 minutes (personalized)
}
```

**Implementation**:
```python
from app.cache.redis_client import redis_client
from functools import wraps
import json
import hashlib

def cache_carousel(position='homepage', ttl=None):
    """Decorator for caching carousel data in Redis"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            ttl_seconds = ttl or CAROUSEL_CACHE_TTL.get(position, 900)
            cache_key = f'mizizzi:carousel:{position}:v{get_version()}'
            
            # Try to get from cache
            cached = redis_client.get(cache_key)
            if cached:
                logger.debug(f"Cache HIT: {cache_key}")
                return json.loads(cached)
            
            # Cache miss - fetch from database
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            
            # Store in cache
            redis_client.set(cache_key, json.dumps(result), ex=ttl_seconds)
            logger.info(f"Cached: {cache_key} for {ttl_seconds}s")
            
            return result
        return wrapper
    return decorator

@cache_carousel(position='homepage', ttl=900)
def get_homepage_carousel():
    """Fetch carousel from database with Redis caching"""
    return Carousel.query.filter_by(position='homepage').all()
```

**Response Headers for Debugging**:
```python
# backend/app/routes/carousel.py

@app.route('/api/carousel/items/optimized')
def get_carousel_optimized():
    position = request.args.get('position', 'homepage')
    
    # Get from Redis
    cached_data = cache.get_carousel(position)
    
    response = jsonify(cached_data)
    response.headers['X-Cache-Source'] = 'redis' if cache_hit else 'database'
    response.headers['X-Cache-Key'] = cache_key
    response.headers['X-Cache-TTL'] = ttl_remaining
    
    return response, 200
```

## Cache Invalidation Strategy

### Webhook-Based Invalidation (Recommended)

**When Admin Updates Carousel**:
```python
# backend/app/routes/carousel/admin.py

@app.route('/api/carousel/admin', methods=['POST'])
def create_carousel():
    carousel_data = request.json
    carousel = Carousel.create(carousel_data)
    
    # 1. Clear Redis cache
    cache.invalidate_carousel(carousel.position)
    
    # 2. Trigger webhook to Next.js frontend
    webhook_payload = {
        'event': 'carousel.updated',
        'position': carousel.position,
        'timestamp': datetime.now().isoformat(),
        'secret': WEBHOOK_SECRET
    }
    
    try:
        requests.post(
            f"{FRONTEND_URL}/api/webhooks/carousel-invalidate",
            json=webhook_payload,
            headers={'x-webhook-secret': WEBHOOK_SECRET},
            timeout=5
        )
        logger.info(f"Webhook sent for carousel update: {carousel.position}")
    except Exception as e:
        logger.error(f"Webhook failed: {e}")
        # Queue for retry
        retry_queue.add(webhook_payload)
    
    return jsonify({
        'success': True,
        'carousel_id': carousel.id,
        'cached_at': datetime.now().isoformat()
    }), 201
```

**Webhook Handler on Frontend**:
```typescript
// frontend/app/api/webhooks/carousel-invalidate/route.ts

import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const secret = request.headers.get('x-webhook-secret');
  
  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const payload = await request.json();
  const { position, event } = payload;
  
  try {
    // Revalidate ISR cache tags
    revalidateTag('carousel-items');
    revalidateTag(`carousel-${position}`);
    revalidateTag('carousel-items-optimized');
    
    // Revalidate pages using this carousel
    if (position === 'homepage') {
      revalidatePath('/');
    } else if (position === 'featured') {
      revalidatePath('/featured');
    }
    
    logger.info(`✅ Revalidated carousel: ${position}`);
    
    return new Response(JSON.stringify({
      success: true,
      position,
      revalidated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(`❌ Webhook failed: ${error.message}`);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Manual Cache Invalidation Endpoint

For admin dashboard or debugging:
```typescript
// frontend/app/api/carousel/invalidate/route.ts

export async function POST(request: Request) {
  const { secret, position } = await request.json();
  
  if (secret !== process.env.REVALIDATION_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Revalidate specific carousel
  if (position) {
    revalidateTag(`carousel-${position}`);
  } else {
    // Invalidate all carousels
    revalidateTag('carousel-items');
    revalidateTag('carousel-items-optimized');
  }
  
  return new Response(JSON.stringify({
    success: true,
    invalidated: position || 'all'
  }), { status: 200 });
}
```

## Cache Warming Strategy

Pre-populate cache on startup to avoid cold starts:

```python
# backend/app/services/cache_warmer.py

def warm_cache():
    """Warm up Redis cache with popular carousels"""
    logger.info("🔥 Starting cache warming...")
    
    carousel_positions = ['homepage', 'featured', 'flash-sale', 'sidebar']
    
    for position in carousel_positions:
        try:
            carousels = Carousel.query.filter_by(
                position=position,
                active=True
            ).all()
            
            cache_key = f'mizizzi:carousel:{position}:v{VERSION}'
            ttl = CAROUSEL_CACHE_TTL.get(position, 900)
            
            redis_client.set(
                cache_key,
                json.dumps([c.to_dict() for c in carousels]),
                ex=ttl
            )
            
            logger.info(f"✅ Warmed: {position} ({len(carousels)} items)")
        except Exception as e:
            logger.error(f"❌ Failed to warm {position}: {e}")
    
    logger.info("✅ Cache warming complete")

# Call on application startup
@app.before_request
def startup():
    if not hasattr(app, '_cache_warmed'):
        warm_cache()
        app._cache_warmed = True
```

## Fallback & Error Handling

**Cascade Fallback Strategy**:
```typescript
export const getCarouselItems = cache(async () => {
  try {
    // 1. Try fresh API call
    const response = await fetch(
      `${API_BASE_URL}/api/carousel/items/optimized?position=homepage`,
      { next: { revalidate: 60 } }
    );
    
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    logger.warn('API call failed, trying fallback', error);
  }
  
  try {
    // 2. Try getting stale data from ISR cache
    const staleData = getCarouselItemsStale();
    if (staleData) {
      logger.info('Serving stale carousel from ISR cache');
      return staleData;
    }
  } catch (error) {
    logger.warn('Stale cache failed', error);
  }
  
  // 3. Return hardcoded defaults from build time
  logger.warn('Using build-time default carousel');
  return DEFAULT_CAROUSEL_ITEMS;
});
```

**Health Check Endpoint**:
```python
# backend/app/routes/carousel.py

@app.route('/api/carousel/health')
def carousel_health():
    """Check carousel cache health"""
    try:
        # Check Redis connection
        redis_connected = redis_client.ping()
        
        # Check carousel data freshness
        homepage_cached = redis_client.get('mizizzi:carousel:homepage:v2')
        featured_cached = redis_client.get('mizizzi:carousel:featured:v2')
        
        return jsonify({
            'status': 'healthy' if redis_connected else 'degraded',
            'redis_connection': redis_connected,
            'cached_carousels': {
                'homepage': homepage_cached is not None,
                'featured': featured_cached is not None
            },
            'cache_timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
```

## Performance Metrics & Monitoring

**Track These Metrics**:
```typescript
// frontend/lib/carousel-metrics.ts

export const carouselMetrics = {
  // Cache hit rate
  hits: 0,
  misses: 0,
  get hitRate() { return this.hits / (this.hits + this.misses) * 100; },
  
  // Load times
  apiResponseTimes: [],
  get avgApiTime() { 
    return this.apiResponseTimes.reduce((a, b) => a + b, 0) / this.apiResponseTimes.length;
  },
  
  // Record metrics
  recordHit() { this.hits++; },
  recordMiss() { this.misses++; },
  recordApiTime(ms: number) { this.apiResponseTimes.push(ms); }
};

// In carousel component
export function CarouselOptimized() {
  useEffect(() => {
    const start = performance.now();
    
    fetchCarouselData().then(() => {
      const duration = performance.now() - start;
      
      if (response.headers.get('X-Cache-Source') === 'redis') {
        carouselMetrics.recordHit();
      } else {
        carouselMetrics.recordMiss();
      }
      
      carouselMetrics.recordApiTime(duration);
    });
  }, []);
}
```

## Configuration Checklist

- [ ] Set Redis TTLs in `CAROUSEL_CACHE_TTL`
- [ ] Configure Edge Cache headers in response middleware
- [ ] Set ISR revalidation times to 60 seconds
- [ ] Create webhook endpoint for cache invalidation
- [ ] Set `WEBHOOK_SECRET` environment variable
- [ ] Implement cache warming on app startup
- [ ] Add fallback carousel in build artifacts
- [ ] Enable cache tag revalidation in Next.js config
- [ ] Monitor cache hit rates in analytics
- [ ] Test cache invalidation workflow
- [ ] Set up health check endpoint

## Expected Performance

| Layer | Cache Hit Rate | Response Time | Database Queries |
|-------|---------------|---------------|------------------|
| Browser Cache | 95%+ | <100ms | 0 |
| Edge Cache | 90%+ | <200ms | 0 |
| ISR Cache | 85%+ | <500ms | 0 |
| Redis Cache | 80%+ | 50-100ms | 0 |
| Database | ~10% | 500-1000ms | 1 query |

**Result**: 90%+ of requests served from cache, 10x performance improvement!

## Summary

This carousel caching strategy provides:
- **Multi-layer caching** for maximum hit rates
- **Redis backend** for fast data retrieval
- **ISR for freshness** with automatic revalidation
- **Webhook-based invalidation** for instant updates
- **Fallback mechanisms** for reliability
- **Comprehensive monitoring** for optimization

Implement this strategy to achieve sub-500ms carousel load times and serve 10,000+ concurrent users with minimal database load.
