## Safe Cold-Start Optimization Plan (Post-Refactor)

**Current State (After Refactor):**
- Architecture: Safe, correct, synchronous execution in Flask context
- Performance: Reliable but slow on cold start (25-50s)
- Goal: Improve cold-start without unsafe threading

### Strategy: Rely on Caching + Database Optimization

The ThreadPoolExecutor approach was fundamentally broken (Flask context errors). The right approach is:

**Layer 1: Cache Warming** (Fastest, safest improvement)
- Keep top-level homepage cache warm with background refresh
- Pre-aggregate critical sections on deployment startup
- Refresh cache before expiration (not after)
- Result: 95%+ of production requests hit cache (<50ms)

**Layer 2: Database Query Optimization** (Medium effort, significant impact)
- Profile slow queries in aggregator logs
- Add indexes on high-volume queries (categories_id, status, etc.)
- Check for N+1 queries in featured product loaders
- Consider query batching for related sections
- Result: Cold-start drops from 25-50s to 10-20s

**Layer 3: Payload Reduction** (Quick wins)
- Analyze which sections are slowest (profile first)
- Reduce default limits for large result sets
- Remove unnecessary fields from responses
- Implement lazy pagination for all_products
- Result: Each section query faster + less data serialization

**Layer 4: Frontend-Only Staged Loading** (Already deployed)
- Frontend fetches critical path first
- Deferred sections load in background with Suspense
- User sees main content while other sections load
- Result: Perceived speed ~50-60% improvement for frontend

### Implementation Order

1. **Profile First** (1-2 hours)
   - Run aggregator with detailed logging
   - Record timing for each section
   - Identify slowest sections
   - Check for obvious N+1 queries

2. **Database Indexes** (2-3 hours)
   - Review slow query logs
   - Add missing indexes
   - Test query performance
   - Measure improvement

3. **Cache Warming** (1-2 hours)
   - Implement startup cache warm
   - Background refresh before expiration
   - Measure cold-start reduction
   - Expected: 80-90% reduction for cached requests

4. **Payload Reduction** (Based on profiling)
   - Reduce limits for large sections
   - Remove unnecessary fields
   - Add pagination/lazy loading
   - Measure per-section improvement

### Why NOT Parallel/Threading

Threading approaches fail because:
- Flask application context NOT thread-safe for database operations
- Each thread needs its own DB session + connection
- Errors in threads are hidden (no stack traces)
- Hidden failures can be cached and served as valid
- ThreadPoolExecutor causes context errors (we just fixed this)

**Correct approach:** Safe sequential code + strategic caching

### Expected Results After Full Optimization

| Scenario | Before Refactor | After Refactor (Sync) | After Optimization | Improvement |
|----------|-----------------|----------------------|-------------------|-------------|
| Cold Start | 25-50s | 25-50s | 5-10s | 75-80% |
| Warm Start (Cached) | <50ms | <50ms | <50ms | Same (already fast) |
| With Cache Warming | N/A | N/A | <50ms for 95%+ | 99% requests fast |

### Success Metrics

- [ ] Aggregator logs show <2s per section
- [ ] Cache hit ratio >90% in production
- [ ] Cold-start <10s on first request after cache expiry
- [ ] No "Working outside of application context" errors
- [ ] All sections load successfully (partial_failures = [])

---

**Next Action:** Profile current aggregator to identify optimization targets. No code changes until profiling complete.
