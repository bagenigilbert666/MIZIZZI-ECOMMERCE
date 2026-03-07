# Redis Batch Patch - Verification Checklist

## Pre-Deployment Verification

### Backward Compatibility
- [ ] Read cache_utils.py and verify `HOMEPAGE_SECTIONS_FOR_BATCH` keys match current Redis patterns
- [ ] Confirm `build_section_cache_key()` logic unchanged
- [ ] Verify all SECTIONS_CACHE_TTL values preserved
- [ ] Check that batch_get_homepage_sections() deserializes JSON correctly

### Aggregator Correctness
- [ ] Verify batch_get_homepage_sections() imported correctly
- [ ] Check redis_client imported from app.cache.redis_client
- [ ] Confirm each section has cache-first logic (check batch_cache_results)
- [ ] Verify loaders still called with correct parameters
- [ ] Check all_succeeded logic unchanged (still False if any loader fails)
- [ ] Confirm response structure identical (homepage_data keys unchanged)

### Thread Safety
- [ ] Verify no new threading imports added
- [ ] Confirm all Redis operations in single Flask request context
- [ ] Check no async/await keywords introduced
- [ ] Verify no use of ThreadPoolExecutor or multiprocessing

### Error Handling
- [ ] Verify batch_get_homepage_sections() returns {} on error
- [ ] Check loaders still called if batch fails
- [ ] Confirm exceptions in loaders still caught by load_section_safe()
- [ ] Verify logging still matches existing patterns
- [ ] Check partial_failures list still accurate

## Deployment Verification

### Staging Environment
- [ ] Deploy code to staging
- [ ] Verify Flask application starts without errors
- [ ] Check logs for import errors or initialization issues
- [ ] Test `/api/homepage` endpoint returns valid response
- [ ] Verify response structure matches production schema

### Cache Hit Testing (Staging)
- [ ] Make first request to `/api/homepage` (cache miss)
- [ ] Check logs for MGET operation
- [ ] Verify aggregation_time_ms indicates DB loading
- [ ] Make second request within cache TTL (should be cache hit)
- [ ] Check logs show cache hit (should skip aggregator entirely)

### Cache Miss Latency (Staging)
- [ ] Prime cache with first request
- [ ] Clear relevant Redis keys manually
- [ ] Make request to trigger cache miss
- [ ] Measure time from MGET call to response
- [ ] Compare to pre-patch measurements
- [ ] Verify ~130ms latency improvement (if was bottleneck)

### Error Handling (Staging)
- [ ] Simulate Redis failure (stop Upstash or timeout)
- [ ] Verify aggregator falls back to individual loaders
- [ ] Confirm homepage response still served
- [ ] Check error logging is informative
- [ ] Verify no uncaught exceptions

### Mixed Cache Scenarios (Staging)
- [ ] Cache some sections, miss others
- [ ] Verify correct mix of cached/fresh data
- [ ] Check aggregation_time_ms reflects which sections loaded from DB
- [ ] Confirm response correctness

## Production Deployment

### Pre-Deployment
- [ ] Code review completed
- [ ] All staging tests passed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

### Deployment
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Check response latencies
- [ ] Verify no spike in Redis errors

### Post-Deployment Monitoring (24 hours)
- [ ] Monitor Redis operation latencies
- [ ] Check aggregation_time_ms in logs
- [ ] Verify cache hit rate
- [ ] Monitor error rates for homepage endpoint
- [ ] Check CPU/memory usage stable

## Specific Things to Verify

### MGET Behavior
```python
# Verify MGET returns values in same order as keys
# batch_get_homepage_sections() relies on zip(section_order, values)
# If order mismatched, sections will get wrong cache data
```

### JSON Deserialization
```python
# Verify batch_get_homepage_sections() correctly deserializes JSON
# Check that section data types match expected (dicts, lists, etc.)
# Verify no "result.result" nesting issues
```

### Section Limits
```python
# Verify batch_get_homepage_sections() correctly builds cache keys with limits
# All-products section needs (limit, page) - verify both parameters used
# Other sections need just limit - verify correct
```

### Cache Hit/Miss Semantics
```python
# Verify cache hits skip loaders entirely
# Check logs show "from cache" messages
# Confirm aggregation_time_ms is <10ms for hits, >100ms for misses
```

## Rollback Checklist

If issues found:

- [ ] Identify root cause in logs
- [ ] Stop Flask application
- [ ] Revert aggregator.py to original (remove batch_get calls)
- [ ] Revert cache_utils.py to original (remove batch functions)
- [ ] Restart Flask application
- [ ] Verify homepage endpoint works
- [ ] Document issue for investigation

## Success Criteria

Homepage should work identically to before, but faster on cache misses:

- [ ] Response shape unchanged
- [ ] All sections load correctly
- [ ] Error handling preserves semantics
- [ ] Cache hits <10ms (unchanged)
- [ ] Cache misses ~20-100ms (was 150-240ms)
- [ ] No new errors in logs
- [ ] No thread/connection issues
- [ ] No memory leaks
