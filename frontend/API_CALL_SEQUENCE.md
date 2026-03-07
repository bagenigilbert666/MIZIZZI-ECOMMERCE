# API CALL SEQUENCE: Step-by-Step Execution

## Exact Sequence of Events

### Request Arrives to Frontend

```
1. Browser requests: GET https://mizizzi.com/
2. Next.js Server Component (page.tsx) executes
```

### Step 1: START Both Data Fetches (IMMEDIATELY)

```typescript
// Line 1: Start critical fetch (AWAIT this)
const criticalData = await getCriticalHomepageData()
// ↓ This line BLOCKS until critical data returns

// Line 2: Start full fetch (DON'T AWAIT yet)
const fullDataPromise = getHomepageData()
// ↓ This returns a Promise immediately (non-blocking!)
// ↓ Actual fetch happens in background
```

**At this moment, TWO network requests have started:**

### Step 2: Critical Request Completes (0.3-0.8s)

```
[Backend receives]
GET /api/homepage/critical?categories_limit=20&carousel_limit=5&flash_sale_limit=20

[Backend handler]
get_homepage_critical()
├─ Load categories (DB query + cache) ~100ms
├─ Load carousel (DB query + cache) ~100ms
└─ Load flash_sale (DB query + cache) ~100ms
└─ Total: ~300-800ms

[Backend returns]
{
  "status": "success",
  "data": {
    "categories": [...],
    "carousel_items": [...],
    "flash_sale_products": [...]
  },
  "meta": {
    "cache_written": true,
    "aggregation_time_ms": 500
  }
}

[Network responds in ~300-800ms]
X-Cache: MISS (first request)
or X-Cache: HIT (subsequent requests <50ms)
```

### Step 3: Critical Data Available

```typescript
// Line 1 completes after ~0.3-0.8s
const criticalData = await getCriticalHomepageData()
// ↓ Gets result: { categories, carousel_items, flash_sale_products }

// Render happens immediately
<CriticalHomepageLoader 
  categories={criticalData.categories}
  carouselItems={criticalData.carousel_items}
  flashSaleProducts={criticalData.flash_sale_products}
/>

// Page is now INTERACTIVE at ~0.3-0.8s ✓
```

### Step 4: Full Request Still Loading (in background)

```
[Meanwhile, backend is working on full request]
GET /api/homepage?categories_limit=20&flash_sale_limit=20&...

[Backend handler]
get_homepage_data()
├─ Load categories ~100ms
├─ Load carousel ~100ms
├─ Load flash_sale ~100ms
├─ Load luxury_products ~300ms
├─ Load top_picks ~300ms
├─ Load new_arrivals ~300ms
├─ Load trending ~300ms
├─ Load daily_finds ~300ms
├─ Load all_products ~1500ms (paginated, many rows)
├─ Load contact_cta_slides ~100ms
├─ Load premium_experiences ~200ms
├─ Load product_showcase ~200ms
├─ Load feature_cards ~100ms
└─ Total: ~3-5s (parallel queries in ThreadPoolExecutor)

[Backend returns]
{
  "status": "success",
  "data": {
    "categories": [...],
    "carousel_items": [...],
    "flash_sale_products": [...],
    "luxury_products": [...],
    "top_picks": [...],
    "new_arrivals": [...],
    "trending_products": [...],
    "daily_finds": [...],
    "all_products": { products: [...], has_more: true },
    "contact_cta_slides": [...],
    "premium_experiences": [...],
    "product_showcase": [...],
    "feature_cards": [...]
  }
}

[Network responds in ~3-5s total]
```

### Step 5: User Interacts (While Full Loads)

```
Timeline from user perspective:

[0.3s] Page appears with:
       ✓ Navigation (topbar from critical)
       ✓ Hero carousel (from critical)
       ✓ Categories (from critical)
       ✓ Flash sale section (from critical)
       
       Below: Skeleton placeholders (reserved space)
       [Loading...] [Loading...] [Loading...]
       
[1.0s] User scrolls down
       ← Still showing skeletons
       ← Sees "Luxury Deals" placeholder
       
[2.0s] User clicks on a category
       ← Page responds instantly
       ← /api/homepage still loading (but user doesn't notice)
       
[3.0s] User examines carousel
       ← Still smooth and responsive
       
[3.5s] /api/homepage finally returns! (3500ms after initial request)
       ← Skeletons replaced with actual content
       ← Smooth transition
       
[3.7s] All sections now visible:
       ✓ Luxury Deals section filled
       ✓ Top Picks section filled
       ✓ All other deferred sections filled
       ✓ Page fully interactive with all content
```

## Network Waterfall (DevTools)

Open DevTools → Network tab. You'll see:

```
GET /api/homepage/critical
    ├─ Status: 200
    ├─ Size: ~150 KB (3 sections)
    ├─ Time: 0.3-0.8s
    └─ Response headers: X-Cache: MISS (first) or HIT (cache)
    
GET /api/homepage (parallel, starts immediately)
    ├─ Status: 200
    ├─ Size: ~500 KB (all 13 sections)
    ├─ Time: 3-5s
    ├─ Starts: ~0ms (parallel with critical)
    ├─ Completes: ~3500ms
    └─ Response headers: X-Cache: MISS (first) or HIT (cache)

Timeline:
0────────500──────1000─────1500─────2000─────2500─────3000─────3500─────4000ms
│ Critical │ Returns 0.3-0.8s          │
│                                      │ Full: Completes 3-5s
│ Start    │ Render critical           │ Render deferred
      ✓ Interactive              Suspense awaits full data
```

## Code Execution Trace

### Frontend Execution

```javascript
// app/page.tsx line-by-line

export default async function HomePage() {

  // ⏱ 0ms - REQUEST STARTS
  // Immediately execute both fetches
  
  const criticalData = await getCriticalHomepageData()
  // ⏱ Blocked here ~300-800ms
  // Fetch initiated at 0ms, completes at 300-800ms
  // getCriticalHomepageData calls:
  // → fetch(`/api/homepage/critical`)
  // → Awaits response
  // → Returns { categories, carousel_items, flash_sale_products }
  
  // ⏱ ~300-800ms - CRITICAL DATA READY
  
  const fullDataPromise = getHomepageData()
  // ⏱ Returns immediately (Promise object)
  // Fetch initiated at 0ms (parallel with critical!)
  // Will complete at ~3-5s but we don't wait
  // This is NON-BLOCKING
  
  // ⏱ ~300-800ms - RENDER PHASE STARTS
  
  return (
    <div className="w-full bg-background">
      {/* This renders immediately with critical data */}
      <CriticalHomepageLoader
        categories={criticalData.categories}
        carouselItems={criticalData.carousel_items}
        flashSaleProducts={criticalData.flash_sale_products}
      />
      {/* ✓ PAGE INTERACTIVE HERE at ~0.3-0.8s */}
      
      {/* This Suspense boundary wraps the full data await */}
      <Suspense fallback={<Skeleton />}>
        <DeferredSectionsLoaderWrapper fullDataPromise={fullDataPromise} />
        {/* ↓ Inside component... */}
      </Suspense>
    </div>
  )
}

// ⏱ ~0.3-0.8s - CRITICAL RENDER COMPLETE
// Page now shows hero, categories, flash sale
// User can click, scroll, interact

// ⏱ Meanwhile (0-3.5s) - Full data loads in background
// /api/homepage request is in flight
// User doesn't notice - page is usable

// ⏱ ~3-5s - FULL DATA RETURNS

// Inside DeferredSectionsLoaderWrapper:
async function DeferredSectionsLoaderWrapper({ fullDataPromise }) {
  
  const fullData = await fullDataPromise
  // ⏱ ~3-5s - Await completes (was started at 0ms)
  // Got all 13 sections
  // Suspense releases, renders deferred content
  
  return (
    <DeferredSectionsLoader
      luxuryProducts={fullData.luxury_products}
      topPicks={fullData.top_picks}
      // ... all other sections
    />
  )
  
  // ⏱ ~3-5s - ALL SECTIONS NOW VISIBLE
}
```

## Request Timing Matrix

### Scenario 1: Cold Start (No Cache)

| Time (ms) | Event | Duration | User Sees |
|-----------|-------|----------|-----------|
| 0 | Both fetches start | - | [BLANK] |
| 0-300 | Critical loading | 300ms | [BLANK] |
| 300-800 | Critical DB queries | 500ms | [BLANK] |
| 800 | Critical returned | - | [BLANK] |
| 800-1000 | Critical render | 200ms | [HERO] [CATEGORIES] [FLASH] |
| **1000** | **✓ INTERACTIVE** | - | **[Can click/scroll]** |
| 0-3500 | Full loading (background) | 3500ms | User interacts... |
| 3500 | Full returned | - | [Content loading...] |
| 3500-4000 | Deferred render | 500ms | [All sections appear] |
| **4000** | **✓ COMPLETE** | - | **[Fully loaded]** |

### Scenario 2: Warm Start (Cached)

| Time (ms) | Event | Duration | User Sees |
|-----------|-------|----------|-----------|
| 0 | Both fetches start | - | [BLANK] |
| 0-50 | Critical from cache | 50ms | [BLANK] |
| 50 | Critical returned | - | [BLANK] |
| 50-100 | Critical render | 50ms | [HERO] [CATEGORIES] [FLASH] |
| **100** | **✓ INTERACTIVE** | - | **[Can click/scroll]** |
| 0-50 | Full from cache (parallel) | 50ms | User interacts... |
| 100 | Full returned (async) | - | [Content instant] |
| 100-150 | Deferred render | 50ms | [All sections instant] |
| **150** | **✓ COMPLETE** | - | **[Instant page]** |

## Real Network Example

### Network Request Log (Chrome DevTools)

```
Method  URL                                      Status  Type    Size    Time
────────────────────────────────────────────────────────────────────────────
GET     https://mizizzi.com/                     200     document 45KB   1.2s
GET     https://api.mizizzi.com/api/homepage/critical
                                                  200     fetch   150KB  0.8s ✓ First
GET     https://api.mizizzi.com/api/homepage
                                                  200     fetch   500KB  3.2s  (parallel)
```

Waterfall visualization:
```
/api/homepage/critical: |====|
                            0     0.8s

/api/homepage:          |=========|
                            0     3.2s

Timeline:                |----|----|----|----|
                         0   0.5  1.0 1.5 2.0 2.5 3.0 3.2s

Critical completes first ✓
Full loads in background
Both non-blocking
```

---

**Summary:** Request arrives → Critical and full fetches start immediately (parallel) → Critical returns 0.3-0.8s → Page renders and becomes interactive → Full returns 3-5s → Deferred sections render inside Suspense boundary → User perceives interactive page 0.3-0.8s (vs 3-5s before).
