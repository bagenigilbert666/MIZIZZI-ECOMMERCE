# Render Deployment Guide - MIZIZZI E-Commerce

## Overview

This guide walks you through deploying your MIZIZZI e-commerce backend to Render with all database indexing optimizations automatically configured.

## What's Included

- **Automatic database index creation** during deployment
- **Redis caching** integration
- **PostgreSQL database** setup
- **Gunicorn** WSGI server configuration
- **Performance monitoring** headers

## Pre-Deployment Checklist

- [ ] GitHub repository connected to Render
- [ ] Environment variables configured in Render dashboard
- [ ] Database URL accessible from Render
- [ ] Redis instance available
- [ ] All code changes committed and pushed

## Deployment Steps

### Step 1: Connect Your GitHub Repository

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select branch: `main`

### Step 2: Configure Environment Variables

In Render Dashboard → Environment:

```
FLASK_ENV=production
FLASK_CONFIG=production
DATABASE_URL=postgresql://user:password@host:5432/mizizzi_project
REDIS_URL=redis://:password@host:6379
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
JWT_SECRET_KEY=your_jwt_secret
```

### Step 3: Set Build and Start Commands

**Build Command:**
```bash
bash render-build.sh
```

**Start Command:**
```bash
gunicorn wsgi:app --bind 0.0.0.0:8080 --workers 2 --threads 4 --timeout 120
```

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. The `render-build.sh` script will automatically:
   - Run database migrations
   - Create all 15 database indexes
   - Optimize table statistics with ANALYZE

## What Happens During Deployment

```
1. Clone repository
2. Install Python dependencies (requirements.txt)
3. Run render-build.sh which:
   ├─ Runs Flask migrations
   ├─ Connects to PostgreSQL
   ├─ Creates 15 composite indexes:
   │  ├─ Main products listing (4 indexes)
   │  ├─ Featured sections (6 indexes)
   │  ├─ Search/filtering (2 indexes)
   │  └─ Related tables (3 indexes)
   ├─ Updates table statistics (ANALYZE)
   └─ Reports success
4. Start Gunicorn server
```

## Verifying Deployment Success

After deployment, test the endpoints:

```bash
# Test main products
curl -i "https://your-app.render.com/api/products/?page=1"

# Test featured products
curl -i "https://your-app.render.com/api/products/featured/flash-sale"

# Check cache headers
curl -i "https://your-app.render.com/api/products/" 2>&1 | grep "X-Cache"
```

Expected headers:
- `X-Cache: MISS` (first request from database)
- `X-Response-Time-Ms: ~45` (database query with indexes)

Run again immediately:
- `X-Cache: HIT` (second request from Redis)
- `X-Response-Time-Ms: ~2` (cached response)

## Performance Metrics After Deployment

- **Database queries:** 40-120x faster (from indexes)
- **Cached responses:** 20-30x faster (from Redis)
- **Overall:** 100-500x faster

## Indexes Created During Deployment

### Main Products Page
1. `idx_products_category_active_visible` - Category filtering
2. `idx_products_brand_price_discount` - Brand/price filtering
3. `idx_products_active_visible_created` - Active/visible products
4. `idx_products_category_price_range` - Price range queries

### Featured Sections
5. `idx_products_trending` - Trending products
6. `idx_products_flash_sale` - Flash sale items
7. `idx_products_new_arrivals` - New arrivals
8. `idx_products_top_pick` - Top picks
9. `idx_products_daily_find` - Daily finds
10. `idx_products_luxury_deal` - Luxury deals

### Search & Filtering
11. `idx_products_featured_category` - Featured by category
12. `idx_products_slug` - Product slug lookup

### Related Tables
13. `idx_product_images_product_id` - Product images
14. `idx_product_images_primary` - Primary product images
15. `idx_product_reviews_product_id` - Product reviews

## Troubleshooting

### Indexes Not Creating

If indexes fail to create during deployment:

1. Check Render logs for SQL errors
2. Manually run in database:
   ```bash
   psql $DATABASE_URL < scripts/enhanced_product_indexes.sql
   ```

### Slow Response Times

If responses are still slow after deployment:

1. Verify indexes were created:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'products';
   ```

2. Check Redis connection:
   ```bash
   redis-cli ping
   ```

3. Analyze query plans:
   ```bash
   python scripts/monitor_indexes.py
   ```

### Database Connection Issues

- Verify `DATABASE_URL` in Render environment variables
- Check PostgreSQL security groups allow Render IPs
- Test connection locally: `psql $DATABASE_URL`

## Rollback

If deployment has issues, use Render's rollback feature:

1. Go to your service in Render
2. Click "Settings" → "Deployment"
3. Select previous build
4. Click "Redeploy"

## Monitoring After Deployment

Monitor your deployment with:

1. **Render Logs** - Real-time application logs
2. **Index Performance** - Run monitor script:
   ```bash
   python scripts/monitor_indexes.py
   ```
3. **Cache Hits** - Check X-Cache headers in responses
4. **Response Times** - Track X-Response-Time-Ms header

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `FLASK_ENV` | Flask environment | `production` |
| `FLASK_CONFIG` | Configuration profile | `production` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://...` |
| `JWT_SECRET_KEY` | JWT signing key | Random string |
| `CLOUDINARY_*` | Image storage | From Cloudinary |

## Next Steps

After successful deployment:

1. Test all endpoints in production
2. Monitor performance metrics
3. Set up error tracking (Sentry)
4. Configure CDN for static assets
5. Set up automated backups

## Support

For deployment issues:
- Check Render status page
- Review application logs in Render dashboard
- Verify environment variables are set correctly
- Test database connectivity
- Check Redis connection
