# Redis Timeout Issues - Fixed

## Problem

Your Flask application was experiencing frequent Redis read timeouts:
```
Redis read timeout - falling back to database
```

This occurred because:
1. **Upstash REST API is slower than local TCP Redis** - Requires network HTTP calls instead of local socket connections
2. **Timeout was set to 500ms (0.5s)** - Too aggressive for REST API latency
3. **No differentiation between read/write timeouts** - Writes needed more time than reads

## Root Cause

The redis_client.py had these aggressive timeout settings:
- **READ timeout: 0.5 seconds** (too short for REST API)
- **WRITE timeout: 2 seconds** (not enough for large JSON over HTTP)

## Solution Applied

### 1. Increased Redis Timeouts
**File:** `backend/app/cache/redis_client.py`

```python
# BEFORE (causing timeouts)
REDIS_TIMEOUT_READ = 0.5   # 500ms - too aggressive for REST API
REDIS_TIMEOUT_WRITE = 2.0  # 2 seconds - not enough for large payloads

# AFTER (optimal for Upstash REST API)
REDIS_TIMEOUT_READ = 3.0   # 3 seconds - reasonable for HTTP requests
REDIS_TIMEOUT_WRITE = 5.0  # 5 seconds - allows time for large JSON serialization
```

### 2. Improved Timeout Logging
Made error messages more informative to help debug future timeout issues.

### 3. Previous Fixes (from earlier session)

**File:** `backend/app/configuration/extensions.py`
- Configured Flask-Limiter to use REDIS_URL environment variable
- Added graceful fallback to memory storage

**File:** `backend/app/services/search_ml_service.py`
- Removed hardcoded localhost:6379 connection
- Now uses REDIS_URL from environment

**File:** `backend/app/services/cache_invalidation_service.py`
- Fixed rate limiter to use Upstash Redis dynamically
- Handles cases where Redis is unavailable

## Expected Results

After these changes:
- ✅ Redis timeouts should be eliminated or significantly reduced
- ✅ Cache hits will be faster and more reliable
- ✅ Graceful fallback to database when Redis is slow
- ✅ No more connection refused errors on Render

## Testing

Monitor your Render logs for:
- **Before fix:** `Redis read timeout` warnings every few seconds
- **After fix:** Occasional `Redis HIT`/`MISS` info logs with no timeouts

## Environment Configuration

Make sure these are set in your Render environment variables:
- `REDIS_URL` - Your Upstash Redis connection string (format: `redis://default:password@host:port`)
- Or use Vercel KV variables if available:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

## Performance Tips

If you still see occasional timeouts:
1. Reduce cache TTL for non-critical data to prevent large payloads
2. Monitor Upstash Redis usage - you may be hitting rate limits
3. Consider upgrading your Upstash Redis tier if on free plan
4. Batch cache operations when possible to reduce number of requests
