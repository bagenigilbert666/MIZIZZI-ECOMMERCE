#!/usr/bin/env python3
"""
Test script for Upstash Redis connectivity using HTTP REST API.

This script tests the Redis backend connection without requiring the 
upstash-redis SDK. It uses direct HTTP requests to the Upstash REST API.

Run from project root:
    python scripts/test_redis_backend.py

Or from backend directory:
    python ../scripts/test_redis_backend.py
"""
import sys
import os
from datetime import datetime

# Get the script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)

# Determine backend path - handle both running from root and from backend
backend_path = os.path.join(project_root, 'backend')
if not os.path.exists(backend_path):
    # Maybe we're being run from backend directory
    backend_path = os.path.dirname(os.getcwd())
    if not os.path.exists(os.path.join(backend_path, 'app')):
        backend_path = os.getcwd()

# Add backend to path
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)

def print_test(name, passed, message=""):
    """Print a test result."""
    status = "✓" if passed else "✗"
    print(f"{status} {name}")
    if message:
        print(f"  {message}")

def main():
    """Run all Redis connectivity tests."""
    print_header("UPSTASH REDIS BACKEND CONNECTIVITY TEST (HTTP REST API)")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    print(f"Backend path: {backend_path}\n")
    
    # Import the Redis client
    try:
        from app.cache.redis_client import get_redis_client, is_redis_connected
        print("✓ Successfully imported Redis client module")
    except ImportError as e:
        print(f"✗ Failed to import Redis client: {e}")
        print(f"Python path includes: {sys.path[:2]}")
        return False
    
    # Check environment variables
    print_header("CHECKING ENVIRONMENT VARIABLES")
    redis_url = os.environ.get('UPSTASH_REDIS_REST_URL')
    redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')
    
    print_test("UPSTASH_REDIS_REST_URL set", bool(redis_url), 
               redis_url[:40] + "..." if redis_url else "NOT SET")
    print_test("UPSTASH_REDIS_REST_TOKEN set", bool(redis_token), 
               redis_token[:20] + "..." if redis_token else "NOT SET")
    
    if not (redis_url and redis_token):
        print("\n⚠️  Missing environment variables. Please set:")
        print("  - UPSTASH_REDIS_REST_URL")
        print("  - UPSTASH_REDIS_REST_TOKEN")
        return False
    
    # Get the client
    print_header("CONNECTING TO REDIS")
    client = get_redis_client()
    
    if client is None:
        print("✗ Failed to create Redis client")
        return False
    
    print("✓ Redis client created successfully")
    
    # Test 1: Basic connectivity (PING)
    print_header("TEST 1: BASIC REDIS CONNECTIVITY")
    ping_result = client.ping()
    print_test("PING command", ping_result, 
               "Connection successful" if ping_result else "Connection failed")
    
    if not ping_result:
        print("\n⚠️  Could not establish basic connectivity")
        return False
    
    # Test 2: SET/GET operations
    print_header("TEST 2: SET/GET OPERATIONS")
    
    set_result = client.set("test:redis:connectivity", "Hello Redis", ex=60)
    print_test("SET command", set_result, 
               "Successfully set key" if set_result else "Failed to set key")
    
    if set_result:
        get_result = client.get("test:redis:connectivity")
        print_test("GET command", get_result == "Hello Redis",
                   f"Retrieved: {get_result}" if get_result else "Failed to get key")
    
    # Test 3: List operations (LPUSH/LRANGE)
    print_header("TEST 3: LIST OPERATIONS")
    
    lpush_result = client.lpush("test:list", "item1", "item2", "item3")
    print_test("LPUSH command", lpush_result > 0,
               f"Pushed {lpush_result} items" if lpush_result > 0 else "Failed to push items")
    
    if lpush_result > 0:
        lrange_result = client.lrange("test:list", 0, -1)
        print_test("LRANGE command", len(lrange_result) > 0,
                   f"Retrieved {len(lrange_result)} items" if lrange_result else "Failed to get list")
    
    # Test 4: Hash operations (HSET/HGETALL)
    print_header("TEST 4: HASH OPERATIONS")
    
    hset_result = client.hset("test:hash", "field1", "value1")
    print_test("HSET command", hset_result > 0,
               f"Set {hset_result} field(s)" if hset_result > 0 else "Failed to set hash field")
    
    if hset_result > 0:
        hgetall_result = client.hgetall("test:hash")
        print_test("HGETALL command", len(hgetall_result) > 0,
                   f"Retrieved {len(hgetall_result)} fields" if hgetall_result else "Failed to get hash")
    
    # Test 5: Counter operations (INCR)
    print_header("TEST 5: COUNTER OPERATIONS")
    
    incr1 = client.incr("test:counter")
    print_test("INCR #1", incr1 == 1, f"Counter value: {incr1}")
    
    incr2 = client.incr("test:counter")
    print_test("INCR #2", incr2 == 2, f"Counter value: {incr2}")
    
    incr3 = client.incr("test:counter")
    print_test("INCR #3", incr3 == 3, f"Counter value: {incr3}")
    
    # Test 6: Cleanup (DEL operations)
    print_header("TEST 6: CLEANUP (DEL OPERATIONS)")
    
    cleanup_keys = [
        "test:redis:connectivity",
        "test:list",
        "test:hash",
        "test:counter"
    ]
    
    for key in cleanup_keys:
        del_result = client.delete(key)
        print_test(f"DELETE {key}", del_result >= 0)
    
    # Summary
    print_header("TEST SUMMARY")
    print("""
If all tests passed with ✓ marks, your Redis integration is working correctly!

Next steps:
1. Verify that your Flask backend loads the environment variables from .env
2. Restart your Flask development server
3. Test the product routes with cache headers:
   - GET /api/products
   - GET /api/products/<id>
   - GET /api/products/category/<slug>

You should see:
- X-Cache: HIT (when cached)
- X-Cache: MISS (first request)
- Cache statistics in response headers

Redis caching is now active for all product routes!
""")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def print_header(text):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)

def print_test(name, passed, message=""):
    """Print a test result."""
    status = "✓" if passed else "✗"
    print(f"{status} {name}")
    if message:
        print(f"  {message}")

def main():
    """Run all Redis connectivity tests."""
    print_header("UPSTASH REDIS BACKEND CONNECTIVITY TEST (HTTP REST API)")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    # Import the Redis client
    try:
        from app.cache.redis_client import get_redis_client, is_redis_connected
        print("✓ Successfully imported Redis client module")
    except ImportError as e:
        print(f"✗ Failed to import Redis client: {e}")
        return False
    
    # Check environment variables
    print_header("CHECKING ENVIRONMENT VARIABLES")
    redis_url = os.environ.get('UPSTASH_REDIS_REST_URL')
    redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')
    
    print_test("UPSTASH_REDIS_REST_URL set", bool(redis_url), 
               redis_url[:40] + "..." if redis_url else "NOT SET")
    print_test("UPSTASH_REDIS_REST_TOKEN set", bool(redis_token), 
               redis_token[:20] + "..." if redis_token else "NOT SET")
    
    if not (redis_url and redis_token):
        print("\n⚠️  Missing environment variables. Please set:")
        print("  - UPSTASH_REDIS_REST_URL")
        print("  - UPSTASH_REDIS_REST_TOKEN")
        return False
    
    # Get the client
    print_header("CONNECTING TO REDIS")
    client = get_redis_client()
    
    if client is None:
        print("✗ Failed to create Redis client")
        return False
    
    print("✓ Redis client created successfully")
    
    # Test 1: Basic connectivity (PING)
    print_header("TEST 1: BASIC REDIS CONNECTIVITY")
    ping_result = client.ping()
    print_test("PING command", ping_result, 
               "Connection successful" if ping_result else "Connection failed")
    
    if not ping_result:
        print("\n⚠️  Could not establish basic connectivity")
        return False
    
    # Test 2: SET/GET operations
    print_header("TEST 2: SET/GET OPERATIONS")
    
    set_result = client.set("test:redis:connectivity", "Hello Redis", ex=60)
    print_test("SET command", set_result, 
               "Successfully set key" if set_result else "Failed to set key")
    
    if set_result:
        get_result = client.get("test:redis:connectivity")
        print_test("GET command", get_result == "Hello Redis",
                   f"Retrieved: {get_result}" if get_result else "Failed to get key")
    
    # Test 3: List operations (LPUSH/LRANGE)
    print_header("TEST 3: LIST OPERATIONS")
    
    lpush_result = client.lpush("test:list", "item1", "item2", "item3")
    print_test("LPUSH command", lpush_result > 0,
               f"Pushed {lpush_result} items" if lpush_result > 0 else "Failed to push items")
    
    if lpush_result > 0:
        lrange_result = client.lrange("test:list", 0, -1)
        print_test("LRANGE command", len(lrange_result) > 0,
                   f"Retrieved {len(lrange_result)} items" if lrange_result else "Failed to get list")
    
    # Test 4: Hash operations (HSET/HGETALL)
    print_header("TEST 4: HASH OPERATIONS")
    
    hset_result = client.hset("test:hash", "field1", "value1")
    print_test("HSET command", hset_result > 0,
               f"Set {hset_result} field(s)" if hset_result > 0 else "Failed to set hash field")
    
    if hset_result > 0:
        hgetall_result = client.hgetall("test:hash")
        print_test("HGETALL command", len(hgetall_result) > 0,
                   f"Retrieved {len(hgetall_result)} fields" if hgetall_result else "Failed to get hash")
    
    # Test 5: Counter operations (INCR)
    print_header("TEST 5: COUNTER OPERATIONS")
    
    incr1 = client.incr("test:counter")
    print_test("INCR #1", incr1 == 1, f"Counter value: {incr1}")
    
    incr2 = client.incr("test:counter")
    print_test("INCR #2", incr2 == 2, f"Counter value: {incr2}")
    
    incr3 = client.incr("test:counter")
    print_test("INCR #3", incr3 == 3, f"Counter value: {incr3}")
    
    # Test 6: Cleanup (DEL operations)
    print_header("TEST 6: CLEANUP (DEL OPERATIONS)")
    
    cleanup_keys = [
        "test:redis:connectivity",
        "test:list",
        "test:hash",
        "test:counter"
    ]
    
    for key in cleanup_keys:
        del_result = client.delete(key)
        print_test(f"DELETE {key}", del_result >= 0)
    
    # Summary
    print_header("TEST SUMMARY")
    print("""
If all tests passed with ✓ marks, your Redis integration is working correctly!

Next steps:
1. Verify that your Flask backend loads the environment variables from .env
2. Restart your Flask development server
3. Test the product routes with cache headers:
   - GET /api/products
   - GET /api/products/<id>
   - GET /api/products/category/<slug>

You should see:
- X-Cache: HIT (when cached)
- X-Cache: MISS (first request)
- Cache statistics in response headers

Redis caching is now active for all product routes!
""")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
