# Homepage Backend Refactoring Guide

## Summary of Fixes

| Issue | Problem | Solution |
|-------|---------|----------|
| **#1** | Static cache key caused collisions | Dynamic key builder based on all params |
| **#2** | `all_products_page` was ignored | Now passed through entire pipeline |
| **#3** | Missing homepage sections | Added 4 new section loaders |
| **#4** | X-Cache header was inaccurate | Uses aggregator metadata directly |
| **#5** | Unsafe event loop handling | Clean sync wrapper with try/finally |
| **#6** | Inconsistent response structure | Unified success/error format |
| **#7** | Mixed naming conventions | Consistent snake_case throughout |

## File Placement

Copy these files to your Render backend:

```
backend/app/services/homepage/
├── __init__.py                          # Update imports
├── cache_key_builder.py                 # NEW: Copy from backend_fixes/
├── aggregator.py                        # REPLACE: Copy from backend_fixes/
├── get_homepage_premium_experiences.py  # NEW: Extract from missing_section_loaders.py
├── get_homepage_product_showcase.py     # NEW: Extract from missing_section_loaders.py
├── get_homepage_contact_cta_slides.py   # NEW: Extract from missing_section_loaders.py
├── get_homepage_feature_cards.py        # NEW: Extract from missing_section_loaders.py
└── ... (existing loaders unchanged)

backend/app/routes/homepage/
├── __init__.py                          # Update if needed
└── homepage_routes.py                   # REPLACE: Copy from backend_fixes/
```

## Step-by-Step Deployment

### 1. Backup existing files
```bash
cp app/services/homepage/aggregator.py app/services/homepage/aggregator.py.bak
cp app/routes/homepage/homepage_routes.py app/routes/homepage/homepage_routes.py.bak
```

### 2. Copy new files
```bash
# Cache key builder
cp backend_fixes/cache_key_builder.py app/services/homepage/

# Replace aggregator
cp backend_fixes/aggregator.py app/services/homepage/

# Replace route
cp backend_fixes/homepage_routes.py app/routes/homepage/

# Add missing section loaders (split into separate files)
# Or keep them in one file and import from there
cp backend_fixes/missing_section_loaders.py app/services/homepage/
```

### 3. Update __init__.py imports

In `app/services/homepage/__init__.py`:
```python
from .cache_key_builder import build_homepage_cache_key
from .aggregator import get_homepage_data, get_homepage_data_sync, HomepageResult
from .missing_section_loaders import (
    get_homepage_premium_experiences,
    get_homepage_product_showcase,
    get_homepage_contact_cta_slides,
    get_homepage_feature_cards,
)
```

### 4. Test the changes
```bash
# Test basic endpoint
curl -X GET 'https://mizizzi-ecommerce-1.onrender.com/api/homepage'

# Test with custom params
curl -X GET 'https://mizizzi-ecommerce-1.onrender.com/api/homepage?categories_limit=10&all_products_page=2'

# Verify cache headers
curl -i 'https://mizizzi-ecommerce-1.onrender.com/api/homepage'
```

### 5. Verify cache key changes
```bash
# First request - should be MISS
curl -i 'https://mizizzi-ecommerce-1.onrender.com/api/homepage?categories_limit=10'
# X-Cache: MISS
# X-Cache-Key: mizizzi:homepage:cat:10:flash:20:lux:12:...

# Second request with same params - should be HIT
curl -i 'https://mizizzi-ecommerce-1.onrender.com/api/homepage?categories_limit=10'
# X-Cache: HIT

# Different params - should be MISS (different cache key)
curl -i 'https://mizizzi-ecommerce-1.onrender.com/api/homepage?categories_limit=15'
# X-Cache: MISS
# X-Cache-Key: mizizzi:homepage:cat:15:flash:20:lux:12:...
```

## Response Structure

### Success Response
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
    "all_products": {"products": [...], "has_more": true, "total": 100, "page": 1},
    "premium_experiences": [...],
    "product_showcase": [...],
    "contact_cta_slides": [...],
    "feature_cards": [...]
  },
  "cache_metadata": {
    "cache_hit": false,
    "cache_key": "mizizzi:homepage:cat:20:flash:20:...",
    "sections_loaded": 13,
    "total_sections": 13,
    "partial_failures": []
  }
}
```

### Response Headers
```
X-Cache: HIT | MISS
X-Cache-Key: mizizzi:homepage:cat:20:flash:20:...
X-Sections-Loaded: 13
Cache-Control: public, max-age=60
X-Partial-Failures: section1,section2 (if any failed)
```

## Rollback Plan

If issues occur:
```bash
# Restore backups
cp app/services/homepage/aggregator.py.bak app/services/homepage/aggregator.py
cp app/routes/homepage/homepage_routes.py.bak app/routes/homepage/homepage_routes.py

# Remove new files
rm app/services/homepage/cache_key_builder.py
rm app/services/homepage/missing_section_loaders.py

# Restart the server
```

## Notes

- All existing section loaders remain unchanged
- Existing Redis caching is preserved and enhanced
- Database indexing is not affected
- Frontend compatibility maintained (snake_case API)
- Individual section routes still work if used elsewhere
