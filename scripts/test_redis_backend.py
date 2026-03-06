"""
test_redis_backend.py - Comprehensive Redis connectivity test for Flask backend

This script tests the Redis integration with your Upstash instance and verifies
all caching operations work correctly.
"""
import os
import sys
import requests
import json
from datetime import datetime

# Test environment variables
REDIS_URL = "https://nearby-rabbit-63956.upstash.io"
REDIS_TOKEN = "AfnUAAIncDI4NmVmOGJhM2I1OTU0NWE0OTAwYmVkNzYzZWU4ZTIyMHAyNjM5NTY"

print("=" * 70)
print("UPSTASH REDIS BACKEND CONNECTIVITY TEST")
print("=" * 70)
print(f"Timestamp: {datetime.now().isoformat()}")
print()

# Test 1: Basic connectivity
print("[TEST 1] Basic Redis Connectivity")
print("-" * 70)
try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}"
    }
    response = requests.post(
        f"{REDIS_URL}/ping",
        headers=headers
    )
    if response.status_code == 200:
        print("✓ PING successful")
        print(f"  Response: {response.json()}")
    else:
        print(f"✗ PING failed: {response.status_code}")
        print(f"  Response: {response.text}")
except Exception as e:
    print(f"✗ Connection error: {str(e)}")

print()

# Test 2: SET and GET operations
print("[TEST 2] SET/GET Operations")
print("-" * 70)
test_key = "test:redis:connectivity"
test_value = {"test": "value", "timestamp": datetime.now().isoformat()}

try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # SET operation
    set_payload = {
        "commands": [[
            "SET",
            test_key,
            json.dumps(test_value),
            "EX",
            "300"
        ]]
    }
    set_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=set_payload
    )
    
    if set_response.status_code == 200:
        print(f"✓ SET operation successful")
        print(f"  Key: {test_key}")
        print(f"  TTL: 300 seconds")
    else:
        print(f"✗ SET failed: {set_response.status_code}")
        print(f"  Response: {set_response.text}")
    
    # GET operation
    get_payload = {
        "commands": [[
            "GET",
            test_key
        ]]
    }
    get_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=get_payload
    )
    
    if get_response.status_code == 200:
        print(f"✓ GET operation successful")
        print(f"  Retrieved: {get_response.json()}")
    else:
        print(f"✗ GET failed: {get_response.status_code}")
        print(f"  Response: {get_response.text}")
        
except Exception as e:
    print(f"✗ SET/GET error: {str(e)}")

print()

# Test 3: List operations (LPUSH/LRANGE)
print("[TEST 3] List Operations (LPUSH/LRANGE)")
print("-" * 70)
list_key = "test:list"
try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # LPUSH operation
    lpush_payload = {
        "commands": [[
            "LPUSH",
            list_key,
            "item1",
            "item2",
            "item3"
        ]]
    }
    lpush_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=lpush_payload
    )
    
    if lpush_response.status_code == 200:
        print(f"✓ LPUSH operation successful")
        print(f"  Items pushed: 3")
    else:
        print(f"✗ LPUSH failed: {lpush_response.status_code}")
    
    # LRANGE operation
    lrange_payload = {
        "commands": [[
            "LRANGE",
            list_key,
            "0",
            "-1"
        ]]
    }
    lrange_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=lrange_payload
    )
    
    if lrange_response.status_code == 200:
        print(f"✓ LRANGE operation successful")
        print(f"  List contents: {lrange_response.json()}")
    else:
        print(f"✗ LRANGE failed: {lrange_response.status_code}")
        
except Exception as e:
    print(f"✗ List operations error: {str(e)}")

print()

# Test 4: Hash operations (HSET/HGETALL)
print("[TEST 4] Hash Operations (HSET/HGETALL)")
print("-" * 70)
hash_key = "test:hash"
try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # HSET operation
    hset_payload = {
        "commands": [[
            "HSET",
            hash_key,
            "field1", "value1",
            "field2", "value2",
            "field3", "value3"
        ]]
    }
    hset_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=hset_payload
    )
    
    if hset_response.status_code == 200:
        print(f"✓ HSET operation successful")
        print(f"  Fields set: 3")
    else:
        print(f"✗ HSET failed: {hset_response.status_code}")
    
    # HGETALL operation
    hgetall_payload = {
        "commands": [[
            "HGETALL",
            hash_key
        ]]
    }
    hgetall_response = requests.post(
        f"{REDIS_URL}",
        headers=headers,
        json=hgetall_payload
    )
    
    if hgetall_response.status_code == 200:
        print(f"✓ HGETALL operation successful")
        print(f"  Hash contents: {hgetall_response.json()}")
    else:
        print(f"✗ HGETALL failed: {hgetall_response.status_code}")
        
except Exception as e:
    print(f"✗ Hash operations error: {str(e)}")

print()

# Test 5: Increment operations (INCR)
print("[TEST 5] Counter Operations (INCR)")
print("-" * 70)
counter_key = "test:counter"
try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # INCR operation (multiple times)
    for i in range(3):
        incr_payload = {
            "commands": [[
                "INCR",
                counter_key
            ]]
        }
        incr_response = requests.post(
            f"{REDIS_URL}",
            headers=headers,
            json=incr_payload
        )
        
        if incr_response.status_code == 200:
            print(f"✓ INCR #{i+1} successful: {incr_response.json()}")
        else:
            print(f"✗ INCR #{i+1} failed: {incr_response.status_code}")
            
except Exception as e:
    print(f"✗ Counter operations error: {str(e)}")

print()

# Test 6: Cleanup (DEL operations)
print("[TEST 6] Cleanup (DEL operations)")
print("-" * 70)
try:
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    keys_to_delete = [test_key, list_key, hash_key, counter_key]
    
    for key in keys_to_delete:
        del_payload = {
            "commands": [[
                "DEL",
                key
            ]]
        }
        del_response = requests.post(
            f"{REDIS_URL}",
            headers=headers,
            json=del_payload
        )
        
        if del_response.status_code == 200:
            print(f"✓ Deleted key: {key}")
        else:
            print(f"✗ Failed to delete key: {key}")
            
except Exception as e:
    print(f"✗ Cleanup error: {str(e)}")

print()
print("=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print("""
If all tests passed with ✓ marks, your Redis integration is working correctly!

Next steps:
1. Ensure your Flask backend loads the environment variables from .env
2. Restart your Flask development server
3. Test the product routes with cache headers:
   - GET /api/products/health
   - GET /api/products/cache/status
   - GET /api/products/cache/warming-status

You should see:
- X-Cache: HIT (when cached)
- X-Cache: MISS (first request)
- Connection status showing Upstash Redis connected
""")
print("=" * 70)
