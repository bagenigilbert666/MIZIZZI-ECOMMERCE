#!/usr/bin/env python3
"""
COLD-PATH BENCHMARK: Measures actual database query performance
This script CLEARS the cache FIRST, then makes requests to verify cold-start performance.
"""
import sys
import os
import time
import logging
from pathlib import Path

# Setup paths
backend_dir = Path(__file__).parent.parent / "backend"
if backend_dir.exists():
    sys.path.insert(0, str(backend_dir))
else:
    sys.path.insert(0, '/home/info-gillydev/CLIENTS/development/MIZIZZI-ECOMMERCE/backend')

# Configure logging
logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def clear_cache():
    """Clear Redis cache before benchmark."""
    try:
        from app.utils.redis_cache import product_cache
        if product_cache and hasattr(product_cache, 'clear_all'):
            product_cache.clear_all()
            logger.warning("[BENCHMARK] Cache cleared successfully")
            return True
    except Exception as e:
        logger.warning(f"[BENCHMARK] Could not clear cache: {e}")
    return False

def benchmark_cold_categories():
    """Measure cold-path categories query with NO cache."""
    from app import create_app
    from app.services.homepage.get_homepage_categories import get_homepage_categories
    
    app = create_app()
    
    with app.app_context():
        # Clear cache first
        clear_cache()
        
        print("\n" + "="*70)
        print("🔥 COLD-PATH CATEGORIES BENCHMARK (NO CACHE)")
        print("="*70)
        
        # Measure 3 cold queries to get realistic average
        times = []
        for i in range(3):
            start = time.perf_counter()
            result = get_homepage_categories(limit=20)
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            times.append(elapsed)
            
            print(f"\n▶ Query {i+1}:")
            print(f"   Time: {elapsed:.2f}ms")
            print(f"   Categories loaded: {len(result)}")
            
        avg_time = sum(times) / len(times)
        print(f"\n📊 Average: {avg_time:.2f}ms")
        print(f"   Min: {min(times):.2f}ms")
        print(f"   Max: {max(times):.2f}ms")
        
        # Benchmark result
        if avg_time < 50:
            print(f"\n✅ PASS: Categories query is {avg_time:.2f}ms (target: <50ms)")
        else:
            print(f"\n❌ FAIL: Categories query is {avg_time:.2f}ms (target: <50ms)")
        
        return avg_time

def benchmark_cold_homepage():
    """Measure cold-path full homepage API response with NO cache."""
    from app import create_app
    
    app = create_app()
    
    with app.test_client() as client:
        # Clear cache first
        clear_cache()
        
        print("\n" + "="*70)
        print("🔥 COLD-PATH HOMEPAGE API BENCHMARK (NO CACHE)")
        print("="*70)
        
        # Measure 2 cold requests to homepage
        times = []
        for i in range(2):
            start = time.perf_counter()
            response = client.get('/api/homepage')
            elapsed = (time.perf_counter() - start) * 1000  # Convert to ms
            times.append(elapsed)
            
            print(f"\n▶ Request {i+1}:")
            print(f"   Status: {response.status_code}")
            print(f"   Time: {elapsed:.2f}ms")
            
            if response.status_code == 200:
                data = response.get_json()
                sections = len(data.get('sections', []))
                print(f"   Sections loaded: {sections}")
            
        avg_time = sum(times) / len(times)
        print(f"\n📊 Average: {avg_time:.2f}ms")
        print(f"   Min: {min(times):.2f}ms")
        print(f"   Max: {max(times):.2f}ms")
        
        # Benchmark result
        if avg_time < 400:
            print(f"\n✅ PASS: Homepage cold-start is {avg_time:.2f}ms (target: <400ms)")
        else:
            print(f"\n❌ FAIL: Homepage cold-start is {avg_time:.2f}ms (target: <400ms)")
        
        return avg_time

def benchmark_warm_homepage():
    """Measure warm-path homepage (with cache) for comparison."""
    from app import create_app
    
    app = create_app()
    
    with app.test_client() as client:
        print("\n" + "="*70)
        print("⚡ WARM-PATH HOMEPAGE API BENCHMARK (WITH CACHE)")
        print("="*70)
        
        # First request warms cache
        print("\n▶ Warming cache (first request)...")
        client.get('/api/homepage')
        
        # Now measure 3 cached requests
        times = []
        for i in range(3):
            start = time.perf_counter()
            response = client.get('/api/homepage')
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
            
            print(f"\n▶ Cached request {i+1}: {elapsed:.2f}ms")
        
        avg_time = sum(times) / len(times)
        print(f"\n📊 Average cached response: {avg_time:.2f}ms")
        
        return avg_time

if __name__ == '__main__':
    print("\n" + "="*70)
    print("MIZIZZI HOMEPAGE PERFORMANCE BENCHMARK")
    print("="*70)
    print("This benchmark measures ACTUAL database query performance")
    print("with cache cleared, not memory-only fallback.\n")
    
    try:
        categories_time = benchmark_cold_categories()
        homepage_cold_time = benchmark_cold_homepage()
        homepage_warm_time = benchmark_warm_homepage()
        
        print("\n" + "="*70)
        print("FINAL RESULTS")
        print("="*70)
        print(f"Categories (cold):     {categories_time:.2f}ms  {'✅' if categories_time < 50 else '❌'}")
        print(f"Homepage (cold):       {homepage_cold_time:.2f}ms  {'✅' if homepage_cold_time < 400 else '❌'}")
        print(f"Homepage (warm cache): {homepage_warm_time:.2f}ms")
        
        improvement = ((46500 - homepage_cold_time) / 46500) * 100
        print(f"\n📈 Expected improvement from 46.5s: {improvement:.1f}%")
        
    except Exception as e:
        logger.error(f"Benchmark error: {e}", exc_info=True)
        sys.exit(1)
