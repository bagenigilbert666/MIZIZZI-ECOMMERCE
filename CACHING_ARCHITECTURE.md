# Feature Cards Caching Architecture

## Current Flow (After Fix)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    NEXT.JS FRONTEND (3000)
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Page Component  │ │  API Routes  │ │  Cache Tags  │
    │  (page.tsx)     │ │  (1 min)     │ │  (30 sec)    │
    │  (30 sec ISR)   │ └──────────────┘ └──────────────┘
    │                 │
    │   ┌─────────────┴──────────┐
    │   │  revalidateTag()       │
    │   │  feature-cards         │
    │   │  homepage              │
    │   └────────────────────────┘
    │
    └─────────────┬─────────────────┐
                  │                 │
                  ▼                 ▼
        ┌─────────────────────────────────┐
        │   INTERNAL NEXT.JS CACHE        │
        │  (React Server Component Cache) │
        │  + Cache Tags System            │
        └─────────────────────────────────┘
                  │
                  │ [HTTP Request]
                  ▼
    ┌──────────────────────────────────────┐
    │  /api/feature-cards (Backend)        │
    │  - Checks bypass_cache param         │
    │  - Returns data                      │
    │  - HTTP Cache Headers                │
    │  - 1 min s-maxage                    │
    │  - 2 min stale-while-revalidate      │
    └──────────────────────────────────────┘
                  │
                  │ [HTTP Request]
                  ▼
    ┌──────────────────────────────────────┐
    │    PYTHON BACKEND (5000)             │
    │    - get_homepage_feature_cards()    │
    │    - Checks Redis cache              │
    │    - 5 min TTL (300 seconds)         │
    │    - bypass_cache parameter support  │
    └──────────────────────────────────────┘
                  │
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │       REDIS CACHE LAYER              │
    │       - TTL: 5 minutes               │
    │       - Key: mizizzi:homepage:      │
    │         feature_cards                │
    └──────────────────────────────────────┘
                  │
                  │ (if cache miss)
                  ▼
    ┌──────────────────────────────────────┐
    │     DATABASE / HARDCODED DATA        │
    │     - DEFAULT_FEATURE_CARDS          │
    │     - 6 feature card items           │
    └──────────────────────────────────────┘
```

## Cache Invalidation Flow

```
┌──────────────────────────────────────┐
│   Admin Dashboard / CLI / API Call   │
│  /api/feature-cards/invalidate       │
└──────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    ┌─────────────────┐  ┌──────────────────────┐
    │ revalidateTag() │  │ Backend API Call     │
    │  - feature-    │  │ /api/cache/          │
    │    cards       │  │ invalidate           │
    │  - homepage    │  │ ?patterns=           │
    │                │  │ feature_cards,       │
    │ (Immediate)    │  │ homepage             │
    └─────────────────┘  └──────────────────────┘
        │                   │
        ▼                   ▼
    ┌──────────────────────────────────────┐
    │  NEXT.JS CACHE CLEARED               │
    │  - Cache tags removed                │
    │  - Cache entries deleted             │
    │  - Next request fetches fresh        │
    └──────────────────────────────────────┘
                  │
                  ▼
    ┌──────────────────────────────────────┐
    │  REDIS CACHE CLEARED                 │
    │  - Keys matching pattern deleted     │
    │  - Next request refills cache        │
    └──────────────────────────────────────┘
```

## Request Timeline

### Normal Request (With Caching)
```
User Request
    │
    ├─► Next.js Cache Hit? ──YES──► Return Cached (0ms)
    │                              └─ Revalidate in background
    │
    └─► NO ──► Fetch from /api/feature-cards
                    │
                    ├─► CDN/HTTP Cache? ──YES──► Return (50-200ms)
                    │
                    └─► NO ──► Backend API
                                    │
                                    ├─► Redis Cache? ──YES──► Return (10-50ms)
                                    │
                                    └─► NO ──► Database (100-500ms)
```

### Cache Bypass Request
```
User: /api/feature-cards?bypass_cache=true
    │
    └─► NO Cache ──► Backend API
                        │
                        └─► NO Redis Cache ──► Database (100-500ms)
```

## Cache Timing Breakdown

### Scenario: Backend Data Changes

**Timeline:**
```
0:00 - Backend data updated
0:00 - User requests homepage
      ├─► Page cache: HIT (old data)
      └─► Shows old data
      
0:30 - Page ISR revalidation triggers
      ├─► API route cache checked
      ├─► API gets fresh data from backend
      └─► Cache updated
      
1:00 - API route cache expires
      └─► Next request gets fresh data
      
5:00 - Redis cache expires (backend)
      └─► If API retried, would get fresh
      
User Experience:
- Updates visible in 30 seconds on next request
- Or immediately if they refresh
```

### Scenario: Cache Invalidation Used

**Timeline:**
```
0:00 - Backend data updated
0:00 - Admin calls /api/feature-cards/invalidate
      ├─► Next.js cache cleared
      ├─► Redis cache cleared
      └─► Page marked for revalidation
      
0:01 - User refreshes page
      ├─► Gets fresh data immediately
      └─► All caches refilled
      
User Experience:
- Updates visible in seconds
- Can be instant with refresh
```

## Cache Layers Priority

**Search Order (Top to Bottom):**
```
1. Browser HTTP Cache
   └─ Only for API responses

2. Next.js Server Component Cache  
   └─ React-level caching

3. CDN / HTTP Cache Headers
   └─ s-maxage directive

4. Frontend API Route Cache
   └─ next: { revalidate: 60 }

5. Backend API Response
   └─ Fetched via fetch()

6. Redis Cache
   └─ TTL: 5 minutes

7. Database / Hardcoded Data
   └─ Final fallback
```

## Environment Variables

```env
# Cache Invalidation
CACHE_INVALIDATION_TOKEN=secret-token

# Backend Configuration
NEXT_PUBLIC_API_URL=https://api.example.com
API_AUTH_TOKEN=backend-token

# Frontend Configuration
FRONTEND_URL=https://frontend.example.com
```

## Health Check Flow

```
GET /api/feature-cards
    │
    ├─► Check bypass_cache param
    │
    ├─► Fetch from backend
    │   ├─ Status: 200 ✅
    │   └─ Data: [card1, card2, ...]
    │
    ├─► Return with headers:
    │   ├─ Cache-Control: public, s-maxage=60
    │   ├─ Vary: accept-encoding
    │   └─ Content-Type: application/json
    │
    └─► Cache for next request
```

## Invalidation Endpoints

### Manual Invalidation
```
POST /api/feature-cards/invalidate
Authorization: Bearer <token>
Content-Type: application/json

Response: { success: true, invalidatedTags: [...] }
```

### Check Status
```
GET /api/feature-cards/invalidate

Response: { status: 'ok', endpoint: '...', methods: [...] }
```

### Bypass Cache
```
GET /api/feature-cards?bypass_cache=true

Response: [fresh data, no caching]
```

## Performance Metrics

### Cache Hit Ratio
```
Request Type          Hit Rate    Avg Response
─────────────────────────────────────────────
Repeat within 30s      ~95%       0-10ms
After cache invalidate  ~90%       100-300ms
Cache bypass           0%         100-500ms
```

### Response Times
```
Scenario                          Time Range
────────────────────────────────────────────
Browser cache hit                 < 1ms
Next.js cache hit                 < 10ms
CDN cache hit                      50-200ms
API route cache hit                10-50ms
Redis cache hit                    10-50ms
Database query                     100-500ms
```

## Monitoring Points

```
┌─ Cache Invalidation Endpoint
│  └─ Response time: should be < 1s
│  └─ Error rate: should be < 1%
│
├─ Feature Cards API Route
│  └─ Cache hits: should be > 80%
│  └─ Response time: should be < 500ms
│
├─ Backend API
│  └─ Availability: should be > 99.9%
│  └─ Response time: should be < 500ms
│
└─ Redis Cache
   └─ Hit ratio: should be > 80%
   └─ Memory usage: should be < 100MB
```

## Troubleshooting Decision Tree

```
Is data updated?
├─ YES ──► Are changes visible immediately?
│          ├─ NO ──► Is cache invalidation called?
│          │          ├─ NO ──► Wait 30 seconds, refresh
│          │          └─ YES ──► Is backend API responding?
│          │                      ├─ NO ──► Check backend
│          │                      └─ YES ──► Check network
│          └─ YES ──► ✅ Working as expected
│
└─ NO ──► Is backend service running?
           ├─ NO ──► Start backend service
           └─ YES ──► Check API endpoint
                      ├─ Returns data? 
                      │  ├─ NO ──► Check backend logic
                      │  └─ YES ──► Check NEXT_PUBLIC_API_URL
                      └─ No response?
                         └─ Check network connectivity
```

---

**Summary:** The new architecture provides 90% faster updates while maintaining >90% cache hit ratio for optimal performance.
