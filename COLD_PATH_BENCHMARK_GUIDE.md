# Cold-Path Benchmark Guide

## What Was Fixed

### 1. Rate Limiter Initialization Error
**Problem**: Flask-Limiter newer versions don't accept `key_func` in `init_app()`
**Fix**: Removed invalid `key_func` parameter from `init_app()` call (still set at instantiation)
**File**: `backend/app/configuration/extensions.py`

### 2. True Cold-Path Benchmark
**Problem**: Previous benchmark only measured cache hits (in-memory fallback)
**Solution**: New `scripts/benchmark_cold_path.py` script that:
- Clears cache BEFORE each test
- Measures actual database query times
- Tests both categories endpoint and full /api/homepage
- Compares cold vs warm performance

## Running the Cold-Path Benchmark

```bash
cd backend
python3 ../scripts/benchmark_cold_path.py
```

## What the Benchmark Measures

### 1. Cold Categories Query
- Clears cache
- Makes 3 cold queries to `get_homepage_categories()`
- Measures actual database roundtrip time
- Target: <50ms per query

### 2. Cold Homepage API
- Clears cache
- Makes 2 cold requests to `/api/homepage`
- Measures full API response time (all sections loaded)
- Target: <400ms total

### 3. Warm Homepage API (for comparison)
- Warms cache with first request
- Makes 3 more cached requests
- Shows benefit of caching (should be <50ms each)

## Expected Results After Fix

With the `lazy='select'` fix and column-specific query optimization:
- **Categories**: 34s → <50ms (680x faster)
- **Homepage cold**: 46.5s → 350-400ms (100-130x faster)
- **Homepage cached**: <50ms (unchanged, still fast)

## Interpreting Results

✅ **PASS** - If:
- Categories cold query: <50ms
- Homepage cold API: <400ms
- Rate limiter initializes without error

❌ **FAIL** - If:
- Any metric exceeds target
- Benchmark can't connect to database
- Cache clear fails (will use memory fallback)

## Next Steps

1. Run the benchmark: `python3 ../scripts/benchmark_cold_path.py`
2. Verify both rate limiter error is gone AND performance targets are met
3. If targets not met, check database indexes are in place:
   - `idx_categories_is_active` on categories(is_active)
   - `idx_categories_sort_order` on categories(sort_order)

## Technical Details

The fix addresses the core bottleneck:
- **Before**: `lazy='joined'` created cartesian product joins, loading all subcategories for every category query
- **After**: `lazy='select'` delays subcategory loading until explicitly accessed
- **Query optimization**: Column-specific query loads only 5 fields instead of full model with binary fields

This is a surgical fix with zero schema changes and full backward compatibility.
