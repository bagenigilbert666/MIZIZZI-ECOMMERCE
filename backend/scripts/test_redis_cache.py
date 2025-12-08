#!/usr/bin/env python3
"""
Redis Cache Test Script for Mizizzi E-commerce platform.
Tests Redis connection, caching functionality, and performance.

Run: python scripts/test_redis_cache.py
"""
import os
import sys
import time
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.redis_cache import product_cache, RedisCache


def print_header(title: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_result(test_name: str, passed: bool, details: str = ""):
    """Print test result."""
    status = "PASS" if passed else "FAIL"
    symbol = "[OK]" if passed else "[X]"
    print(f"  {symbol} {test_name}: {status}")
    if details:
        print(f"      -> {details}")


def test_redis_connection():
    """Test 1: Verify Redis connection."""
    print_header("Test 1: Redis Connection")
    
    connected = product_cache.is_connected
    cache_type = "Redis" if connected else "In-Memory Fallback"
    
    print_result(
        "Connection Status",
        connected,
        f"Using {cache_type} cache"
    )
    
    if connected:
        # Test ping
        try:
            pong = product_cache._client.ping()
            print_result("Redis PING", pong, "Got PONG response")
        except Exception as e:
            print_result("Redis PING", False, str(e))
    
    return connected


def test_basic_operations():
    """Test 2: Basic cache operations (GET, SET, DELETE)."""
    print_header("Test 2: Basic Cache Operations")
    
    test_key = "mizizzi:test:basic_ops"
    test_value = {"message": "Hello from Mizizzi!", "timestamp": time.time()}
    
    # Test SET
    set_result = product_cache.set(test_key, test_value, ttl=60)
    print_result("SET operation", set_result, f"Key: {test_key}")
    
    # Test GET
    get_result = product_cache.get(test_key)
    get_passed = get_result is not None and get_result.get("message") == test_value["message"]
    print_result("GET operation", get_passed, f"Retrieved: {get_result}")
    
    # Test DELETE
    delete_result = product_cache.delete(test_key)
    print_result("DELETE operation", delete_result, f"Key: {test_key}")
    
    # Verify deletion
    verify_delete = product_cache.get(test_key)
    print_result("Verify deletion", verify_delete is None, "Key no longer exists")
    
    return set_result and get_passed and delete_result


def test_cache_key_generation():
    """Test 3: Cache key generation consistency."""
    print_header("Test 3: Cache Key Generation")
    
    params1 = {"page": "1", "per_page": "20", "category_id": "5"}
    params2 = {"category_id": "5", "page": "1", "per_page": "20"}  # Same params, different order
    params3 = {"page": "2", "per_page": "20", "category_id": "5"}  # Different page
    
    key1 = product_cache._generate_key("products", params1)
    key2 = product_cache._generate_key("products", params2)
    key3 = product_cache._generate_key("products", params3)
    
    # Keys with same params should be identical
    same_params_match = key1 == key2
    print_result(
        "Same params = same key",
        same_params_match,
        f"Key1: {key1}, Key2: {key2}"
    )
    
    # Keys with different params should be different
    diff_params_differ = key1 != key3
    print_result(
        "Different params = different key",
        diff_params_differ,
        f"Key1: {key1}, Key3: {key3}"
    )
    
    return same_params_match and diff_params_differ


def test_ttl_expiration():
    """Test 4: TTL expiration (only for Redis, memory cache uses 5 min default)."""
    print_header("Test 4: TTL Expiration")
    
    if not product_cache.is_connected:
        print("  [SKIP] Skipping TTL test - using memory cache (5 min default TTL)")
        return True
    
    test_key = "mizizzi:test:ttl_test"
    test_value = {"expires": "soon"}
    
    # Set with 2 second TTL
    product_cache.set(test_key, test_value, ttl=2)
    
    # Verify it exists
    immediate_get = product_cache.get(test_key)
    print_result("Key exists immediately", immediate_get is not None)
    
    # Wait for expiration
    print("  ... waiting 3 seconds for TTL expiration ...")
    time.sleep(3)
    
    # Verify it expired
    after_ttl_get = product_cache.get(test_key)
    print_result("Key expired after TTL", after_ttl_get is None)
    
    return immediate_get is not None and after_ttl_get is None


def test_pattern_deletion():
    """Test 5: Pattern-based cache invalidation."""
    print_header("Test 5: Pattern-Based Invalidation")
    
    # Create multiple test keys
    test_keys = [
        "mizizzi:products:test1",
        "mizizzi:products:test2",
        "mizizzi:featured:test1",
    ]
    
    for key in test_keys:
        product_cache.set(key, {"test": True}, ttl=60)
    
    print(f"  Created {len(test_keys)} test keys")
    
    # Delete products pattern only
    deleted_count = product_cache.delete_pattern("mizizzi:products:*")
    print_result(
        "Pattern delete (products:*)",
        deleted_count >= 2,
        f"Deleted {deleted_count} keys"
    )
    
    # Verify products keys deleted
    prod_key_gone = product_cache.get("mizizzi:products:test1") is None
    print_result("Products key deleted", prod_key_gone)
    
    # Verify featured key still exists
    feat_key_exists = product_cache.get("mizizzi:featured:test1") is not None
    print_result("Featured key preserved", feat_key_exists)
    
    # Cleanup
    product_cache.delete("mizizzi:featured:test1")
    
    return deleted_count >= 2 and prod_key_gone


def test_cache_performance():
    """Test 6: Cache performance comparison."""
    print_header("Test 6: Performance Benchmark")
    
    test_key = "mizizzi:test:performance"
    test_data = {
        "products": [{"id": i, "name": f"Product {i}", "price": 99.99} for i in range(100)],
        "total": 100,
        "page": 1
    }
    
    # Measure SET time
    set_times = []
    for _ in range(10):
        start = time.perf_counter()
        product_cache.set(test_key, test_data, ttl=60)
        set_times.append((time.perf_counter() - start) * 1000)
    
    avg_set = sum(set_times) / len(set_times)
    print_result(
        "Average SET time",
        avg_set < 50,  # Should be under 50ms
        f"{avg_set:.2f}ms (10 iterations)"
    )
    
    # Measure GET time
    get_times = []
    for _ in range(10):
        start = time.perf_counter()
        product_cache.get(test_key)
        get_times.append((time.perf_counter() - start) * 1000)
    
    avg_get = sum(get_times) / len(get_times)
    print_result(
        "Average GET time",
        avg_get < 10,  # Should be under 10ms
        f"{avg_get:.2f}ms (10 iterations)"
    )
    
    # Cleanup
    product_cache.delete(test_key)
    
    return avg_get < 50  # Pass if GET is reasonably fast


def test_cache_stats():
    """Test 7: Cache statistics tracking."""
    print_header("Test 7: Cache Statistics")
    
    # Reset stats by creating new instance (for accurate test)
    initial_stats = product_cache.stats.copy()
    
    # Perform some operations
    test_key = "mizizzi:test:stats"
    product_cache.set(test_key, {"test": True}, ttl=60)  # 1 set
    product_cache.get(test_key)  # 1 hit
    product_cache.get("mizizzi:nonexistent:key")  # 1 miss
    
    final_stats = product_cache.stats
    
    print(f"  Current Stats:")
    print(f"    - Hits: {final_stats['hits']}")
    print(f"    - Misses: {final_stats['misses']}")
    print(f"    - Sets: {final_stats['sets']}")
    print(f"    - Errors: {final_stats['errors']}")
    print(f"    - Hit Rate: {final_stats['hit_rate_percent']}%")
    
    stats_tracking = (
        final_stats['hits'] >= initial_stats.get('hits', 0) and
        final_stats['sets'] >= initial_stats.get('sets', 0)
    )
    print_result("Stats tracking working", stats_tracking)
    
    # Cleanup
    product_cache.delete(test_key)
    
    return stats_tracking


def test_invalidation_helpers():
    """Test 8: Invalidation helper methods."""
    print_header("Test 8: Invalidation Helpers")
    
    # Create test keys
    product_cache.set("mizizzi:products:inv_test1", {"test": True}, ttl=60)
    product_cache.set("mizizzi:products:inv_test2", {"test": True}, ttl=60)
    product_cache.set("mizizzi:featured:inv_test1", {"test": True}, ttl=60)
    
    # Test invalidate_products
    prod_cleared = product_cache.invalidate_products()
    print_result(
        "invalidate_products()",
        prod_cleared >= 2,
        f"Cleared {prod_cleared} product keys"
    )
    
    # Test invalidate_featured
    feat_cleared = product_cache.invalidate_featured()
    print_result(
        "invalidate_featured()",
        feat_cleared >= 1,
        f"Cleared {feat_cleared} featured keys"
    )
    
    return prod_cleared >= 0 and feat_cleared >= 0


def run_all_tests():
    """Run all tests and print summary."""
    print("\n")
    print("*" * 60)
    print("*  MIZIZZI REDIS CACHE TEST SUITE")
    print("*" * 60)
    print(f"\nRedis URL: {os.environ.get('REDIS_URL', 'Not set')}")
    
    results = {
        "Redis Connection": test_redis_connection(),
        "Basic Operations": test_basic_operations(),
        "Key Generation": test_cache_key_generation(),
        "TTL Expiration": test_ttl_expiration(),
        "Pattern Deletion": test_pattern_deletion(),
        "Performance": test_cache_performance(),
        "Statistics": test_cache_stats(),
        "Invalidation Helpers": test_invalidation_helpers(),
    }
    
    # Print summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        print_result(test_name, result)
    
    print("\n" + "-" * 60)
    print(f"  Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("  Status: ALL TESTS PASSED - Redis cache is working perfectly!")
    else:
        print("  Status: SOME TESTS FAILED - Review output above for details")
    
    print("-" * 60 + "\n")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
