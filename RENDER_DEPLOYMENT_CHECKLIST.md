# Render Deployment Checklist

## Pre-Deployment (Local)

- [ ] All changes committed to git
- [ ] `git push origin main` - Push to GitHub
- [ ] Test locally: `flask run` works
- [ ] Test products API: `curl http://localhost:5000/api/products/`
- [ ] Test featured products: `curl http://localhost:5000/api/products/featured/flash-sale`
- [ ] Verify indexes exist locally: `psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename='products';"`

## Render Setup

- [ ] Create Render account at render.com
- [ ] Connect GitHub repository
- [ ] Select `main` branch

## Environment Variables (Set in Render Dashboard)

- [ ] `FLASK_ENV=production`
- [ ] `FLASK_CONFIG=production`
- [ ] `DATABASE_URL=your_postgres_url`
- [ ] `REDIS_URL=your_redis_url`
- [ ] `JWT_SECRET_KEY=generate_random_key`
- [ ] `CLOUDINARY_API_KEY=your_key`
- [ ] `CLOUDINARY_API_SECRET=your_secret`
- [ ] `CLOUDINARY_CLOUD_NAME=your_name`

## Build Configuration

- [ ] Build command: `bash render-build.sh`
- [ ] Start command: `gunicorn wsgi:app --bind 0.0.0.0:8080 --workers 2 --threads 4 --timeout 120`
- [ ] Runtime: Python
- [ ] Python version: 3.12

## Deployment

- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete (5-10 minutes)
- [ ] Check logs for index creation messages
- [ ] Verify no build errors

## Post-Deployment Testing

- [ ] Application starts without errors
- [ ] Health check: `curl -i https://your-app.render.com/api/products/`
- [ ] Check status code: `200 OK`
- [ ] Verify cache headers: `X-Cache: MISS` or `X-Cache: HIT`
- [ ] Test featured endpoints:
  ```bash
  curl https://your-app.render.com/api/products/featured/flash-sale
  curl https://your-app.render.com/api/products/featured/new-arrivals
  ```
- [ ] Check response times in headers
- [ ] Verify database connection works
- [ ] Confirm Redis caching is active

## Verification Commands

```bash
# Test main products (replace with your Render URL)
curl -i https://your-app.render.com/api/products/?page=1&per_page=12

# Test featured products
curl -i https://your-app.render.com/api/products/featured/flash-sale

# View cache headers
curl -i https://your-app.render.com/api/products/ | grep "X-"

# Check database indexes were created
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename='products' ORDER BY indexname;"
```

## Performance Targets

- [ ] First request: 40-50ms (database with indexes)
- [ ] Cached request: 2-5ms (Redis hit)
- [ ] All featured endpoints returning data
- [ ] No timeout errors
- [ ] Cache headers visible in responses

## Troubleshooting

If deployment fails:
- [ ] Check Render build logs
- [ ] Verify `render-build.sh` has execute permissions
- [ ] Confirm DATABASE_URL is correct
- [ ] Test database connection manually
- [ ] Check for SQL syntax errors in index creation

If indexes don't create:
- [ ] Manually run: `psql $DATABASE_URL < backend/scripts/enhanced_product_indexes.sql`
- [ ] Verify products table exists
- [ ] Check database user permissions
- [ ] Review Render logs for specific SQL errors

## Files Deployed

- `backend/render-build.sh` - Build script with index initialization
- `render.yaml` - Render configuration (optional)
- `backend/Dockerfile` - Docker configuration
- `backend/Procfile` - Process file
- `backend/wsgi.py` - WSGI entry point
- `backend/requirements.txt` - Python dependencies
- `backend/app/` - Flask application
- `backend/scripts/enhanced_product_indexes.sql` - Index definitions

## After Deployment

- [ ] Monitor Render logs for issues
- [ ] Test endpoints from production URL
- [ ] Verify cache is warming up
- [ ] Check database performance
- [ ] Set up alerts for errors
- [ ] Plan for scaling strategy

## Rollback Plan

If critical issues occur:
- [ ] Use Render rollback to previous build
- [ ] Or: Redeploy from previous commit
- [ ] Or: Hotfix and push new commit

## Documentation

- [ ] Share production URL with team
- [ ] Document API endpoints with response times
- [ ] Share performance metrics
- [ ] Set up monitoring dashboard
