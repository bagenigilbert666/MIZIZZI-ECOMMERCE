# Homepage Architecture Diagram

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                            │
│                      (Browser → Frontend)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      page.tsx (Server)                          │
│                                                                 │
│  1. Call getHomepageData() - Single backend call               │
│     └─ Returns all 13 sections (backend parallel aggregation)  │
│                                                                 │
│  2. Split data strategically:                                  │
│     ├─ criticalData (4 sections)                               │
│     └─ deferredData (7 sections)                               │
│                                                                 │
│  3. Return JSX with phase split                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
      ┌──────────────────┐  ┌────────────────────────┐
      │    PHASE 1       │  │     PHASE 2            │
      │   CRITICAL       │  │    DEFERRED            │
      │ (Render-Blocking)│  │ (Progressive)          │
      └────────┬─────────┘  └────────────┬───────────┘
               │                        │
               ▼                        ▼
  ┌──────────────────────────┐ ┌─────────────────────────────┐
  │ CriticalHomepageLoader   │ │ <Suspense> Boundary         │
  │                          │ │ DeferredSectionsLoader      │
  │ 1. Carousel/Hero         │ │                             │
  │    - priority=critical   │ │ Each section wrapped in:    │
  │    - renders immediately │ │ <Suspense>                  │
  │                          │ │   <ErrorBoundary>           │
  │ 2. Categories            │ │     <Component />           │
  │    - priority=high       │ │   </ErrorBoundary>          │
  │    - cached (3-layer)    │ │ </Suspense>                 │
  │                          │ │                             │
  │ 3. Flash Sales           │ │ Sections:                   │
  │    - priority=high       │ │ - Luxury Deals              │
  │    - merchant featured   │ │ - Top Picks                 │
  │                          │ │ - New Arrivals              │
  │ 4. Topbar (nav)          │ │ - Trending                  │
  │    - no images           │ │ - Daily Finds               │
  │                          │ │ - All Products              │
  │ Result: ~1500-2000ms     │ │ - Brand Showcase            │
  │ to FCP + Interactive     │ │                             │
  │                          │ │ Result: Streams in over     │
  │                          │ │ ~2-5 seconds                │
  └──────────────────────────┘ └─────────────────────────────┘
               │                        │
               └────────────┬───────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   FINAL PAGE    │
                   │   All Sections  │
                   │ Fully Rendered  │
                   │                 │
                   │ Time: 5-6 secs  │
                   │ Usable: 2-3 sec │
                   └─────────────────┘
```

## Rendering Timeline

```
TIMELINE (Cold Start - No Cache):

0ms     ┐
        │ Load HTML
100ms   │
        ▼
┌───────────────────────────────────────────────┐
│ Fetch Backend Data                            │
│ (Flask aggregator + DB queries)               │
│ 3-5 seconds...                                │
└───────────────────────────────────────────────┘
        
3000ms  ├─ Critical sections render
        │  (Carousel, Categories, Flash Sale)
        │
1500ms  ├─ FIRST CONTENTFUL PAINT ✓
        │
2000ms  ├─ LARGEST CONTENTFUL PAINT ✓
        │
2500ms  ├─ Time to Interactive ✓
        │
        ▼ User can scroll, click, interact
        
3000ms  ├─ <Suspense> boundaries activate
        │  Skeleton placeholders appear
        │
        ├─ Deferred sections start rendering
        ├─ Dynamic imports load
        ├─ LuxuryDeals loads
        ├─ TopPicks loads
        ├─ NewArrivals loads
        │
5000ms  ├─ TrendingProducts loads
        │
6000ms  ├─ DailyFinds, AllProducts, Brand loaded
        │
        ▼ All sections complete
        
        USER PERCEPTION:
        ├─ "Page is ready" - 2-3 seconds
        ├─ "Everything loaded" - 5-6 seconds
        └─ Smooth, progressive, no jank
```

## Section Priority & Loading Order

```
ABOVE THE FOLD (Visible immediately):
┌─────────────────────────────────────┐
│ ⭐ TOPBAR (Navigation)              │ priority=none (no images)
│ ⭐ CAROUSEL (Hero Banner)           │ priority=critical
│ ⭐ CATEGORIES (Navigation Grid)     │ priority=high
│ ⭐ FLASH SALES (Main Promo)         │ priority=high
└─────────────────────────────────────┘
        │
        │ Render immediately (blocks initial load)
        │ All sections sync, no lazy loading
        │ Result: FCP + LCP in ~1.5-2.0s
        │
        ▼
┌─────────────────────────────────────┐
│ Page becomes interactive ~2s        │
│ User can scroll, click, navigate    │
└─────────────────────────────────────┘
        │
        │ Continue in background
        ▼
BELOW THE FOLD (Load progressively):
┌─────────────────────────────────────┐
│ ⏳ Luxury Deals                     │ priority=normal (lazy)
│ ⏳ Top Picks                        │ priority=normal (lazy)
│ ⏳ New Arrivals                     │ priority=normal (lazy)
│ ⏳ Trending Products                │ priority=normal (lazy)
│ ⏳ Daily Finds                      │ priority=normal (lazy)
│ ⏳ All Products (Infinite Scroll)   │ priority=normal (lazy)
│ ⏳ Brand Showcase                   │ priority=normal (lazy)
└─────────────────────────────────────┘
        │
        │ Load with <Suspense> boundaries
        │ Each with skeleton placeholder
        │ Each with error boundary
        │ Result: All loaded in ~5-6s
        │
        ▼
    Complete page
```

## Image Priority Scheduling

```
HERO BANNER IMAGE
┌──────────────────────────────────────┐
│ src="https://cdn.../carousel.jpg"    │
│ priority="critical"    ← Highest     │
│ width={1200}                         │
│ height={400}                         │
│ aspectRatio="banner"                 │
│ sizes="100vw"                        │
└──────────────────────────────────────┘
        ▼
    Loads ASAP, needed for LCP


CATEGORY ICONS
┌──────────────────────────────────────┐
│ src="https://cdn.../category.jpg"    │
│ priority="high"      ← Medium         │
│ width={100}                          │
│ height={100}                         │
│ aspectRatio="square"                 │
│ sizes="100px"                        │
└──────────────────────────────────────┘
        ▼
    Loads after critical, visible on scroll


PRODUCT THUMBNAILS
┌──────────────────────────────────────┐
│ src="https://cdn.../product.jpg"     │
│ priority="normal"    ← Low (lazy)    │
│ width={250}                          │
│ height={333}                         │
│ aspectRatio="product"                │
│ sizes="250px"                        │
│ loading="lazy"                       │
└──────────────────────────────────────┘
        ▼
    Lazy loads, requested only when needed
```

## Error Handling Flow

```
┌─────────────────────────────────────┐
│   Deferred Section Rendering        │
│   (e.g., Luxury Deals)              │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌─────────────────┐
        │  Try to render  │
        │  section        │
        └────┬────────────┘
             │
        ┌────┴──────────┐
        │               │
        ▼               ▼
    SUCCESS       ERROR
        │               │
        │               ▼
        │        ┌──────────────────────┐
        │        │  ErrorBoundary      │
        │        │  catches error      │
        │        └──────┬───────────────┘
        │               │
        │               ▼
        │        ┌──────────────────────┐
        │        │ Show error message   │
        │        │ with graceful UI     │
        │        └─────────────────────┘
        │               │
        │               │ Other sections
        │               │ continue loading
        │               │
        └───────────┬───┘
                    │
                    ▼
        ┌──────────────────────────┐
        │  Page functional         │
        │  Failed section hidden   │
        │  Others still visible    │
        └──────────────────────────┘


RESULT:
├─ One section fails → others unaffected
├─ User sees graceful error message
├─ Page remains functional
└─ Other sections continue to appear
```

## Cache Strategy (3-Layer)

```
CATEGORIES CACHE:
┌──────────────────────────────────────┐
│          LAYER 1: SessionStorage     │
│         (Per-browser-tab)            │
│                                      │
│  If in sessionStorage ────────────┐  │
│        YES → Use cached ──────┐   │  │
│        NO → Continue to Layer 2   │  │
└──────────────────────────────────┤─┘
                                   │
┌────────────────────────────────┐ │
│      LAYER 2: LocalStorage      │ │
│      (Persists across tabs)     │ │
│                                 │ │
│   If in localStorage ────────┐  │ │
│        YES → Use cached ─────┼──┘  │
│        NO → Continue to Layer 3   │
└────────────────────────────┬──────┘
                             │
┌─────────────────────────────┴──────┐
│     LAYER 3: Server/API Data       │
│     (Fresh from backend)           │
│                                    │
│  Fetch from getHomepageData()      │
│  ├─ Backend uses Redis caching     │
│  ├─ Returns fresh data             │
│  └─ Store in sessionStorage        │
└────────────────────────────────────┘


TIMELINE:
1. First visit → All 3 layers miss → Backend call
2. Refresh tab → Layer 1 hit (sessionStorage)
3. New tab (same domain) → Layer 2 hit (localStorage)
4. Next day → All layers miss → Fresh backend call
```

## Performance Impact Summary

```
BEFORE (Monolithic):
```bash
Load all 13 sections in parallel on backend
    ↓
Wait for slowest section to complete
    ↓
Render entire page at once
    ↓
Time to Interactive: 5-6 seconds
LCP: 4-5 seconds
```

AFTER (Two-Phase):
```bash
Phase 1: Load and render critical 4 sections
    ├─ FCP: ~1.5s ✓
    ├─ LCP: ~1.5-2.0s ✓
    └─ Interactive: ~2.0-2.5s ✓

Phase 2: Deferred sections stream in background
    ├─ Don't block page
    ├─ Skeletal placeholders while loading
    └─ All loaded: ~5-6s (same as before, but feels faster)

USER PERCEPTION: Page is ready in ~2s vs ~5-6s before
```

## Component Composition

```
page.tsx (Server)
    │
    ├─ Phase 1: CriticalHomepageLoader
    │   ├─ Carousel (component)
    │   ├─ CategoryGrid (component)
    │   ├─ FlashSales (component)
    │   └─ NetworkStatus (component)
    │
    └─ Phase 2: <Suspense>
        └─ DeferredSectionsLoader
            ├─ <Suspense> → LuxuryDeals (lazy import)
            ├─ <Suspense> → TopPicks (lazy import)
            ├─ <Suspense> → NewArrivals (lazy import)
            ├─ <Suspense> → TrendingNow (lazy import)
            ├─ <Suspense> → DailyFinds (lazy import)
            ├─ <Suspense> → ProductGrid (lazy import)
            └─ <Suspense> → BrandShowcase (lazy import)

All images use OptimizedImage component
All sections wrapped in error boundaries
```

---

**Visual guide to help understand the architecture. See documentation files for detailed explanations.**
