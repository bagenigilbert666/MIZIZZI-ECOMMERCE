# Production Monitoring & Troubleshooting Guide

This guide helps monitor the optimized homepage API in production and troubleshoot any issues.

---

## Key Metrics to Monitor

### Response Time Headers

Every homepage response includes timing information:

```
X-Cache: HIT|MISS|BYPASS
X-Cache-Key: mizizzi:homepage:...
X-Aggregation-Time-Ms: 150.5
X-Partial-Failures: (empty or comma-separated section names)
```

### What They Mean

| Header | Values | Meaning |
|--------|--------|---------|
| X-Cache | HIT | Served from Redis cache (fast path) |
| X-Cache | MISS | Built from DB and cached (first request) |
| X-Cache | BYPASS | Built but not cached (failures detected) |
| X-Aggregation-Time-Ms | number | Time to aggregate all sections (should be <1000ms cold, <50ms cached) |
| X-Partial-Failures | section names | Which sections failed to load (should be empty) |

### Alert Thresholds

```yaml
Critical:
  - X-Aggregation-Time-Ms > 60000 (>60s cold request)
  - X-Cache == BYPASS (more than 5% of requests)
  - X-Partial-Failures contains sections (>10% of requests)

Warning:
  - X-Aggregation-Time-Ms > 45000 (>45s, approaching limit)
  - X-Cache == MISS (>50% of requests, cache not working)
  - Response time > 5000ms (5s, any cache status)
```

---

## Monitoring Dashboard Setup

### Key Metrics

```sql
-- PostgreSQL/MySQL query to track response times
SELECT 
    DATE_TRUNC('1 minute', timestamp) AS minute,
    COUNT(*) AS requests,
    AVG(aggregation_time_ms) AS avg_time,
    MAX(aggregation_time_ms) AS max_time,
    SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) AS cache_hits,
    SUM(CASE WHEN cache_status = 'MISS' THEN 1 ELSE 0 END) AS cache_misses,
    SUM(CASE WHEN cache_status = 'BYPASS' THEN 1 ELSE 0 END) AS cache_bypasses
FROM homepage_requests
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

### Log Pattern Matching

```
# Count successful requests
grep "X-Cache: HIT\|X-Cache: MISS" access.log | wc -l

# Count bypasses (failures)
grep "X-Cache: BYPASS" access.log | wc -l

# Find slow requests (>30s)
grep -E "X-Aggregation-Time-Ms: [0-9]{5}" access.log | tail -20

# Find specific section failures
grep "X-Partial-Failures:" access.log | head -20
```

### Prometheus Metrics (if using Prometheus)

```yaml
# Add these custom metrics to Flask app
from prometheus_client import Counter, Histogram, Gauge

homepage_requests_total = Counter(
    'homepage_requests_total',
    'Total homepage requests',
    ['cache_status']
)

homepage_aggregation_seconds = Histogram(
    'homepage_aggregation_seconds',
    'Homepage aggregation time',
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0]
)

homepage_cache_size = Gauge(
    'homepage_cache_size_bytes',
    'Homepage cache size in Redis'
)
```

---

## Troubleshooting Guide

### Issue 1: X-Aggregation-Time-Ms > 60000 (Slow cold requests)

**Symptoms**:
- Cold homepage requests taking >60 seconds
- X-Cache showing mostly MISS
- User complaints about slow loading

**Diagnosis**:
```bash
# 1. Check which section is slow
curl -v http://localhost:5000/api/homepage 2>&1 | grep -E "X-Aggregation|X-Partial-Failures"

# 2. Check database query logs
# Look for:
# - Full table scans (SEQSCAN)
# - Slow queries (>1s)
# - Missing indexes

# 3. Check Redis connectivity
redis-cli PING
redis-cli INFO stats

# 4. Check application logs
tail -100 app.log | grep ERROR | head -20
```

**Solutions** (in order):
1. Check database indexes exist:
   ```sql
   -- Check for feature flag indexes
   EXPLAIN ANALYZE SELECT * FROM products WHERE is_luxury_deal = TRUE LIMIT 20;
   -- Should use index: idx_products_luxury or similar
   ```

2. Force cache refresh:
   ```python
   from app.utils.redis_cache import product_cache
   product_cache.flush()
   ```

3. Check database connection pool:
   ```python
   # Verify pool size matches concurrent requests
   # Default: SQLAlchemy pool_size=5, max_overflow=10
   ```

4. Monitor database CPU/memory:
   ```bash
   # Check database load
   SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;
   ```

### Issue 2: X-Cache == BYPASS (Increasing failures)

**Symptoms**:
- X-Cache header showing BYPASS instead of HIT/MISS
- X-Partial-Failures header showing failed sections
- Homepage not fully loading

**Diagnosis**:
```bash
# 1. Check which sections are failing
curl -v http://localhost:5000/api/homepage 2>&1 | grep "X-Partial-Failures"

# 2. Check application logs for errors
grep "Error loading" app.log | tail -20

# 3. Test individual section endpoints
curl http://localhost:5000/api/categories
curl http://localhost:5000/api/carousel
curl http://localhost:5000/api/products/featured
```

**Solutions**:
1. Check database connectivity:
   ```bash
   # Verify DB is running and accessible
   nc -zv db.example.com 5432
   psql -U user -d database -c "SELECT 1"
   ```

2. Check Redis connectivity:
   ```bash
   # Verify Redis is running
   redis-cli PING
   # Should return: PONG
   ```

3. Check application logs:
   ```bash
   # Look for full error messages
   tail -50 app.log | grep -A 5 "\[Homepage\] Error"
   ```

4. Restart services if needed:
   ```bash
   # Restart Flask
   systemctl restart flask-app
   
   # Verify Redis
   systemctl restart redis
   ```

### Issue 3: Cache Not Working (X-Cache always MISS)

**Symptoms**:
- X-Cache showing MISS on every request
- Response times not improving with repeated requests
- High database load

**Diagnosis**:
```bash
# 1. Check if Redis is working
redis-cli PING

# 2. Check if cache keys exist
redis-cli KEYS "mizizzi:homepage:*"

# 3. Check cache TTL
redis-cli TTL "mizizzi:homepage:categories"
# -1 means key doesn't expire
# -2 means key doesn't exist

# 4. Check Redis memory
redis-cli INFO memory | grep "used_memory"
```

**Solutions**:
1. Verify Redis connection in app:
   ```python
   from app.utils.redis_cache import product_cache
   print(product_cache)  # Should not be None
   product_cache.set("test", "value", 60)
   print(product_cache.get("test"))  # Should return "value"
   ```

2. Clear and rebuild cache:
   ```bash
   # Clear all homepage caches
   redis-cli DEL mizizzi:homepage:*
   
   # Make a request to warm cache
   curl http://localhost:5000/api/homepage
   
   # Verify cache is working
   curl http://localhost:5000/api/homepage  # Should show X-Cache: HIT
   ```

3. Check Redis configuration:
   ```bash
   # Verify Redis has enough memory
   redis-cli CONFIG GET maxmemory
   
   # Adjust if needed
   redis-cli CONFIG SET maxmemory 512mb
   ```

### Issue 4: Database Query Count Increased (Regression)

**Symptoms**:
- Application logs show more queries than expected
- Database CPU usage increased
- Response times degraded

**Diagnosis**:
```bash
# 1. Count queries per request
# Enable query logging in Flask:
app.config['SQLALCHEMY_ECHO'] = True

# 2. Run a single homepage request and count "SELECT" statements
curl http://localhost:5000/api/homepage 2>&1 | grep SELECT | wc -l

# 3. Compare with baseline (~13-17 queries expected)
```

**Solutions**:
1. Check if COUNT query was accidentally re-added:
   ```bash
   grep -n "\.count()" backend/app/services/homepage/get_homepage_all_products.py
   # Should NOT find any count() calls in this file
   ```

2. Check if JSON parsing was re-added to serializer:
   ```bash
   grep -n "json.loads\|image_urls\[0\]" backend/app/routes/products/serializers.py
   # serialize_product_minimal should NOT have these
   ```

3. Verify optimizations are in place:
   ```bash
   # Check for the optimization comment
   grep -n "OPTIMIZATION:" backend/app/routes/products/serializers.py
   grep -n "OPTIMIZATION:" backend/app/services/homepage/get_homepage_all_products.py
   ```

---

## Performance Baseline

These are expected values after optimization:

### Cold Request (Cache Miss)
- Aggregation time: 30-50 seconds (improved from 46.5s)
- Queries: 13-17
- X-Cache header: MISS
- Expected: Once per 3 minutes (cache TTL)

### Cached Request (Cache Hit)  
- Total time: <50ms
- Aggregation time: 0ms (cached)
- Queries: 0 (served from Redis)
- X-Cache header: HIT
- Expected: 95%+ of requests

### Partial Failures
- X-Partial-Failures header: Should be empty
- X-Cache header: BYPASS
- Expected: <1% of requests

---

## Common Errors and Solutions

### Error 1: "SQLALCHEMY_TRACK_MODIFICATIONS not set"
```python
# Solution: Add to Flask config
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
```

### Error 2: "Connection pool exhausted"
```
Error: (psycopg2.OperationalError) sorry, too many clients already
```

**Solution**:
```python
# Increase connection pool size
from sqlalchemy import create_engine
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Increase from default 5
    max_overflow=40  # Increase from default 10
)
```

### Error 3: "Redis connection refused"
```
Error: [Errno 111] Connection refused
```

**Solution**:
```bash
# Check if Redis is running
systemctl status redis
# or
ps aux | grep redis

# Start Redis
systemctl start redis
# or
redis-server /etc/redis/redis.conf
```

### Error 4: "JSON decode error"
```
Error: json.decoder.JSONDecodeError: ...
```

**Solution**:
```python
# Verify product image_urls are valid JSON
SELECT id, image_urls FROM products WHERE image_urls IS NOT NULL LIMIT 5;
# Check if all are valid JSON strings

# Fix corrupted data if found
UPDATE products SET image_urls = '[]' WHERE image_urls IS NULL OR image_urls = '';
```

---

## Performance Optimization Checklist

### Pre-Deployment
- [ ] Run benchmark script (should show 25-30% improvement)
- [ ] Verify cache headers (X-Cache: HIT after second request)
- [ ] Check error logs (should be empty)
- [ ] Test with various pagination params
- [ ] Load test with concurrent requests

### Post-Deployment
- [ ] Monitor response times for 1 hour
- [ ] Verify cache hit rate increases over time
- [ ] Check error rates (should be <1%)
- [ ] Verify database query count (13-17 per cold request)
- [ ] Set up alerts for slow requests

### Ongoing Monitoring
- [ ] Daily check of X-Aggregation-Time-Ms (should stay <30s)
- [ ] Weekly check of cache hit rate (should stay >95%)
- [ ] Monthly database index verification
- [ ] Monthly log review for errors/warnings

---

## Related Documentation

- **Performance Report**: `OPTIMIZATION_REPORT.md`
- **Code Changes**: `CODE_CHANGES_REFERENCE.md`
- **Optimization Summary**: `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- **Benchmark Script**: `scripts/benchmark_homepage_performance.py`

---

## Support & Escalation

### Tier 1 Support (Team Can Handle)
- [ ] Check X-Cache headers
- [ ] Review application logs
- [ ] Clear Redis cache and rebuild
- [ ] Verify database connectivity

### Tier 2 Support (Escalate)
- [ ] Database performance tuning
- [ ] Redis cluster issues
- [ ] Infrastructure scaling
- [ ] Network optimization

### Emergency Procedures

**If production is down**:
1. Revert changes: `git checkout backend/app/`
2. Restart Flask: `systemctl restart flask-app`
3. Clear cache: `redis-cli FLUSHALL`
4. Verify: `curl http://localhost:5000/api/homepage`

**If response time is critical** (>60s):
1. Clear cache: `redis-cli DEL mizizzi:homepage:*`
2. Check database: `SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5`
3. Restart services if necessary
4. Escalate to database team for query analysis
