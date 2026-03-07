# Migration Guide: Homepage Batch API Refactoring

## Overview
This document guides developers through the homepage batch API refactoring from the old implementation to the new efficient and reliable system.

## What Changed

### For API Consumers (Frontend)
The API response structure has been **extended** but remains **backward compatible**:

**Old Response:**
```json
{
  "status": "success",
  "data": {
    "categories": [...],
    "carousel_items": [...],
    ...
  },
  "cache_key": "mizizzi:homepage:data"
}
```

**New Response:**
```json
{
  "status": "success",
  "data": {
    "categories": [...],
    "carousel_items": [...],
    "contact_cta_slides": [...],  // NEW FIELD
    ...
  },
  "meta": {                         // NEW SECTION
    "cache_hit": true|false,
    "cache_key": "mizizzi:homepage:cat_20:flash_20:lux_12:all_12:page_1",
    "partial_failures": []
  }
}
```

**Changes:**
- ✅ All existing fields are unchanged
- ✅ Added new `contact_cta_slides` section to data
- ✅ Added `meta` section with cache information
- ✅ Removed old `cache_key` from root (now in meta section)

### Query Parameters
All existing parameters work the same way:
- `categories_limit` (default: 20, range: 5-100)
- `flash_sale_limit` (default: 20, range: 5-100)
- `luxury_limit` (default: 12, range: 5-100)
- `all_products_limit` (default: 12, range: 5-100)
- `all_products_page` (default: 1, range: 1-1000) **← Now actually used for pagination**

### Response Headers
New helpful headers added:
- `X-Cache: HIT|MISS` - Whether response came from cache
- `X-Cache-Key` - The cache key used for this request
- `X-Partial-Failures` - Comma-separated list of failed sections (if any)

## Migration Path

### Immediate Actions (No Changes Needed)
Your existing frontend code will continue working:
- All old fields in `data` are still there
- All query parameters work the same
- No breaking changes

### Recommended Improvements
Implement these improvements to take advantage of new features:

1. **Use cache_hit for debugging:**
   ```javascript
   // JavaScript
   const response = await fetch('/api/homepage');
   const json = await response.json();
   
   if (json.meta.cache_hit) {
     console.log('Served from cache:', json.meta.cache_key);
   } else {
     console.log('Fresh data fetched');
   }
   ```

2. **Handle partial failures gracefully:**
   ```javascript
   if (json.meta.partial_failures.length > 0) {
     console.warn('Some sections failed:', json.meta.partial_failures);
     // Data will still have empty arrays for failed sections
   }
   ```

3. **Use pagination for all_products:**
   ```javascript
   // Old: All products weren't actually paginating
   // New: Pagination works correctly
   
   const page1 = await fetch('/api/homepage?all_products_page=1');
   const page2 = await fetch('/api/homepage?all_products_page=2');
   ```

4. **Display contact CTA slides:**
   ```javascript
   const { contact_cta_slides } = json.data;
   // Render your contact CTA section here
   ```

## Performance Improvements

### Cache Efficiency
- **Before:** One cache key for all parameter combinations → cache misses for different limits
- **After:** Unique cache keys per parameter combination → better cache hit rate

**Example:**
```
Request 1: ?categories_limit=5     → cache key: "...cat_5"
Request 2: ?categories_limit=100   → cache key: "...cat_100"
Request 3: ?categories_limit=5     → cache key: "...cat_5" (HIT from Request 1!)
```

### Event Loop Safety
- **Before:** Manual event loop management (potential issues under load)
- **After:** `asyncio.run()` which is production-safe and optimized

### Parameter Validation
- **Before:** Parameters validated inline in route
- **After:** Centralized validation in cache_utils (easier to test and maintain)

## Debugging Tips

### Check cache key generation
```python
from app.services.homepage.cache_utils import build_homepage_cache_key

# This is what gets generated for your request
key = build_homepage_cache_key(20, 20, 12, 12, 1)
print(key)  # Output: mizizzi:homepage:cat_20:flash_20:lux_12:all_12:page_1
```

### Monitor cache hits in production
```bash
# Use response headers to monitor cache performance
curl -i http://localhost:5000/api/homepage | grep "X-Cache"
```

### Check for partial failures
```javascript
// Monitor failed sections
if (response.meta.partial_failures.length > 0) {
  // Alert or log
  console.error('Failed sections:', response.meta.partial_failures);
}
```

## Rollback Plan (If Needed)

If issues arise, you can rollback by reverting these files:
1. `backend/app/routes/homepage/__init__.py`
2. `backend/app/services/homepage/aggregator.py`

Then restart the application. No data loss, no database changes.

## Testing Checklist

- [ ] Request homepage with defaults - verify contact_cta_slides present
- [ ] Request with different categories_limit - verify different cache keys
- [ ] Request page 2 of all_products - verify pagination works
- [ ] Verify X-Cache headers accurate (HIT on second request)
- [ ] Verify response includes meta section
- [ ] Monitor error logs for any section loader failures
- [ ] Load test to verify no event loop issues

## Questions?

Refer to:
- `backend/REFACTORING_SUMMARY.md` - Detailed technical changes
- `backend/app/services/homepage/cache_utils.py` - Cache key generation logic
- `backend/app/services/homepage/aggregator.py` - Aggregator implementation
- `backend/app/routes/homepage/__init__.py` - Route handler logic
