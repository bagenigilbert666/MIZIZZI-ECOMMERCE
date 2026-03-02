# Error Recovery Flow Diagram

## Before: Cascade Failure ❌

```
User Action (View Product)
        ↓
Inventory Request Fails
        ↓
No Retry Logic
        ↓
Error Thrown
        ↓
White Screen / Crash
        ↓
User Confused 😞
```

## After: Graceful Recovery ✅

```
User Action (View Product)
        ↓
Inventory Request Fails
        ↓
Detect Error Type (Network? Timeout? Auth?)
        ↓
Network/Timeout Error?
   ├─→ YES: Retry with Backoff
   │        (1000ms, then 2000ms)
   │        ↓
   │   Success? → Return Data ✓
   │        ↓
   │   Still Failed? → Use Fallback (Empty Inventory)
   │
   └─→ NO (Auth Error) → Throw Error
                        (Expected behavior)
        ↓
Empty State Shown
        ↓
User Understands 😊
```

---

## Error Classification

```
API Request
    ├── Network Error (No Backend)
    │   └── RETRY: Exponential Backoff ✓
    │
    ├── Timeout Error (Slow Backend)  
    │   └── RETRY: Try Again After 500ms ✓
    │
    ├── Request Aborted
    │   └── RETRY: Progressive Delay ✓
    │
    ├── Server Error (5xx)
    │   └── RETRY: Once with Backoff ✓
    │
    ├── Auth Error (401/403)
    │   └── NO RETRY: Redirect to Login ✗
    │
    └── Client Error (4xx - Bad Request)
        └── NO RETRY: Show Error ✗
```

---

## Component Recovery Strategy

### Inventory Service
```
getProductInventory(productId, variantId, retryCount=0)
├─ Success? → Return Data ✓
├─ Network Error & retryCount < 2?
│  └─ Wait 1s * 2^retryCount
│     └─ Retry recursively ↻
└─ Failed After Retries?
   └─ Return Empty Inventory {
        id: -1, stock_level: 0,
        available_quantity: 0,
        is_in_stock: false ...
      } ✓
```

### Review Service  
```
makeRequest<T>(endpoint, options, retryCount=0)
├─ Timeout (15s)
├─ Success? → Return Data ✓
├─ Server Error (5xx) & retryCount < 1?
│  └─ Wait 1s * 2^retryCount
│     └─ Retry recursively ↻
└─ Failed After Retries?
   └─ For GET: Return Empty Results {
        items: [], 
        pagination: { ... }
      } ✓
```

### Search Hook
```
fetchInitialData()
├─ Fetch Recent Searches (5s timeout)
│  └─ Fail? → Load From localStorage ✓
├─ Fetch Trending Products (5s timeout)
│  └─ Fail? → Set Empty Array ✓
└─ Fetch Categories (5s timeout)
   └─ Fail? → Set Empty Array ✓
```

### API GET Handler
```
api.get(url, config)
├─ Attempt 1
│  ├─ Success? → Return ✓
│  └─ Abort/Timeout? → Wait 500ms, Try Again
├─ Attempt 2
│  ├─ Success? → Return ✓
│  └─ Failed? → Throw Error ✗
└─ Max Attempts Reached? → Throw ✗
```

---

## Retry Backoff Example

### Inventory Service (Exponential)
```
1st Failure  → Wait 1000ms (2^0 = 1000)
    ↓
2nd Failure  → Wait 2000ms (2^1 = 2000) 
    ↓
3rd Attempt  → Return Fallback
```

### Review Service (Exponential)
```
1st Failure (5xx) → Wait 1000ms (2^0 = 1000)
    ↓
2nd Attempt → Try Once More
    ↓
3rd Failure → Return Empty Results { items: [] }
```

### Search Hook (Simple Timeout)
```
Each fetch: 5 second timeout
On failure: Use localStorage cache
On success: Update UI
```

### API GET (Progressive)
```
1st Failure (Abort)  → Wait 500ms (500 * 1)
    ↓
2nd Attempt → Try Again
    ↓
3rd Failure → Throw Error
```

---

## Monitoring & Debugging

### Console Logs
```
[v0] Getting inventory summary for product: 1
[v0] API GET request to /api/inventory/user/product/1
[v0] Error getting product inventory: {
  error: "Network Error",
  status: undefined,
  retryCount: 0,
  willRetry: true
}
[v0] Retrying inventory fetch after 1000ms...
[v0] API GET request to /api/inventory/user/product/1
[v0] ✅ API response from /api/inventory/user/product/1: 200
[v0] Final inventory summary: { ... }
```

### Event Listeners
```javascript
// Network error event
document.addEventListener('network-error', (e) => {
  console.log('Network error:', e.detail.message)
  console.log('Can retry?', e.detail.canRetry)
  console.log('Error count:', e.detail.errorCount)
})

// Auth error event
document.addEventListener('auth-error', (e) => {
  console.log('Auth failed:', e.detail.message)
  console.log('Status:', e.detail.status)
})
```

---

## Success Metrics

Before Fixes:
- ❌ 4 different error types crashing app
- ❌ No retry mechanism
- ❌ No fallback data
- ❌ Poor debugging info

After Fixes:
- ✅ All errors handled gracefully
- ✅ 2 retry attempts with backoff
- ✅ Empty data fallbacks
- ✅ `[v0]` logging for debugging
- ✅ Circuit breaker for repeated errors
- ✅ Better UX (no white screens)

