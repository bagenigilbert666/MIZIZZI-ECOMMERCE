# Homepage Batch API Refactoring Implementation Guide

## Overview

This guide explains the 7 fixes applied to the homepage batch API and how to implement them on your Render backend.

## The 7 Issues Fixed

### 1. ✅ Dynamic Cache Key (Was: Generic Static Key)

**Problem:** Cache key was too generic: `mizizzi:homepage:data`
- Different parameter combinations returned wrong cached data
- No way to cache different configurations

**Solution:** `cache_key_builder.py`
- Builds key from ALL parameters: `mizizzi:homepage:cat:20:flash:20:...`
- Each parameter combination gets unique cache entry
- Prevents collisions

**Deployment:**
```
1. Copy cache_key_builder.py to: app/utils/cache_key_builder.py
2. In aggregator_refactored.py, import it:
   from app.utils.cache_key_builder import build_homepage_cache_key
```

---

### 2. ✅ Missing `all_products_page` Parameter

**Problem:**
- Route collected `all_products_page` but never passed it through
- Aggregator didn't accept it
- `get_homepage_all_products` never received page number

**Solution:**
- Added `all_products_page` parameter to aggregator signature
- Passed it from route to aggregator to loader
- Now pagination works correctly

**Changes in aggregator_refactored.py:**
```python
async def get_homepage_data(
    ...
    all_products_page: int = 1,  # ← NEW
):
```

---

### 3. ✅ Missing Homepage Sections

**Problem:**
- Homepage needed 4 more sections but they weren't included:
  - `premium_experiences`
  - `product_showcase`
  - `contact_cta_slides`
  - `feature_cards`

**Solution:** `missing_section_loaders.py`
- Created 4 new maintainable section loaders
- Each in its own file for easy maintenance
- Isolated error handling (one failing section doesn't break others)

**Deployment:**
```
Create 4 files in app/services/homepage/:
1. get_homepage_premium_experiences.py
2. get_homepage_product_showcase.py
3. get_homepage_contact_cta_slides.py
4. get_homepage_feature_cards.py

Then update aggregator imports:
from .get_homepage_premium_experiences import get_homepage_premium_experiences
from .get_homepage_product_showcase import get_homepage_product_showcase
from .get_homepage_contact_cta_slides import get_homepage_contact_cta_slides
from .get_homepage_feature_cards import get_homepage_feature_cards
```

---

### 4. ✅ Inaccurate X-Cache Headers

**Problem:**
```python
# Old: reads cache AGAIN after aggregator already ran
response.headers['X-Cache'] = 'HIT' if product_cache and product_cache.get('mizizzi:homepage:data') else 'MISS'
```
- Re-read cache unnecessarily
- Used wrong static key (issue #1)
- May report wrong state

**Solution:** Aggregator returns cache metadata
```python
# Now aggregator returns:
{
    "data": {...},
    "meta": {
        "cache_hit": bool,      # ← Accurate
        "cache_key": str,        # ← Dynamic key from issue #1
        "partial_failures": []   # ← Error tracking
    }
}

# Route uses this:
cache_hit = cache_meta.get("cache_hit", False)
response.headers['X-Cache'] = 'HIT' if cache_hit else 'MISS'
```

---

### 5. ✅ Unsafe Event Loop Management

**Problem:**
```python
# Old: Creates/closes loop per request - messy
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
...
loop.close()
```

**Solution:** Clean try/finally pattern
```python
loop = None
try:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(...)
except Exception as e:
    ...
finally:
    if loop:
        loop.close()  # ← Always cleanup
```

---

### 6. ✅ Inconsistent Response Shapes

**Problem:**
- Success and error responses had different structures
- Frontend couldn't parse errors reliably

**Solution:** Consistent response contract
```python
# Success:
{
    "status": "success",
    "data": {...},
    "meta": {...}
}

# Partial failure:
{
    "status": "partial",
    "data": {...},
    "meta": {"partial_failures": [...]}
}

# Error:
{
    "status": "error",
    "data": {...fallback...},
    "meta": {...}
}
```

---

### 7. ✅ Naming Consistency

**Problem:** Mixed naming conventions (camelCase vs snake_case)

**Solution:** Consistent snake_case throughout
- Response keys: `all_products`, `flash_sale_products`, `new_arrivals`
- Parameters: `categories_limit`, `flash_sale_limit`, `all_products_page`
- Metadata: `cache_hit`, `cache_key`, `partial_failures`

---

## Implementation Checklist

### Step 1: Backup Current Code
```bash
# On your Render backend, backup current files:
cp app/routes/homepage/__init__.py app/routes/homepage/__init__.py.backup
cp app/services/homepage/aggregator.py app/services/homepage/aggregator.py.backup
```

### Step 2: Deploy Cache Key Builder
```
File: app/utils/cache_key_builder.py
Content: From cache_key_builder.py in this package
```

### Step 3: Deploy New Section Loaders
```
Create 4 files in app/services/homepage/:
- get_homepage_premium_experiences.py
- get_homepage_product_showcase.py
- get_homepage_contact_cta_slides.py
- get_homepage_feature_cards.py

Copy content from missing_section_loaders.py (split into 4 files)
```

### Step 4: Deploy Refactored Aggregator
```
File: app/services/homepage/aggregator.py
Content: From aggregator_refactored.py in this package

Update imports to include new section loaders
```

### Step 5: Deploy Refactored Route
```
File: app/routes/homepage/__init__.py
Content: From homepage_routes_refactored.py in this package
```

### Step 6: Test Deployment

**Test 1: Basic request**
```bash
curl -X GET 'http://localhost:5000/api/homepage' \
  -H 'Content-Type: application/json'
```

**Test 2: With parameters**
```bash
curl -X GET 'http://localhost:5000/api/homepage?categories_limit=10&all_products_page=2' \
  -H 'Content-Type: application/json'
```

**Test 3: Verify cache headers**
```bash
curl -i -X GET 'http://localhost:5000/api/homepage'
# Should show: X-Cache: MISS (first request)
# Then: X-Cache: HIT (subsequent request)
```

**Test 4: Verify response structure**
```bash
curl -X GET 'http://localhost:5000/api/homepage' 2>/dev/null | jq '.'
# Should have: status, data, meta
# data should have new sections: premium_experiences, product_showcase, etc.
```

### Step 7: Verify Frontend Works
- Homepage should display all sections
- Cache headers should show HIT/MISS correctly
- Pagination should work (all_products_page parameter)

## Database Indexing Preserved

All existing database indexes remain unchanged. The refactoring only affects:
- Cache key generation
- Response structure
- Parameter passing
- Error isolation

No schema changes required.

## Rollback Plan

If anything breaks:
```bash
# Restore backups
cp app/routes/homepage/__init__.py.backup app/routes/homepage/__init__.py
cp app/services/homepage/aggregator.py.backup app/services/homepage/aggregator.py

# Remove new files
rm app/services/homepage/get_homepage_premium_experiences.py
rm app/services/homepage/get_homepage_product_showcase.py
rm app/services/homepage/get_homepage_contact_cta_slides.py
rm app/services/homepage/get_homepage_feature_cards.py
rm app/utils/cache_key_builder.py

# Restart Flask
```

## Questions?

If any loader placeholder needs database query implementation, adjust the commented example code in `missing_section_loaders.py` based on your actual database models.

All fixes maintain backward compatibility with existing code.
