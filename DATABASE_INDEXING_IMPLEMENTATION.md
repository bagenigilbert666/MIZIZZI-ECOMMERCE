# Database Indexing Implementation Guide

## Overview

This guide documents the database indexing strategy for the Mizizzi Products API. We've added 15+ optimized composite and conditional indexes to dramatically improve query performance.

## Quick Start

### 1. Execute Index Creation

Using the SQL script directly:
```bash
cd backend/scripts
psql $DATABASE_URL < enhanced_product_indexes.sql
```

Or using the bash script:
```bash
bash backend/scripts/init_indexes.sh
```

### 2. Verify Indexes Were Created

```bash
# List all indexes on products table
psql $DATABASE_URL -c "\di products"

# Get detailed index info
psql $DATABASE_URL -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products' ORDER BY indexname;"
```

### 3. Test Performance

Run the performance testing script:
```bash
bash backend/scripts/test_indexing_performance.sh
```

## Index Strategy

### 1. Composite Indexes (Multi-column)

These indexes optimize queries that filter on multiple columns simultaneously.

| Index Name | Columns | Use Case | Query Pattern |
|---|---|---|---|
| `idx_products_category_active_visible` | `(category_id, is_active, is_visible)` | Browse products by category | `WHERE category_id=X AND is_active=true AND is_visible=true` |
| `idx_products_brand_price_discount` | `(brand_id, price, discount_percentage DESC)` | Filter by brand with price sorting | `WHERE brand_id=X ORDER BY discount_percentage DESC` |
| `idx_products_active_visible_created` | `(is_active, is_visible, created_at DESC)` | Timeline queries with filters | `WHERE is_active=true AND is_visible=true ORDER BY created_at DESC` |
| `idx_products_category_price_range` | `(category_id, price ASC)` WHERE active/visible | Price range filtering | `WHERE category_id=X AND price BETWEEN min AND max` |
| `idx_products_flash_sale_active` | `(is_flash_sale, discount_percentage DESC)` WHERE active | Flash sale products | `WHERE is_flash_sale=true ORDER BY discount_percentage DESC` |
| `idx_products_luxury_deals_sort` | `(is_luxury_deal, sort_order, created_at DESC)` WHERE active/visible | Luxury deal browsing | `WHERE is_luxury_deal=true ORDER BY sort_order, created_at DESC` |
| `idx_products_sort_order_created` | `(sort_order ASC, created_at DESC)` | General sorting | `ORDER BY sort_order, created_at DESC` |

### 2. Conditional Indexes (Partial)

These indexes only store rows matching a WHERE condition, reducing index size and improving performance.

| Index Name | Condition | Use Case |
|---|---|---|
| `idx_products_featured_trending` | `WHERE is_active=true AND is_visible=true` | Featured/trending products |
| `idx_products_new_arrivals_sort` | `WHERE is_active=true AND is_visible=true` | New arrivals browsing |
| `idx_product_images_primary` | `WHERE is_primary=true` | Get primary product image |
| `idx_product_reviews_verified` | `WHERE is_verified=true` | Verified reviews only |

### 3. Single Column Indexes

Basic indexes for frequently searched columns.

| Index Name | Column | Use Case |
|---|---|---|
| `idx_products_slug` | `slug` | Product lookup by URL slug |
| `idx_products_active_slug` | `(slug, is_active)` WHERE visible | Active product lookup |
| `idx_product_images_product_id` | `product_id` | Get images for product |
| `idx_product_reviews_product_id` | `(product_id, rating DESC)` | Get product reviews |

## Performance Impact

### Expected Query Improvements

With these indexes in place, you can expect:

- **Category + Filter Queries**: 10-50x faster
  - Query: `SELECT * FROM products WHERE category_id=1 AND is_active=true AND is_visible=true`
  - Before: ~500-1000ms | After: ~10-50ms

- **Price Range Queries**: 20-100x faster
  - Query: `SELECT * FROM products WHERE category_id=1 AND price BETWEEN 100 AND 500`
  - Before: ~200-800ms | After: ~5-20ms

- **Sorted Queries**: 5-20x faster
  - Query: `SELECT * FROM products ORDER BY discount_percentage DESC LIMIT 20`
  - Before: ~100-300ms | After: ~10-50ms

- **Image Lookups**: 50-200x faster
  - Query: `SELECT * FROM product_images WHERE product_id=1 AND is_primary=true`
  - Before: ~50-200ms | After: ~1-5ms

### Cache Hit Rates

With Redis caching + indexes:
- **First page load**: Cache MISS → Database query → Index used → ~100-500ms
- **Subsequent loads**: Cache HIT → Memory → ~1-5ms
- **Expected hit rate**: 60-80% in production

## API Endpoints Affected

### Products List
```bash
# Before: Full table scan
# After: Uses idx_products_sort_order_created
curl "http://localhost:5000/api/products/?page=1&per_page=20&sort_by=created_at"
```

### Filter by Category
```bash
# Before: Full table scan with filter
# After: Uses idx_products_category_active_visible
curl "http://localhost:5000/api/products/?category=electronics&is_active=true&is_visible=true"
```

### Price Range Filter
```bash
# Before: Linear scan through all products
# After: Uses idx_products_category_price_range (if conditions met)
curl "http://localhost:5000/api/products/?category=electronics&min_price=100&max_price=5000"
```

### Flash Sale Products
```bash
# Before: Full table scan
# After: Uses idx_products_flash_sale_active (small index)
curl "http://localhost:5000/api/products/flash-sale?limit=50"
```

### Featured Products
```bash
# Before: Full table scan
# After: Uses idx_products_featured_trending (partial index)
curl "http://localhost:5000/api/products/featured?limit=20"
```

### New Arrivals
```bash
# Before: Full table scan + sort
# After: Uses idx_products_new_arrivals_sort
curl "http://localhost:5000/api/products/new-arrivals?limit=20"
```

## Monitoring

### Check Index Size

```bash
# Get size of all indexes on products
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE tablename = 'products'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Monitor Index Usage

```bash
# See which indexes are being used
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'products'
ORDER BY idx_scan DESC;
```

### Find Missing Indexes

```bash
# Find indexes on products that have zero scans
SELECT 
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'products' AND idx_scan = 0;
```

### Analyze Query Performance

```bash
# Explain a query to see index usage
EXPLAIN ANALYZE
SELECT * FROM products 
WHERE category_id = 1 AND is_active = true AND is_visible = true
ORDER BY created_at DESC
LIMIT 20;
```

## Maintenance

### Update Statistics Regularly

```bash
# Update statistics for better query planning
ANALYZE products;
ANALYZE product_images;
ANALYZE reviews;
```

### Rebuild Indexes (Optional)

```bash
# Rebuild all indexes on products table (may lock table temporarily)
REINDEX TABLE products;
```

### Remove Unused Indexes

```sql
-- Find unused indexes (created but never scanned)
SELECT indexname, idx_scan 
FROM pg_stat_user_indexes 
WHERE tablename = 'products' AND idx_scan = 0;

-- Drop if confirmed unused for 30 days
DROP INDEX IF EXISTS index_name;
```

## Testing Index Effectiveness

### Before/After Comparison

1. **Test without indexes** (create baseline):
   ```bash
   # Drop all non-primary key indexes
   DROP INDEX idx_products_category_active_visible;
   -- ... drop other indexes ...
   
   # Run performance tests
   bash test_indexing_performance.sh
   ```

2. **Test with indexes**:
   ```bash
   # Recreate indexes
   bash init_indexes.sh
   
   # Run same performance tests
   bash test_indexing_performance.sh
   ```

3. **Compare results**:
   - Look at average response times
   - Compare cache hit rates
   - Monitor database CPU usage

## Troubleshooting

### Indexes Not Being Used

**Problem**: Query still slow even with indexes
```bash
# Check why index isn't used
EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = 1;

# Common reasons:
# 1. Index is too new (need ANALYZE)
# 2. Query is returning too many rows (full scan faster)
# 3. Index statistics are stale
```

**Solution**:
```bash
# Update statistics
ANALYZE products;

# Rebuild index
REINDEX INDEX idx_products_category_active_visible;
```

### Slow Writes After Indexing

**Problem**: INSERT/UPDATE became slower
```bash
# Indexing increases write overhead - this is normal
# Monitor with: SELECT pg_stat_reset();
```

**Solution**:
```bash
# Use CONCURRENTLY for non-blocking operations
CREATE INDEX CONCURRENTLY idx_new_column ON products(column);

# Batch writes during off-peak hours
```

### Duplicate Indexes

**Problem**: Similar indexes cause confusion
```bash
# Find duplicate indexes
SELECT * FROM pg_stat_user_indexes 
WHERE tablename = 'products'
GROUP BY indexname
HAVING count(*) > 1;
```

**Solution**: Use enhanced_product_indexes.sql as single source of truth

## Production Checklist

- [ ] Run `init_indexes.sh` to create all indexes
- [ ] Verify with `\di products` in psql
- [ ] Run performance tests to confirm improvements
- [ ] Monitor index usage for 24 hours
- [ ] Check database CPU/memory impact
- [ ] Set up monitoring with `monitor_indexes.py`
- [ ] Document baseline metrics for comparison
- [ ] Schedule weekly `ANALYZE` to keep statistics current
- [ ] Set up alerts for failed queries or slow responses
- [ ] Create runbook for index troubleshooting

## References

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Query Performance Tips](https://www.postgresql.org/docs/current/sql-explain.html)
- [Index Maintenance](https://www.postgresql.org/docs/current/maintenance.html)
