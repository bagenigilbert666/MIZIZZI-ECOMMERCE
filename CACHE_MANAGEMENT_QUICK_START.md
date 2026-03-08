# Cache Management - Quick Start Guide

## 5-Minute Setup

### Backend (Flask)

1. **Register the cache management blueprint** in your Flask app initialization:

```python
# In app/__init__.py or wherever you initialize Flask
from app.routes.admin.cache_management import init_cache_management_routes

def create_app():
    app = Flask(__name__)
    
    # ... other initialization ...
    
    # Register cache management routes
    init_cache_management_routes(app)
    
    return app
```

2. **Create the audit log table** (if using database logging):

```bash
# Option 1: Using Alembic migrations
alembic revision --autogenerate -m "Add cache invalidation logs table"
alembic upgrade head

# Option 2: SQL directly
# See CACHE_MANAGEMENT_INTEGRATION_GUIDE.md for SQL
```

3. **Verify Redis is configured**:

```python
# In app/configuration/extensions.py
from redis import Redis

redis_cache = Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=os.getenv('REDIS_PORT', 6379),
    db=0,
    decode_responses=True
)
```

### Frontend

1. **Add Cache Management link to your admin dashboard** (already done - check `/admin/cache-management`)

2. **Integrate with your admin components**:

```typescript
// In your product create/update component
import { useAutoInvalidateCache } from "@/lib/utils/auto-invalidate-cache"

export function ProductForm({ productId }) {
  const { invalidateAfterAction } = useAutoInvalidateCache()
  
  const handleSubmit = async (formData) => {
    try {
      const response = await fetch(
        productId ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: productId ? "PATCH" : "POST",
          body: JSON.stringify(formData),
        }
      )

      if (response.ok) {
        // Clear caches after successful save
        const operation = productId ? "update" : "create"
        await invalidateAfterAction("products", operation)
        
        // Refresh UI
        mutate("/api/admin/products")
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  return <form onSubmit={(e) => {
    e.preventDefault()
    handleSubmit(new FormData(e.target))
  }}>
    {/* form fields */}
  </form>
}
```

3. **Test it works**:
   - Navigate to `/admin/cache-management`
   - Should see "Connected" status
   - Click "Quick Actions" to test manual invalidation

## Cache Groups Quick Reference

| Group | Affected Resources | When to Clear |
|-------|-------------------|---------------|
| **Critical** | Carousel, Categories, Feature Cards, Top Bar | When homepage navigation changes |
| **Deferred** | Flash Sales, Premium Experiences, Product Showcase, Brands | When promotional content changes |
| **Homepage** | All sections, theme, inventory | When any product/content changes |

## Common Integration Patterns

### Pattern 1: Create Operation

```typescript
async function createProduct(data) {
  const response = await api.post("/products", data)
  if (response.ok) {
    await invalidateAfterAction("products", "create")
  }
}
```

### Pattern 2: Update Operation

```typescript
async function updateCategory(id, data) {
  const response = await api.put(`/categories/${id}`, data)
  if (response.ok) {
    await invalidateAfterAction("categories", "update")
  }
}
```

### Pattern 3: Delete Operation

```typescript
async function deleteCarousel(id) {
  const response = await api.delete(`/carousel/${id}`)
  if (response.ok) {
    await invalidateAfterAction("carousel", "delete")
  }
}
```

### Pattern 4: Batch Operations

```typescript
import { batchInvalidateCache } from "@/lib/utils/auto-invalidate-cache"

async function bulkUpdateProducts(ids, updates) {
  const response = await api.post("/products/bulk", { ids, updates })
  if (response.ok) {
    await batchInvalidateCache([
      { resource: "products", operation: "update" },
      { resource: "inventory", operation: "update" }
    ])
  }
}
```

## Testing the Setup

### Test 1: Check Flask Backend
```bash
# Terminal
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:5000/api/admin/cache/status

# Should return:
# {
#   "connected": true,
#   "memory_usage": 1024000,
#   "keys_count": 5432,
#   "last_updated": "2025-03-08T10:30:00Z",
#   ...
# }
```

### Test 2: Check Dashboard
- Open browser to `http://localhost:3000/admin/cache-management`
- Should show cache status card with "Connected" badge
- Should show cache groups and recent history

### Test 3: Manual Cache Clear
1. Go to `/admin/cache-management`
2. Click "Clear Critical" button
3. Confirm dialog
4. Should see success message
5. Check history table - new entry should appear

### Test 4: Auto-Invalidation
1. Create/update a product through your admin
2. Open `/admin/cache-management`
3. Check "Invalidation History" table
4. Should see new entry with timestamp and affected caches

## Troubleshooting

### "Cache service unavailable"
```
Error: Cache management service is unavailable
Solution: Check Flask backend is running and NEXT_PUBLIC_API_URL is correct
```

### "Redis connection failed"
```
Error: Failed to connect to Redis
Solution: 
1. Check Redis is running: redis-cli ping
2. Verify REDIS_HOST and REDIS_PORT in Flask config
3. Check firewall/network access
```

### "Rate limit exceeded"
```
Error: Rate limit exceeded. Max 10 requests per 60 seconds
Solution: Wait 60 seconds before next cache invalidation attempt
```

### "Authorization failed"
```
Error: Admin check failed or Unauthorized
Solution: 
1. Check JWT token is valid
2. Verify user has admin role
3. Check token is sent with Bearer prefix
```

### Cache not clearing
```
Error: Cache cleared but site still shows old content
Solution:
1. Check Redis key patterns match configured patterns
2. Verify Redis SCAN is working: redis-cli SCAN 0 MATCH "mizizzi:*"
3. Check Cache groups are correctly mapped to resources
4. Try "Rebuild Caches" from Danger Zone
```

## Advanced Usage

### Custom Cache Groups

Add new resource to cache mapping:

```typescript
// frontend/types/cache-management.ts
CACHE_INVALIDATION_MAP["my_custom_resource:create"] = [CacheGroupType.HOMEPAGE]
CACHE_INVALIDATION_MAP["my_custom_resource:update"] = [CacheGroupType.HOMEPAGE]
CACHE_INVALIDATION_MAP["my_custom_resource:delete"] = [CacheGroupType.HOMEPAGE]
```

### Add New Cache Group

```python
# backend/app/config/cache_groups.py
CACHE_GROUPS["my_group"] = {
    "name": "My Custom Caches",
    "description": "Custom resource caches",
    "patterns": ["mizizzi:my_resource:*"]
}
```

### Silent Invalidation

Don't show toast notifications:

```typescript
// No toast feedback
await invalidateAfterAction("products", "update", true)
```

## Performance Tips

1. **Use Batch Operations** for bulk changes
2. **Let Auto-Invalidation Run** - don't manually clear unless needed
3. **Monitor Audit Log** - check history table regularly
4. **Set Auto-Refresh** - dashboard refreshes every 30 seconds
5. **Check Memory Usage** - from cache status card

## What's Next?

1. **Integrate with all admin modules** - See all resources in Quick Actions
2. **Set up monitoring alerts** - Log failed invalidations to sentry
3. **Configure backups** - Backup Redis periodically
4. **Document custom caches** - Add to CACHE_GROUPS config
5. **Train team** - Show admin dashboard to team members

## Files to Know

| File | Purpose |
|------|---------|
| `/admin/cache-management` | Main dashboard |
| `/frontend/types/cache-management.ts` | Type definitions |
| `/frontend/lib/utils/cache-invalidation-map.ts` | Cache mappings |
| `/frontend/lib/utils/auto-invalidate-cache.ts` | Auto-invalidation hook |
| `/backend/app/routes/admin/cache_management.py` | Flask endpoints |
| `/backend/app/config/cache_groups.py` | Cache group configs |

## Getting Help

1. Check `/CACHE_MANAGEMENT_INTEGRATION_GUIDE.md` for detailed docs
2. Look at `/frontend/app/admin/cache-management/page.tsx` for complete example
3. Review Flask error logs: `flask app logger`
4. Check browser console for frontend errors: F12 → Console
5. Verify Redis: `redis-cli info stats`

## Done!

You should now have:
- ✅ Cache management dashboard at `/admin/cache-management`
- ✅ Automatic cache invalidation in your admin components
- ✅ Audit trail of all cache operations
- ✅ Rate limiting and security safeguards
- ✅ Real-time monitoring and status

Start by integrating one admin module, test it works, then add others incrementally.
