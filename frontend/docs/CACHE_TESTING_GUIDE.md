# Cache Testing Guide

## Quick Start - Test Cache in 2 Minutes

### Step 1: Open DevTools
1. Open your browser and navigate to the homepage
2. Press `F12` or `Ctrl+Shift+I` to open DevTools
3. Go to the **Console** tab

### Step 2: Run Cache Tests

**First page load (Cache Empty):**
```javascript
CacheTester.runAllTests()
```

**Expected output:**
```
[v0] sessionStorage test: NOT FOUND (0.15ms)
[v0] localStorage test: NOT FOUND (0.12ms)

--- CACHE TEST SUMMARY ---
Layer          Status              LoadTime
sessionStorage ✗ EMPTY             0.15ms
localStorage   ✗ EMPTY/EXPIRED     0.12ms

[v0] Overall Cache Status: ✗ MISS (API fetch)
```

### Step 3: Reload Page (Ctrl+R)

Run the test again:
```javascript
CacheTester.runAllTests()
```

**Expected output (Cache Hit):**
```
[v0] sessionStorage test: FOUND (0.05ms)
[v0] sessionStorage data: {data: Array(16), timestamp: 1234567890}

[v0] localStorage test: FOUND and VALID (0.08ms)
[v0] localStorage data: {data: Array(16), timestamp: 1234567890}

--- CACHE TEST SUMMARY ---
Layer          Status              LoadTime
sessionStorage ✓ CACHED            0.05ms
localStorage   ✓ CACHED            0.08ms

[v0] Overall Cache Status: ✓ HIT (instant load)
```

## Understanding the Output

### Layer 1: sessionStorage
- **Status**: `✓ CACHED` or `✗ EMPTY`
- **Load Time**: <1ms (almost instant)
- **When used**: Same browser session, page reloads
- **Duration**: Clears when browser tab/window closes

### Layer 2: localStorage
- **Status**: `✓ CACHED`, `✗ EMPTY`, or `✗ EXPIRED`
- **Load Time**: <5ms (very fast)
- **When used**: After closing browser, next day visits
- **Duration**: 24 hours (configured in hook)

### Server Fetch
- **Load Time**: 300-500ms (on first visit)
- **When used**: Cache miss (first visit or cache expired)
- **Benefit**: Data automatically cached in both layers

## Advanced Testing

### View Cache Statistics
```javascript
CacheTester.getStats()
```

**Output:**
```
sessionCacheSize: 8192  // bytes
localCacheSize: 8192    // bytes
sessionLoadTime: 0.05   // milliseconds
localLoadTime: 0.08     // milliseconds
cacheHit: true
hitSource: 'sessionStorage'
```

### Clear Cache (for testing fresh fetch)
```javascript
CacheTester.clearAllCache()
location.reload()
```

Then check cache status again:
```javascript
CacheTester.runAllTests()
```

## Real-World Testing Scenarios

### Scenario 1: Fresh User (No Cache)
1. **Action**: Clear cache and reload
   ```javascript
   CacheTester.clearAllCache()
   location.reload()
   ```
2. **Expected**: Cache MISS, API fetches fresh data
3. **Load time**: 300-500ms
4. **Console output**: `[v0] Cache MISS: Using fresh server data`

### Scenario 2: Same Session (sessionStorage Hit)
1. **Action**: Just reload the page (Ctrl+R)
2. **Expected**: Cache HIT from sessionStorage
3. **Load time**: <50ms
4. **Console output**: `[v0] Cache HIT: sessionStorage`

### Scenario 3: New Session (localStorage Hit)
1. **Action**: 
   - Close the browser completely
   - Reopen and navigate to homepage
2. **Expected**: Cache HIT from localStorage
3. **Load time**: <100ms
4. **Console output**: `[v0] Cache HIT: localStorage`

### Scenario 4: Expired Cache (>24 hours)
1. **Action**:
   - Wait 24+ hours (or manually set expiry time in localStorage)
   ```javascript
   localStorage.setItem('mizizzi_categories_cache_expiry', '0')
   location.reload()
   ```
2. **Expected**: Cache MISS, fresh data fetched
3. **Console output**: `[v0] Cache EXPIRED: localStorage cache expired, clearing`

## Performance Metrics to Monitor

### Key Metrics:
| Metric | Target | Status |
|--------|--------|--------|
| Session Cache Load | <50ms | ✓ |
| Local Cache Load | <100ms | ✓ |
| Server Fetch | <500ms | ✓ |
| Overall Hit Rate | >90% | Varies |

### Console Logs to Watch

**Good signs:**
```
[v0] Cache HIT: sessionStorage (0.03ms)
[v0] Cache HIT: localStorage (0.08ms)
[v0] Overall Cache Status: ✓ HIT (instant load)
```

**Areas needing improvement:**
```
[v0] Cache MISS: Using fresh server data
[v0] Cache EXPIRED: localStorage cache expired
[v0] Cache storage error: QuotaExceededError
```

## Network Tab Analysis

### In DevTools Network Tab:

**First page load (Cache Miss):**
- Request to `/api/categories` - **Duration: ~300-500ms**
- Categories appear as data is stored in cache

**Reload (Cache Hit):**
- NO API request to `/api/categories`
- Categories loaded instantly from browser cache

**Expected network savings:**
- Fresh users: 1 API call
- Repeat users: 0 API calls (99% reduction)

## Debugging Cache Issues

### Issue: Cache MISS even after reload
**Cause**: Browser storage disabled or quota exceeded
**Fix**:
1. Check if storage is enabled: `console.log(localStorage)`
2. Clear browser cache: DevTools → Application → Clear site data
3. Check for storage errors: Look for `[v0] Cache storage error` logs

### Issue: Categories not updating after server change
**Cause**: Cache is stale, needs manual refresh
**Fix**:
1. Clear cache: `CacheTester.clearAllCache()`
2. Reload: `location.reload()`
3. Or wait 24 hours for cache to expire

### Issue: High memory usage
**Cause**: Multiple cache entries taking up space
**Fix**:
1. Check cache size: `CacheTester.getStats()`
2. Clear if > 100KB: `CacheTester.clearAllCache()`
3. Monitor periodically

## Production Monitoring

### What to Watch:
1. **Cache hit rate** - Should be >90%
2. **Load times** - sessionStorage should be <50ms
3. **API calls** - Should drop to ~1 per hour
4. **User experience** - Categories appear instantly

### Expected Results After Implementation:
```
Before:  3-4 seconds, 1 API call per user
After:   <50ms, 1 API call per hour total
Impact:  98-99% faster, 99% fewer API calls
```

## Quick Reference Commands

```javascript
// Run all cache tests
CacheTester.runAllTests()

// Get detailed statistics
CacheTester.getStats()

// Clear all cache
CacheTester.clearAllCache()

// Test just sessionStorage
CacheTester.testSessionStorage()

// Test just localStorage
CacheTester.testLocalStorage()

// Monitor cache across reloads
CacheTester.startMonitoring()
```

## Success Criteria

✓ **Cache is working** when:
- First page load: Cache MISS, data fetched from server
- Reload same page: Cache HIT, <50ms load time
- Close/reopen browser: Cache HIT, <100ms load time
- Reload after 24h: Cache MISS, fresh data fetched

✓ **Performance improving** when:
- Load times drop from seconds to milliseconds
- Console shows consistent HIT messages
- Network tab shows fewer API calls
- Users report instant category load
