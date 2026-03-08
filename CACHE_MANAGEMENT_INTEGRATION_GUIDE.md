# Cache Management Integration Guide

## Overview

This guide explains how to integrate automatic cache invalidation into your existing admin modules and components. The system automatically clears caches after successful CRUD operations based on a centralized mapping utility.

## Architecture

### Frontend Structure

```
frontend/
├── types/cache-management.ts              # TypeScript interfaces and enums
├── services/cache-management.ts            # Service layer for API calls
├── lib/utils/
│   ├── cache-invalidation-map.ts          # Centralized cache mapping
│   └── auto-invalidate-cache.ts           # Helper for automatic invalidation
├── hooks/use-cache-management.ts          # React hook for cache operations
├── components/admin/cache-management/     # UI components
│   ├── cache-status-card.tsx
│   ├── cache-groups-section.tsx
│   ├── quick-actions.tsx
│   ├── cache-invalidation-dialog.tsx
│   ├── invalidation-history.tsx
│   └── danger-zone.tsx
└── app/admin/cache-management/page.tsx    # Main dashboard page
```

### Backend Structure

```
backend/
├── config/cache_groups.py                 # Cache group definitions
├── models/cache_invalidation_log.py       # Audit logging model
├── services/cache_invalidation_service.py # Cache operations service
└── routes/admin/cache_management.py       # API endpoints
```

## How It Works

### 1. Cache Group Mapping

Cache invalidation is controlled by the **Cache Invalidation Map** in `/frontend/types/cache-management.ts`:

```typescript
export const CACHE_INVALIDATION_MAP: Record<string, CacheGroupType[]> = {
  "products:create": [CacheGroupType.CRITICAL, CacheGroupType.DEFERRED],
  "products:update": [CacheGroupType.CRITICAL, CacheGroupType.DEFERRED],
  "products:delete": [CacheGroupType.CRITICAL, CacheGroupType.DEFERRED],
  // ... more mappings
}
```

This defines which cache groups should be cleared for each admin action.

### 2. Automatic Invalidation Flow

```
1. Admin creates/updates/deletes resource
   ↓
2. Frontend makes API call
   ↓
3. Backend processes request and commits to DB
   ↓
4. Frontend receives success response
   ↓
5. Frontend triggers: invalidateAfterAction("resource", "operation")
   ↓
6. Service looks up cache groups in mapping
   ↓
7. Service calls Flask backend /api/admin/cache/invalidate-group
   ↓
8. Backend uses Redis SCAN to delete matching keys
   ↓
9. Operation logged to database audit trail
```

### 3. Safety Features

- **Rate Limiting**: Max 10 invalidation requests per minute per admin
- **Redis SCAN**: Non-blocking iteration over large datasets
- **Pattern Whitelist**: Only predefined patterns allowed
- **Atomic Operations**: Redis pipeline for batch deletions
- **Audit Logging**: All operations logged with admin ID, timestamp, affected caches
- **Double Confirmation**: "Clear All" requires two clicks
- **Transactional Safety**: Cache invalidation only after successful DB commits

## Integration Steps

### Step 1: Update Your Admin Component

Add automatic cache invalidation to your existing create/update/delete handlers:

```typescript
"use client"

import { useAutoInvalidateCache } from "@/lib/utils/auto-invalidate-cache"

export function ProductCreateForm() {
  const { invalidateAfterAction } = useAutoInvalidateCache()

  const handleCreate = async (data: ProductData) => {
    try {
      // Make API call
      const response = await fetch("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create product")
      }

      // SUCCESS: Invalidate cache after successful DB commit
      await invalidateAfterAction("products", "create")

      // Refresh data
      mutate("/api/admin/products")
      
      toast({ title: "Success", description: "Product created and cache updated" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive"
      })
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleCreate(formData)
    }}>
      {/* form fields */}
    </form>
  )
}
```

### Step 2: Add Custom Mapping (If Needed)

If you have a custom resource not in the mapping, add it to `CACHE_INVALIDATION_MAP`:

```typescript
// In frontend/types/cache-management.ts
export const CACHE_INVALIDATION_MAP: Record<string, CacheGroupType[]> = {
  // ... existing mappings
  "my_custom_resource:create": [CacheGroupType.HOMEPAGE],
  "my_custom_resource:update": [CacheGroupType.HOMEPAGE],
  "my_custom_resource:delete": [CacheGroupType.HOMEPAGE],
}
```

Or register dynamically at runtime:

```typescript
import { registerCacheInvalidation } from "@/lib/utils/cache-invalidation-map"

// Register custom mapping
registerCacheInvalidation("my_resource", "create", [CacheGroupType.HOMEPAGE])
```

### Step 3: Silent Mode

For operations that shouldn't show toast notifications:

```typescript
// Don't show toast, just invalidate silently
await invalidateAfterAction("products", "update", true)
```

### Step 4: Batch Operations

For bulk operations affecting multiple resources:

```typescript
import { batchInvalidateCache } from "@/lib/utils/auto-invalidate-cache"

const handleBulkUpdate = async () => {
  // ... perform updates ...
  
  // Invalidate multiple resource types at once
  await batchInvalidateCache([
    { resource: "products", operation: "update" },
    { resource: "categories", operation: "update" },
    { resource: "inventory", operation: "update" },
  ])
}
```

## Cache Groups Explained

### Critical Caches (affects homepage immediately)
- `mizizzi:carousel:*` - Homepage carousel items
- `mizizzi:categories:*` - Shop categories
- `mizizzi:feature_cards:*` - Feature cards
- `mizizzi:topbar:*` - Top bar messages

Cleared when: Products, Categories, Carousel, Feature Cards, or Top Bar are modified

### Deferred Caches (content updates less frequently)
- `mizizzi:flash_sale:*` - Flash sale products
- `mizizzi:premium_experiences:*` - Premium collections
- `mizizzi:product_showcase:*` - Product showcase
- `mizizzi:brands:*` - Brand information

Cleared when: Products, Premium Experiences, Product Showcase, or Brands are modified

### Homepage Caches (global sections)
- `mizizzi:homepage:*` - Complete homepage cache
- `mizizzi:contact_cta:*` - Contact CTA sections
- `mizizzi:footer:*` - Footer content
- `mizizzi:side_panels:*` - Side panels
- `mizizzi:theme:*` - Theme settings
- `mizizzi:inventory:*` - Inventory data
- `mizizzi:products:*` - Product listings

Cleared when: Any content is modified or inventory changes

## API Endpoints

### GET /api/admin/cache/status
Get current cache status and metrics

**Response:**
```json
{
  "connected": true,
  "memory_usage": 1024000,
  "keys_count": 5432,
  "last_updated": "2025-03-08T10:30:00Z",
  "cache_groups": [...]
}
```

### POST /api/admin/cache/invalidate
Invalidate a single cache pattern

**Request:**
```json
{
  "pattern": "mizizzi:carousel:*"
}
```

### POST /api/admin/cache/invalidate-group
Invalidate a cache group

**Request:**
```json
{
  "group": "critical"
}
```

Valid groups: `"critical"`, `"deferred"`, `"homepage"`, `"all"`

### POST /api/admin/cache/invalidate-all
Clear ALL caches (requires confirmation)

**Request:**
```json
{
  "confirmed": true
}
```

### POST /api/admin/cache/rebuild
Rebuild homepage caches from database

**Request:**
```json
{
  "force": false
}
```

### GET /api/admin/cache/history?page=1&per_page=50
Get invalidation audit log

## Monitoring & Debugging

### Enable Debug Logging

Cache operations log to console with `[v0]` prefix:

```typescript
console.log("[v0] Cache invalidation triggered for products:create")
```

### Check Cache Management Dashboard

Visit `/admin/cache-management` to:
- View cache status and metrics
- See which patterns are cached
- View recent invalidation history
- Manually clear caches

### Common Issues

**Issue**: "Rate limit exceeded"
- Solution: Wait 60 seconds before next invalidation

**Issue**: "Pattern not whitelisted"
- Solution: Add pattern to `CACHE_GROUPS` in Flask config

**Issue**: Cache not clearing
- Solution: Check Redis connection in Flask logs

## Performance Considerations

1. **Non-blocking Operations**: Redis SCAN is used instead of KEYS
2. **Batch Deletions**: Multiple deletions happen in Redis pipeline
3. **Async Operations**: Cache invalidation doesn't block user operations
4. **Audit Logging**: Logged asynchronously after Redis operation

## Security

- **Admin-only**: All cache endpoints require admin authentication
- **Role Validation**: Checked via JWT token
- **Rate Limiting**: Prevents abuse with per-user limits
- **Pattern Whitelisting**: Only predefined patterns can be invalidated
- **Audit Trail**: All operations logged with admin ID and timestamp

## Troubleshooting

### Flask routes not found

Ensure the blueprint is registered in your Flask app initialization:

```python
from app.routes.admin.cache_management import init_cache_management_routes

# In your Flask app creation
init_cache_management_routes(app)
```

### Database model migration

Run migrations to create the audit log table:

```bash
alembic upgrade head
```

Or create manually:

```sql
CREATE TABLE cache_invalidation_logs (
  id VARCHAR(36) PRIMARY KEY,
  admin_id INTEGER,
  admin_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  cache_groups JSON,
  redis_patterns JSON,
  keys_deleted INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_id_timestamp (admin_id, created_at),
  INDEX idx_action_timestamp (action, created_at),
  INDEX idx_status (status)
);
```

### Redis connection issues

Check Flask extensions configuration:

```python
from app.configuration.extensions import redis_cache

# Should be initialized
if redis_cache is None:
    # Configure Redis in your Flask app
    from redis import Redis
    redis_cache = Redis(host='localhost', port=6379, db=0)
```

## Example Implementation

See `/frontend/app/admin/cache-management/page.tsx` for a complete example with all features.

## Support

For issues or questions:
1. Check the debug logs in browser console
2. Review Flask logs for backend errors
3. Visit `/admin/cache-management` to check cache status
4. Check Redis connection and memory usage
