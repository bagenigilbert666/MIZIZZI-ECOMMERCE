# Frontend Integration Guide - Redis Batch Endpoints

## Overview

Your frontend now has access to Redis-cached batch endpoints that deliver ultra-fast responses (5-10ms) compared to traditional endpoints (100-150ms+).

## Setup

### 1. Environment Configuration

Create `.env.local` in the frontend root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

For production, update to your deployed backend URL.

### 2. Install Dependencies

```bash
pnpm install
```

This will install `@radix-ui/react-visually-hidden` and all other dependencies.

## Usage

### UI Batch Endpoint (Carousel, Topbar, Categories, Side Panels)

```tsx
import { useUIBatch } from '@/hooks/useBatchAPI';

export default function HomePage() {
  const { carousel, topbar, categories, sidePanels, cached, executionTime, isLoading } = useUIBatch();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Carousel Section */}
      {carousel.homepage && (
        <section>
          {carousel.homepage.map((item: any) => (
            <CarouselItem key={item.id} item={item} />
          ))}
        </section>
      )}

      {/* Topbar */}
      <section>
        {topbar.map((slide: any) => (
          <TopbarSlide key={slide.id} slide={slide} />
        ))}
      </section>

      {/* Categories */}
      <section>
        <h2>Featured Categories</h2>
        {categories.featured.map((cat: any) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </section>

      {/* Side Panels */}
      <section>
        {sidePanels.product_showcase_left && (
          <SidePanel items={sidePanels.product_showcase_left} />
        )}
      </section>

      {/* Performance Indicator */}
      <div className="text-xs text-gray-500">
        {cached ? '⚡ Cached' : '🔄 Fresh'} ({executionTime}ms)
      </div>
    </div>
  );
}
```

### Homepage Batch Endpoint (Products)

```tsx
import { useHomepageBatch } from '@/hooks/useBatchAPI';

export default function ProductsPage() {
  const {
    flashSales,
    trending,
    topPicks,
    newArrivals,
    dailyFinds,
    luxuryDeals,
    cached,
    executionTime,
    isLoading,
  } = useHomepageBatch();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Flash Sales */}
      <section>
        <h2>Flash Sales</h2>
        <ProductGrid products={flashSales} />
      </section>

      {/* Trending */}
      <section>
        <h2>Trending Now</h2>
        <ProductGrid products={trending} />
      </section>

      {/* Top Picks */}
      <section>
        <h2>Top Picks</h2>
        <ProductGrid products={topPicks} />
      </section>

      {/* New Arrivals */}
      <section>
        <h2>New Arrivals</h2>
        <ProductGrid products={newArrivals} />
      </section>

      {/* Daily Finds */}
      <section>
        <h2>Daily Finds</h2>
        <ProductGrid products={dailyFinds} />
      </section>

      {/* Luxury Deals */}
      <section>
        <h2>Luxury Deals</h2>
        <ProductGrid products={luxuryDeals} />
      </section>

      {/* Performance Indicator */}
      <div className="text-xs text-gray-500">
        {cached ? '⚡ Cached' : '🔄 Fresh'} ({executionTime}ms)
      </div>
    </div>
  );
}
```

## Advanced Usage

### Fetch Specific Sections Only

```tsx
// Only fetch flash_sales and trending
const { flashSales, trending } = useHomepageBatch(true, 'flash_sales,trending');
```

### Refresh Cache Manually

```tsx
import { useUIBatch } from '@/hooks/useBatchAPI';

export default function MyComponent() {
  const { refresh } = useUIBatch();

  const handleRefresh = async () => {
    await refresh(); // Refetch from backend/Redis
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

### Invalidate Cache After Admin Updates

```tsx
import { invalidateBatchCache } from '@/hooks/useBatchAPI';

export async function handleProductUpdate(productId: number) {
  // Update product...
  
  // Invalidate cache to show fresh data
  await invalidateBatchCache(productId);
}
```

### Monitor Cache Performance

```tsx
import { useCacheStats } from '@/hooks/useBatchAPI';

export default function PerformanceMonitor() {
  const { hitRate, cacheHits, cacheMisses } = useCacheStats();

  return (
    <div>
      <p>Cache Hit Rate: {hitRate.toFixed(2)}%</p>
      <p>Hits: {cacheHits} | Misses: {cacheMisses}</p>
    </div>
  );
}
```

## Performance Benefits

### Before (Traditional Endpoints)
- UI sections: 5-8 requests in sequence
- Product data: 6-8 requests in sequence
- Total load time: 800-1500ms
- Database load: High (100% query rate)

### After (Redis Batch Endpoints)
- UI sections: 1 request, parallel execution
- Product data: 1 request, parallel execution
- Total load time: 5-10ms (cached) or 100-150ms (fresh)
- Database load: 90% reduction (cache hits)

## Endpoints Reference

### UI Batch
- **URL**: `/api/ui/batch`
- **Method**: `GET`
- **Response Time**: 5-10ms (cached) / 100-150ms (fresh)
- **Returns**: Carousel, Topbar, Categories, Side Panels

### Homepage Batch
- **URL**: `/api/homepage/batch`
- **Method**: `GET`
- **Response Time**: 5-10ms (cached) / 130-150ms (fresh)
- **Returns**: Flash Sales, Trending, Top Picks, New Arrivals, Daily Finds, Luxury Deals

### Cache Management
- **Invalidate**: `POST /api/homepage/batch/cache/invalidate?product_id=123`
- **Clear**: `POST /api/homepage/batch/cache/clear`
- **Stats**: `GET /api/homepage/batch/cache/stats`

## Troubleshooting

### Endpoints Returning 404

Ensure:
1. Backend server is running on `http://localhost:5000`
2. `.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Backend blueprints are registered (check `/api/ui/batch/status` in curl)

### Data Not Updating After Admin Changes

Call the cache invalidation endpoint after updates:

```tsx
await fetch('http://localhost:5000/api/homepage/batch/cache/invalidate?product_id=123', {
  method: 'POST',
});
```

### Slow Responses

Check cache stats to see hit rate:

```bash
curl http://localhost:5000/api/homepage/batch/cache/stats
```

If hit rate is low (<50%), Redis may need restart or data needs refreshing.

## Best Practices

1. **Use the batch endpoints for homepage/main sections** - Gets all data in one request
2. **Call invalidation after admin updates** - Ensures users see fresh data
3. **Monitor cache stats** - Check hit rates to optimize TTL settings
4. **Graceful degradation** - Endpoints still work if Redis is down (falls back to in-memory cache)
5. **Conditional fetching** - Use `enabled={condition}` to avoid unnecessary requests
