# Quick Test Guide - API Error Recovery

## What Was Fixed

✅ **Inventory Service** - Now retries failed requests with exponential backoff  
✅ **Review Service** - Added timeout + retry logic for failed fetches  
✅ **Search Hook** - Gracefully falls back to cached data  
✅ **API Layer** - GET requests now retry on abort/timeout  

---

## How to Test

### 1. Test Inventory Retry Logic
```javascript
// In browser console on product detail page:
await inventoryService.getProductInventory(1)
// Should either return data or empty fallback
```

### 2. Test Review Service Timeout
```javascript
// If backend is slow/unavailable:
// Reviews should show empty state instead of error
```

### 3. Test Search Fallback
```javascript
// Stop backend, go to search page
// Should show local recent searches instead of error
```

### 4. Monitor Console Logs
```
[v0] Getting inventory summary for product: 1
[v0] API GET request to /api/inventory/user/product/1
[v0] GET request aborted, retrying in 500ms...
[v0] Final inventory summary: {...}
```

---

## Error Message Reference

### Before (Crashes)
- ❌ "Failed to get product inventory"
- ❌ "Failed to fetch"
- ❌ "Request aborted"

### After (Graceful Recovery)
- ✅ "Backend unavailable, returning empty inventory fallback"
- ✅ "Failed to fetch recent searches (using local cache)"
- ✅ "GET request aborted, retrying in 500ms..."
- ✅ Returns empty data instead of throwing

---

## Files Modified

1. `frontend/services/inventory-service.ts` - Added retry logic
2. `frontend/services/review-service.ts` - Added timeout + retry
3. `frontend/hooks/use-search.ts` - Added timeout + graceful fallback
4. `frontend/lib/api.ts` - Added GET request retry wrapper (lines 1686-1713)

---

## Key Features

🔄 **Exponential Backoff**: 500ms → 1000ms between retries  
⏱️ **Timeout Protection**: 5-15 second limits prevent hanging  
📦 **Smart Fallbacks**: Empty data instead of errors  
📝 **Better Logging**: `[v0]` prefix shows retry attempts  
🎯 **Targeted Retries**: Only retry network/timeout errors, not auth errors  

---

## Next Steps

If issues persist after these changes:

1. **Check Backend Status**
   ```bash
   curl https://mizizzi-ecommerce-1.onrender.com/api/health
   ```

2. **Check Network Connection**
   - Open DevTools → Network tab
   - Look for 5xx errors or failed requests

3. **Review Logs in Console**
   - Filter by `[v0]` for v0 debug logs
   - Look for error type: abort, timeout, network, auth

4. **Check Environment Variables**
   ```bash
   # In Vercel dashboard or .env.local
   NEXT_PUBLIC_BACKEND_URL=https://mizizzi-ecommerce-1.onrender.com
   ```

---

## Monitoring

The app now emits better error events. To listen:

```javascript
// Listen for network errors
document.addEventListener("network-error", (e) => {
  console.log("Network error:", e.detail)
  console.log("Can retry?", e.detail.canRetry)
})

// Listen for auth errors
document.addEventListener("auth-error", (e) => {
  console.log("Auth error:", e.detail)
})
```

