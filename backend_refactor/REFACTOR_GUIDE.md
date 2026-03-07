# Backend Refactoring Guide

This directory contains the corrected and refactored homepage batch API implementation that fixes all 7 identified issues.

## Files Included

1. **homepage_cache_key_builder.py**
   - Fixes Issue #1: Cache key collision
   - Generates dynamic cache keys based on ALL request parameters
   - Prevents different parameter combinations from returning wrong cached data

2. **aggregator.py**
   - Fixes Issues #2, #3, #4, #5
   - Now includes `all_products_page` parameter throughout the pipeline
   - Added missing sections: premium_experiences, product_showcase, contact_cta_slides, feature_cards
   - Returns structured metadata with `cache_hit`, `cache_key`, `partial_failures`, `sections_loaded`
   - Event loop management cleaned up internally (still works with Flask)
   - Includes backward compatibility wrapper `get_homepage_data()` for existing code

3. **homepage_routes.py**
   - Fixes Issues #4, #5, #6, #7
   - Uses aggregator's cache metadata to set accurate X-Cache headers
   - Proper event loop cleanup with try/finally
   - Consistent response structure (status + data + cache_metadata)
   - Parameter validation with safe integer parsing
   - Clear logging at each step
   - All parameters properly passed through to aggregator

4. **missing_section_loaders.py**
   - Fixes Issue #3: Missing sections
   - Placeholder implementations for new sections
   - Ready to be replaced with actual database queries
   - Maintains async/await pattern for parallel loading

## Installation Steps

### On Your Render Backend

1. **Backup current files**
   ```bash
   cd app/services/homepage
   cp -r . ../homepage_backup/
   ```

2. **Copy new files**
   ```bash
   # Copy cache key builder
   cp homepage_cache_key_builder.py app/utils/

   # Copy aggregator
   cp aggregator.py app/services/homepage/

   # Update routes
   cp homepage_routes.py app/routes/homepage/__init__.py

   # Add missing loaders to services
   cp get_homepage_premium_experiences.py app/services/homepage/
   cp get_homepage_product_showcase.py app/services/homepage/
   cp get_homepage_contact_cta.py app/services/homepage/
   cp get_homepage_feature_cards.py app/services/homepage/
   ```

3. **Update aggregator imports**
   - Edit `app/services/homepage/aggregator.py`
   - Import the new missing section loaders (see comments in aggregator)

4. **Update route registration**
   - Ensure homepage_routes blueprint is registered with app in `app.py` or equivalent
   - Should be: `app.register_blueprint(homepage_routes)`

5. **Restart backend**
   ```bash
   # Render will auto-restart if you push code
   # Or restart dyno manually
   ```

## Testing Changes

### Test cache key generation
```bash
# Same parameters should return same key
curl "http://localhost:5000/api/homepage?categories_limit=20&flash_sale_limit=20" -i

# Different parameters should return different key
curl "http://localhost:5000/api/homepage?categories_limit=25&flash_sale_limit=20" -i

# Check X-Cache-Key header matches expected pattern
```

### Test pagination
```bash
# Page 1
curl "http://localhost:5000/api/homepage?all_products_page=1"

# Page 2 - should use different cache key
curl "http://localhost:5000/api/homepage?all_products_page=2" -i

# Check X-Cache header shows MISS for page 2 (different cache key)
```

### Test cache headers
```bash
curl -i http://localhost:5000/api/homepage

# First request should show X-Cache: MISS
# Second request within 60s should show X-Cache: HIT
# X-Cache-Key should be present and consistent
```

### Test error handling
```bash
# If one section fails, others should still load
# Check response status: "success" | "partial_failure" | "error"
# Check cache_metadata.partial_failures for which sections failed
```

## Response Structure

### Success Response (status: "success")
```json
{
  "status": "success",
  "data": {
    "categories": [...],
    "carousel_items": [...],
    "flash_sale_products": [...],
    "luxury_products": [...],
    "new_arrivals": [...],
    "top_picks": [...],
    "trending_products": [...],
    "daily_finds": [...],
    "all_products": { "products": [...], "has_more": false, "total": 100, "page": 1 },
    "premium_experiences": [...],
    "product_showcase": [...],
    "contact_cta_slides": [...],
    "feature_cards": [...]
  },
  "cache_metadata": {
    "cache_hit": true,
    "cache_key": "mizizzi:homepage:cat:20:flash:20:lux:12:new:20:picks:20:trend:20:daily:20:all:12:page:1",
    "partial_failures": [],
    "sections_loaded": 13
  }
}
```

### Partial Failure Response (1+ section failed)
```json
{
  "status": "partial_failure",
  "data": {
    "categories": [...],
    "flash_sale_products": [],  // Empty fallback
    ...
  },
  "cache_metadata": {
    "cache_hit": false,
    "cache_key": "...",
    "partial_failures": ["flash_sale_products"],
    "sections_loaded": 12
  }
}
```

### Error Response (all sections failed)
```json
{
  "status": "error",
  "message": "Failed to load homepage data",
  "data": {
    "categories": [],
    "carousel_items": [],
    ...
  },
  "cache_metadata": {
    "cache_hit": false,
    "cache_key": "",
    "partial_failures": ["all sections"],
    "sections_loaded": 0
  }
}
```

## What Changed (Summary)

| Issue | Before | After |
|-------|--------|-------|
| Cache key collision | Generic `mizizzi:homepage:data` | Dynamic with all params |
| Missing page param | Collected but ignored | Passed through entire pipeline |
| Missing sections | Only 9 sections | All 13 sections included |
| X-Cache header | Read cache again, always wrong | Uses aggregator metadata |
| Event loop | Messy per-request setup | Clean try/finally handling |
| Response consistency | Inconsistent fallback | Structured status + metadata |
| Naming | Mixed snake_case/camelCase | Consistent throughout |

## Backward Compatibility

- Existing code calling `get_homepage_data()` still works (returns just the data dict)
- New code can call `get_homepage_data_with_metadata()` for cache tracking
- Response data structure unchanged - all sections have same schema

## Frontend Updates

No changes needed to `frontend/lib/server/get-homepage-data.ts` - it already:
- ✅ Uses new API_BASE_URL from environment variable
- ✅ Handles cache metadata in response
- ✅ Has proper error handling
- ✅ Uses React cache() wrapper

The frontend will automatically benefit from correct caching and better error handling.
