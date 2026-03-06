# Quick Test Execution Guide

## Prerequisites

Ensure these are running:
```bash
# Terminal 1: Backend API
cd backend
python -m flask run

# Terminal 2: Redis (if using Redis cache)
redis-server

# Terminal 3: Run tests from here
cd /path/to/project
```

## Running the Test Suite

### Option 1: Full Automated Python Test Suite (RECOMMENDED)

Most comprehensive testing with detailed reporting:

```bash
python scripts/test_products_api.py
```

This tests:
- ✓ All 20 routes
- ✓ Single product endpoints (by ID, by slug)
- ✓ List endpoints with filters
- ✓ Boolean normalization
- ✓ Featured sections (all 6 types)
- ✓ Cache behavior and hits
- ✓ Error handling
- ✓ Serialization quality
- ✓ Response times

Expected output: Green checkmarks for all tests, final summary showing pass/fail.

### Option 2: Quick Curl Test Suite

Faster testing using bash and curl:

```bash
bash scripts/test-products-curl.sh
```

This runs 12 quick tests:
1. Single product by ID
2. Product by slug
3. Cache hit detection
4. Product list
5. Fast endpoint
6. Filters
7. Boolean normalization
8. Featured sections (6)
9. Featured fast sections
10. 404 errors
11. Cache info
12. Serialization fields

Expected output: Green checkmarks, timing comparisons.

### Option 3: Manual Curl Commands

For targeted testing of specific endpoints:

```bash
# View all curl commands
source scripts/CURL_REFERENCE.sh

# Or use directly:
BASE_URL="http://localhost:5000/api/products"

# Single product
curl -s $BASE_URL/1 | jq '.'

# List with filters
curl -s "$BASE_URL/?is_featured=true&per_page=5" | jq '.items'

# Featured section
curl -s "$BASE_URL/trending?limit=10" | jq '.items'

# Fast endpoint (measure performance)
curl -w "Time: %{time_total}s\n" -o /dev/null -s $BASE_URL/fast
```

## Expected Results

### Test Suite Output Example

```
══════════════════════════════════════════════════════════════════════
  PRODUCTS ROUTES COMPREHENSIVE TEST SUITE
  Testing: Endpoints, Caching, Serialization, Refactoring
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
TEST: Single Product Endpoints
══════════════════════════════════════════════════════════════════════

ℹ Testing GET /products/1
✓ Product by ID works - 45.23ms
ℹ Testing cache hit on same product
✓ Cache hit detected - 8.12ms (was 45.23ms)
ℹ Testing GET /products/slug/test-product
✓ Product by slug works - 42.15ms

══════════════════════════════════════════════════════════════════════
TEST: List Endpoints
══════════════════════════════════════════════════════════════════════

ℹ Testing GET /products (page=1, per_page=10)
✓ List endpoint works - 10 items - 156.78ms
✓ Product serialization is lightweight (optimal)
ℹ Pagination: page=1, total=245
ℹ Testing GET /products/fast (page=1, per_page=10)
✓ Fast endpoint works - 10 items - 89.34ms
✓ Fast endpoint is faster (89.34ms vs 156.78ms)

... [more tests] ...

══════════════════════════════════════════════════════════════════════
                         TEST SUMMARY
══════════════════════════════════════════════════════════════════════

  Single Product Endpoints: PASS
  List Endpoints: PASS
  Featured Sections: PASS
  Cache Management: PASS
  Error Handling: PASS
  Serialization Quality: PASS

Overall: 6/6 test suites passed

✓ All tests passed! Routes are production-ready.
```

### Curl Test Output Example

```
════════════════════════════════════════════════════════════════════════
  PRODUCTS ROUTES CURL TEST SUITE
════════════════════════════════════════════════════════════════════════

[TEST 1] GET /products/1 (Single Product by ID)
✓ Valid JSON response
1
"Test Product"
99.99

[TEST 2] GET /products/slug/{slug} (Product by Slug)
Testing with slug: test-product
✓ Slug endpoint works

[TEST 3] Cache Hit Detection (Product by ID)
Fetching /products/1 twice to check cache...
First request:  0.045s
Second request: 0.008s
✓ Cache hit detected (second request is faster)

[TEST 4] GET /products/ (Product List)
✓ List endpoint works - 5 items returned

[TEST 5] GET /products/fast (Fast Endpoint)
Normal endpoint: 0.156s
Fast endpoint:   0.089s
✓ Fast endpoint is faster

... [more tests] ...

════════════════════════════════════════════════════════════════════════
✓ Products routes test suite complete!
════════════════════════════════════════════════════════════════════════
```

## Performance Benchmarks

### What to Look For

**Good Signs:**
- First request: 50-200ms (depending on complexity)
- Cached request: <20ms (5-10x faster)
- Fast endpoint: 30-100ms vs 100-200ms (2-3x faster)
- Featured sections: <50ms cached
- No errors (all 2xx responses)
- Cache hits detected on repeated requests

**Warning Signs:**
- All requests slow (>500ms) = cache not working
- No difference between first/second = cache not enabled
- 404 errors on products = database issue
- JSON parse errors = API returning wrong format
- Timeouts = backend not running

## Specific Test Examples

### Test 1: Cache Hit Performance

```bash
# Time first request
curl -w "First:  %{time_total}s\n" -o /dev/null http://localhost:5000/api/products/1

# Time second request (should be much faster)
curl -w "Second: %{time_total}s\n" -o /dev/null http://localhost:5000/api/products/1
```

Expected: Second is 5-10x faster

### Test 2: Boolean Normalization

```bash
# Count products with is_featured=true
curl -s "http://localhost:5000/api/products/fast?is_featured=true" | jq '.items | length'

# Count products with is_featured=1
curl -s "http://localhost:5000/api/products/fast?is_featured=1" | jq '.items | length'

# Count products with is_featured=yes
curl -s "http://localhost:5000/api/products/fast?is_featured=yes" | jq '.items | length'
```

Expected: All three return the same count

### Test 3: Serialization Efficiency

```bash
# Full product field count
curl -s http://localhost:5000/api/products/1 | jq 'keys | length'

# List product field count
curl -s http://localhost:5000/api/products/?per_page=1 | jq '.items[0] | keys | length'
```

Expected: Full ~30 fields, List ~6 fields (80% reduction)

### Test 4: All Featured Sections

```bash
for section in trending flash_sale new_arrivals top_picks daily_finds luxury_deals; do
  COUNT=$(curl -s "http://localhost:5000/api/products/$section?limit=5" | jq '.items | length')
  echo "$section: $COUNT items"
done
```

Expected: All sections respond with items

## Troubleshooting

### Backend Connection Error

```
Error: Connection failed to http://localhost:5000/api/products/1
```

**Fix:** Start the backend server first
```bash
cd backend && python -m flask run
```

### JSON Parse Error

```
Error: Invalid JSON response
```

**Fix:** Check backend is responding correctly
```bash
curl -s http://localhost:5000/api/products/1
# Should show valid JSON, not HTML error page
```

### No Products in Database

```
⊘ No items in response (may be empty database)
```

**Fix:** Seed sample products
```bash
python scripts/seed_products.py
# Or manually insert test data in database
```

### Cache Not Working

```
⊘ Cache hit not detected (may be expected on first run)
Second request is not faster than first
```

**Fix:** Ensure Redis is running and cache is configured
```bash
redis-cli ping  # Should return PONG
# Or check backend cache config is correct
```

### Timeout Errors

```
Error: Request failed: Connection timeout
```

**Fix:** Check backend is running and responsive
```bash
curl http://localhost:5000/health
# Should respond quickly
```

## Next Steps

After successful testing:

1. **Review Results**
   - Check all tests pass
   - Note response times
   - Verify cache hits
   - Confirm serialization efficiency

2. **Performance Analysis**
   - Compare with baseline (if you have it)
   - Identify slow endpoints
   - Check database query counts
   - Monitor cache hit ratio

3. **Production Deployment**
   - Update Redis configuration
   - Set environment variables
   - Configure monitoring/alerts
   - Run load tests
   - Deploy to production

4. **Ongoing Monitoring**
   - Track cache metrics
   - Monitor API response times
   - Alert on errors
   - Review logs regularly

## Support

For issues or questions:
- Check `PRODUCTS_ROUTES_SUMMARY.md` for architecture overview
- Read `TEST_GUIDE.py` for detailed testing information
- Review code comments in route files
- Check API response format examples in curl reference

