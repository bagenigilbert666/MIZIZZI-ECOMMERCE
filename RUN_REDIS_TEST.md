# Running the Redis Backend Test

This guide explains how to run the Redis connectivity test to verify your Upstash Redis integration with the MIZIZZI backend.

## Quick Start

### Option 1: Linux/macOS (Recommended)
```bash
# From project root
chmod +x test_redis.sh
./test_redis.sh
```

### Option 2: Windows
```batch
# From project root
test_redis.bat
```

### Option 3: Python (Universal)
```bash
# From project root
python scripts/test_redis_backend.py

# Or from backend directory
cd backend
python ../scripts/test_redis_backend.py
```

## What the Test Does

The test script performs 6 comprehensive test groups:

1. **Environment Variables Check**
   - Verifies `UPSTASH_REDIS_REST_URL` is set
   - Verifies `UPSTASH_REDIS_REST_TOKEN` is set
   - Auto-loads from `backend/.env` if available

2. **Redis Client Creation**
   - Initializes the HTTP-based Redis client
   - Tests connectivity to Upstash API

3. **Test 1: Basic Connectivity (PING)**
   - Tests the PING command
   - Verifies response is "PONG"

4. **Test 2: SET/GET Operations**
   - Sets a test key with 60-second TTL
   - Retrieves the value and verifies it matches

5. **Test 3: List Operations**
   - Performs LPUSH (add items to list)
   - Performs LRANGE (retrieve list items)

6. **Test 4: Hash Operations**
   - Performs HSET (set hash fields)
   - Performs HGETALL (retrieve all hash fields)

7. **Test 5: Counter Operations**
   - Performs INCR (increment counter) three times
   - Verifies counter values are correct

8. **Test 6: Cleanup**
   - Deletes all test keys
   - Cleans up after testing

## Expected Output

Successful test output will look like:

```
======================================================================
UPSTASH REDIS BACKEND CONNECTIVITY TEST (HTTP REST API)
======================================================================
Timestamp: 2026-03-06T19:19:40.914671

✓ Loaded environment from /path/to/backend/.env

Backend path: /path/to/backend

✓ Successfully imported Redis client module

======================================================================
CHECKING ENVIRONMENT VARIABLES
======================================================================
✓ UPSTASH_REDIS_REST_URL set
  https://nearby-rabbit-63956.upstash.io...
✓ UPSTASH_REDIS_REST_TOKEN set
  AfnUAAIncDI4NmVmOGJhM2I1...

...
[More test results follow]
...

======================================================================
TEST SUMMARY
======================================================================

If all tests passed with ✓ marks, your Redis integration is working correctly!
```

## Troubleshooting

### Error: "Failed to import Redis client"
**Cause**: Python can't find the app module
**Solution**: 
1. Run from project root: `python scripts/test_redis_backend.py`
2. Make sure `backend/app/cache/__init__.py` exists
3. Ensure `backend/app/cache/redis_client.py` exists

### Error: "Missing environment variables"
**Cause**: `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` not set
**Solution**:
1. Check `backend/.env` contains both variables
2. Or set them in your shell:
   ```bash
   export UPSTASH_REDIS_REST_URL="https://nearby-rabbit-63956.upstash.io"
   export UPSTASH_REDIS_REST_TOKEN="your-token-here"
   ```

### Error: "PING command failed"
**Cause**: Can't connect to Upstash Redis
**Solution**:
1. Check your internet connection
2. Verify the URL and token are correct
3. Check if Upstash is accessible: `curl https://nearby-rabbit-63956.upstash.io`

### Error: "SET command failed"
**Cause**: HTTP request to Redis API failed
**Solution**:
1. Verify Bearer token format
2. Check Redis instance isn't at quota
3. Look for error details in test output

## Integrating with Flask

Once the test passes, the Redis cache is automatically used by:

1. **Product Routes**
   - `/api/products` - 5 minute cache
   - `/api/products/<id>` - 15 minute cache
   - `/api/products/category/<slug>` - 10 minute cache

2. **Cache Headers**
   - `X-Cache: HIT` - Served from cache
   - `X-Cache: MISS` - Fresh from database
   - `X-Cache-TTL: 300` - Time to live in seconds

3. **Cache Invalidation**
   - Automatic on product updates
   - Manual via API endpoints (admin only)

## Next Steps

1. Start your Flask backend: `python backend/app.py` or `flask run`
2. Start your Next.js frontend: `cd frontend && npm run dev`
3. Test product endpoints with curl:
   ```bash
   curl -i http://localhost:5000/api/products
   ```
4. Check response headers for cache indicators

## Performance Metrics

Expected performance improvements:

| Scenario | Without Cache | With Cache | Improvement |
|----------|---------------|-----------|------------|
| First request | 800-1200ms | 800-1200ms | Same |
| Cached request | N/A | 50-100ms | 10-15x faster |
| 100 requests | 80-120s | ~5s | 15-24x faster |
| Database load | 100% | 10-20% | 80-90% reduction |

## Documentation

For more information, see:
- `REDIS_INTEGRATION_GUIDE.md` - Complete setup guide
- `REDIS_QUICK_REFERENCE.md` - Quick command reference
- `REDIS_FIX_SUMMARY.md` - What was fixed
- `backend/app/cache/redis_client.py` - Client implementation
- `backend/app/cache/cache.py` - Cache manager implementation
