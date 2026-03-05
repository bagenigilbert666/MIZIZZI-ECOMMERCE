#!/usr/bin/env python3
"""
Test Upstash Redis Connection and Cache Integration

This comprehensive test script verifies:
  - Upstash Redis credentials and connectivity
  - Redis REST API operations (set, get, delete)
  - JSON serialization and caching
  - Cache manager integration
  - Performance metrics

Run this to verify your Redis setup is working correctly.

Usage:
    cd backend
    python scripts/test_redis_connection.py
"""
import os
import sys
import time
import json
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)


def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


def test_environment():
    """Test that environment variables are set."""
    print("\n[1] Checking Environment Variables")
    print("-" * 70)
    
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or os.environ.get('KV_REST_API_URL')
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or os.environ.get('KV_REST_API_TOKEN')
    
    url_status = "✅ SET" if url else "❌ NOT SET"
    token_status = "✅ SET" if token else "❌ NOT SET"
    
    print(f"  UPSTASH_REDIS_REST_URL:   {url_status}")
    if url:
        print(f"    └─ {url[:50]}...")
    
    print(f"  UPSTASH_REDIS_REST_TOKEN: {token_status}")
    if token:
        print(f"    └─ {token[:30]}...")
    
    if not url or not token:
        print("\n❌ ERROR: Missing Upstash credentials!")
        print("\nSet environment variables:")
        print("  export UPSTASH_REDIS_REST_URL='https://your-url.upstash.io'")
        print("  export UPSTASH_REDIS_REST_TOKEN='your-token-here'")
        return False
    
    print("\n✅ Environment variables configured")
    return True


def test_upstash_package():
    """Test that upstash-redis package is installed."""
    print("\n[2] Checking upstash-redis Package")
    print("-" * 70)
    
    try:
        from upstash_redis import Redis as UpstashRedis
        print("  ✅ upstash-redis package imported successfully")
        return True
    except ImportError as e:
        print(f"  ❌ Failed to import upstash-redis: {e}")
        print("\n  Install with: pip install upstash-redis")
        return False


def test_direct_connection():
    """Test direct connection to Upstash Redis."""
    print("\n[3] Testing Direct Upstash Connection")
    print("-" * 70)
    
    url = os.environ.get('UPSTASH_REDIS_REST_URL') or os.environ.get('KV_REST_API_URL')
    token = os.environ.get('UPSTASH_REDIS_REST_TOKEN') or os.environ.get('KV_REST_API_TOKEN')
    
    try:
        from upstash_redis import Redis as UpstashRedis
        
        print(f"  Connecting to: {url}")
        client = UpstashRedis(url=url, token=token)
        print("  ✅ Client created")
        
        # Test ping
        response = client.ping()
        print(f"  ✅ Ping successful: {response}")
        
        return True, client
    except Exception as e:
        print(f"  ❌ Connection failed: {e}")
        return False, None


def test_basic_operations(client):
    """Test basic Redis operations."""
    print("\n[4] Testing Basic Redis Operations")
    print("-" * 70)
    
    if not client:
        print("  ⚠️ Skipping - no client available")
        return False
    
    try:
        # Test SET
        test_key = f"mizizzi:test:{int(time.time() * 1000)}"
        test_value = "test_value_12345"
        
        start = time.time()
        client.set(test_key, test_value, ex=60)
        set_time = (time.time() - start) * 1000
        print(f"  ✅ SET operation: {set_time:.2f}ms")
        
        # Test GET
        start = time.time()
        retrieved = client.get(test_key)
        get_time = (time.time() - start) * 1000
        
        if retrieved == test_value:
            print(f"  ✅ GET operation: {get_time:.2f}ms")
        else:
            print(f"  ❌ GET returned wrong value: {retrieved}")
            return False
        
        # Test DELETE
        start = time.time()
        client.delete(test_key)
        del_time = (time.time() - start) * 1000
        print(f"  ✅ DELETE operation: {del_time:.2f}ms")
        
        return True
    except Exception as e:
        print(f"  ❌ Operation failed: {e}")
        return False


def test_json_operations(client):
    """Test JSON serialization with Redis."""
    print("\n[5] Testing JSON Operations")
    print("-" * 70)
    
    if not client:
        print("  ⚠️ Skipping - no client available")
        return False
    
    try:
        # Check if orjson is available
        try:
            import orjson
            json_lib = "orjson"
            print("  📦 Using orjson (fast)")
            
            test_data = {
                "products": [
                    {"id": 1, "name": "Product A", "price": 99.99},
                    {"id": 2, "name": "Product B", "price": 149.99}
                ],
                "timestamp": datetime.now().isoformat()
            }
            
            # Serialize with orjson
            start = time.time()
            json_str = orjson.dumps(test_data, default=str).decode('utf-8')
            serialize_time = (time.time() - start) * 1000
            print(f"  ✅ orjson serialization: {serialize_time:.2f}ms")
            
        except ImportError:
            import json as std_json
            json_lib = "standard json"
            print("  📦 Using standard json library")
            
            test_data = {
                "products": [
                    {"id": 1, "name": "Product A", "price": 99.99},
                    {"id": 2, "name": "Product B", "price": 149.99}
                ],
                "timestamp": datetime.now().isoformat()
            }
            
            # Serialize with standard json
            start = time.time()
            json_str = std_json.dumps(test_data, default=str, separators=(',', ':'))
            serialize_time = (time.time() - start) * 1000
            print(f"  ✅ JSON serialization: {serialize_time:.2f}ms")
        
        # Store JSON in Redis
        test_key = f"mizizzi:json:test:{int(time.time() * 1000)}"
        start = time.time()
        client.set(test_key, json_str, ex=60)
        store_time = (time.time() - start) * 1000
        print(f"  ✅ Store JSON in Redis: {store_time:.2f}ms")
        
        # Retrieve and parse JSON
        start = time.time()
        retrieved_json = client.get(test_key)
        retrieve_time = (time.time() - start) * 1000
        print(f"  ✅ Retrieve JSON from Redis: {retrieve_time:.2f}ms")
        
        # Parse JSON
        if json_lib == "orjson":
            import orjson
            parsed = orjson.loads(retrieved_json)
        else:
            import json as std_json
            parsed = std_json.loads(retrieved_json)
        
        if parsed.get("products", [])[0]["id"] == 1:
            print(f"  ✅ JSON parsing successful")
        
        # Cleanup
        client.delete(test_key)
        
        return True
    except Exception as e:
        print(f"  ❌ JSON operation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cache_manager():
    """Test the cache manager integration."""
    print("\n[6] Testing Cache Manager Integration")
    print("-" * 70)
    
    try:
        from app.cache.cache import cache_manager
        from app.cache.redis_client import is_redis_connected
        
        print(f"  Cache connected: {cache_manager.is_connected}")
        print(f"  Cache type: {'Upstash Redis' if cache_manager.is_connected else 'In-Memory'}")
        
        # Test set/get with cache manager
        test_key = cache_manager.generate_key("test", {"param": "value"})
        test_data = {
            "test": "data",
            "items": [1, 2, 3],
            "timestamp": datetime.now().isoformat()
        }
        
        start = time.time()
        cache_manager.set(test_key, test_data, ttl=60)
        set_time = (time.time() - start) * 1000
        print(f"  ✅ Cache set: {set_time:.2f}ms")
        
        start = time.time()
        retrieved = cache_manager.get(test_key)
        get_time = (time.time() - start) * 1000
        print(f"  ✅ Cache get: {get_time:.2f}ms")
        
        if retrieved and retrieved.get("items") == [1, 2, 3]:
            print(f"  ✅ Cache data integrity verified")
        
        # Print cache statistics
        stats = cache_manager.stats
        print(f"\n  Cache Statistics:")
        print(f"    - Hits: {stats['hits']}")
        print(f"    - Misses: {stats['misses']}")
        print(f"    - Sets: {stats['sets']}")
        print(f"    - Hit Rate: {stats['hit_rate_percent']}%")
        print(f"    - Using orjson: {stats['using_orjson']}")
        
        # Cleanup
        cache_manager.delete(test_key)
        
        return True
    except Exception as e:
        print(f"  ❌ Cache manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_utils_redis_cache():
    """Test the utils/redis_cache.py module."""
    print("\n[7] Testing utils/redis_cache Module")
    print("-" * 70)
    
    try:
        from app.utils.redis_cache import (
            product_cache,
            get_cache_status,
            invalidate_products,
            USING_ORJSON
        )
        
        print(f"  ✅ Module imported successfully")
        print(f"  ✅ Using orjson: {USING_ORJSON}")
        
        # Get cache status
        status = get_cache_status()
        print(f"\n  Cache Status:")
        print(f"    - Connected: {status['connected']}")
        print(f"    - Type: {status['cache_type']}")
        print(f"    - Prefix: {status['prefix']}")
        
        # Test product_cache operations
        test_key = product_cache._cache.generate_key("products", {"category": "test"})
        test_products = {"items": [{"id": 1}, {"id": 2}], "count": 2}
        
        product_cache.set(test_key, test_products, 60)
        print(f"  ✅ Product cache set successful")
        
        retrieved = product_cache.get(test_key)
        if retrieved and retrieved.get("count") == 2:
            print(f"  ✅ Product cache get successful")
        
        product_cache.delete(test_key)
        
        return True
    except Exception as e:
        print(f"  ❌ Utils redis_cache test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print_section("REDIS CACHE CONNECTION TEST")
    print(f"Started at: {datetime.now().isoformat()}")
    
    results = {}
    
    # Test 1: Environment
    results['environment'] = test_environment()
    if not results['environment']:
        print_section("TEST FAILED")
        return False
    
    # Test 2: Package
    results['package'] = test_upstash_package()
    if not results['package']:
        print_section("TEST FAILED")
        return False
    
    # Test 3: Direct connection
    success, client = test_direct_connection()
    results['direct_connection'] = success
    
    # Test 4: Basic operations (if connected)
    if success:
        results['basic_operations'] = test_basic_operations(client)
    
    # Test 5: JSON operations (if connected)
    if success:
        results['json_operations'] = test_json_operations(client)
    
    # Test 6: Cache manager
    results['cache_manager'] = test_cache_manager()
    
    # Test 7: Utils redis_cache
    results['utils_redis_cache'] = test_utils_redis_cache()
    
    # Summary
    print_section("TEST SUMMARY")
    
    all_passed = all(v for v in results.values() if v is not None)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL" if result is False else "⚠️ SKIP"
        print(f"  {status} - {test_name}")
    
    print(f"\nCompleted at: {datetime.now().isoformat()}")
    
    if all_passed:
        print("\n" + "=" * 70)
        print("  ✅ ALL TESTS PASSED - REDIS IS WORKING CORRECTLY!")
        print("=" * 70)
        return True
    else:
        print("\n" + "=" * 70)
        print("  ❌ SOME TESTS FAILED - CHECK CONFIGURATION")
        print("=" * 70)
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

