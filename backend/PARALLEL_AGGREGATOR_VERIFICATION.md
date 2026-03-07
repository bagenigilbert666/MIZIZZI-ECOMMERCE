# Parallel Aggregator - Verification Checklist

## Pre-Deployment Checks

### Code Review
- Read `backend/app/services/homepage/aggregator.py` changes
- Verify ThreadPoolExecutor imports added
- Confirm `max_workers=7` for full aggregator
- Confirm `max_workers=3` for critical aggregator

### Local Testing
- Run backend locally
- Check startup logs for "PARALLEL with ThreadPoolExecutor"
- No import errors or syntax issues
- Database connection works

## Deployment Steps

### 1. Verify Backend Started
```bash
# Check logs for startup success
tail -f /var/log/mizizzi/backend.log | head -50
# Should see: [Homepage] PARALLEL with ThreadPoolExecutor
```

### 2. Clear Cache (Force Cold Start)
```bash
# Clear homepage cache
redis-cli KEYS "mizizzi:homepage*" | xargs redis-cli DEL
```

### 3. Test Cold Start
```bash
curl -s http://localhost:5000/api/homepage | jq .meta
# Expected: aggregation_time_ms between 4000-8000 (4-8 seconds)
# New field: loading_mode: "parallel"
```

### 4. Test Warm Start (Cache Hit)
```bash
curl -s http://localhost:5000/api/homepage | jq .meta
# Expected: aggregation_time_ms < 50 (from cache)
```

### 5. Test Critical Path
```bash
redis-cli KEYS "mizizzi:homepage:critical*" | xargs redis-cli DEL
curl -s http://localhost:5000/api/homepage/critical | jq .meta
# Expected: aggregation_time_ms between 1000-3000 (1-3 seconds)
```

### 6. Verify Parallel Execution
```bash
tail -f /var/log/mizizzi/backend.log | grep "Section loaded"
# Should see sections in RANDOM order (proof of parallelism)
# NOT in sequential 1,2,3,4 order
```

## Success Criteria

- [ ] Aggregation time is 4-8s (not 25-50s)
- [ ] loading_mode field shows "parallel"
- [ ] Section logs appear in random order
- [ ] Cache working (warm start <50ms)
- [ ] All sections returned (even if some fail)
- [ ] No import errors or crashes

## Performance Expectations

**Cold Start:**
- Before: 25-50 seconds
- After: 4-8 seconds
- Improvement: 75-85% faster

**Warm Start:**
- Before: <50ms
- After: <50ms
- Improvement: None (both cached)

## Rollback Command

If needed:
```bash
git revert <commit-hash>
systemctl restart mizizzi-backend
```
