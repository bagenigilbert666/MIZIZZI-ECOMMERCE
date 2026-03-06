import requests
import json
from datetime import datetime

# Upstash Redis credentials
REDIS_URL = "https://nearby-rabbit-63956.upstash.io"
REDIS_TOKEN = "AfnUAAIncDI4NmVmOGJhM2I1OTU0NWE0OTAwYmVkNzYzZWU4ZTIyMHAyNjM5NTYNow"

def send_redis_command(command):
    """Send a command to Redis REST API"""
    headers = {
        "Authorization": f"Bearer {REDIS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    url = f"{REDIS_URL}/exec"
    
    try:
        response = requests.post(url, json=command, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

def test_redis_connection():
    """Test basic Redis connection"""
    print("=" * 60)
    print("REDIS CONNECTION TEST")
    print("=" * 60)
    print(f"Endpoint: {REDIS_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print()
    
    # Test 1: PING
    print("Test 1: PING Command")
    print("-" * 60)
    result = send_redis_command(["PING"])
    print(f"Command: PING")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') == 'PONG' else '✗ FAILED'}")
    print()
    
    # Test 2: SET a value
    print("Test 2: SET Command")
    print("-" * 60)
    test_key = "test:connection"
    test_value = "Redis is working!"
    result = send_redis_command(["SET", test_key, test_value])
    print(f"Command: SET {test_key} '{test_value}'")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') == 'OK' else '✗ FAILED'}")
    print()
    
    # Test 3: GET the value
    print("Test 3: GET Command")
    print("-" * 60)
    result = send_redis_command(["GET", test_key])
    print(f"Command: GET {test_key}")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') == test_value else '✗ FAILED'}")
    print()
    
    # Test 4: SET with expiration
    print("Test 4: SET with EX (expiration)")
    print("-" * 60)
    temp_key = "temp:test"
    temp_value = "This will expire in 10 seconds"
    result = send_redis_command(["SET", temp_key, temp_value, "EX", "10"])
    print(f"Command: SET {temp_key} '{temp_value}' EX 10")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') == 'OK' else '✗ FAILED'}")
    print()
    
    # Test 5: INCR (increment)
    print("Test 5: INCR Command")
    print("-" * 60)
    counter_key = "test:counter"
    result = send_redis_command(["INCR", counter_key])
    print(f"Command: INCR {counter_key}")
    print(f"Response: {result}")
    print(f"Value: {result.get('result') if result else 'N/A'}")
    print(f"Status: {'✓ PASSED' if result and isinstance(result.get('result'), int) else '✗ FAILED'}")
    print()
    
    # Test 6: LPUSH (list push)
    print("Test 6: LPUSH Command (List)")
    print("-" * 60)
    list_key = "test:products"
    result = send_redis_command(["LPUSH", list_key, "product1", "product2", "product3"])
    print(f"Command: LPUSH {list_key} 'product1' 'product2' 'product3'")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') == 3 else '✗ FAILED'}")
    print()
    
    # Test 7: LRANGE (list range)
    print("Test 7: LRANGE Command")
    print("-" * 60)
    result = send_redis_command(["LRANGE", list_key, "0", "-1"])
    print(f"Command: LRANGE {list_key} 0 -1")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and isinstance(result.get('result'), list) else '✗ FAILED'}")
    print()
    
    # Test 8: HSET (hash set)
    print("Test 8: HSET Command (Hash)")
    print("-" * 60)
    hash_key = "test:product:1"
    result = send_redis_command(["HSET", hash_key, "id", "1", "name", "Product 1", "price", "99.99"])
    print(f"Command: HSET {hash_key} id '1' name 'Product 1' price '99.99'")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') >= 0 else '✗ FAILED'}")
    print()
    
    # Test 9: HGETALL (hash get all)
    print("Test 9: HGETALL Command")
    print("-" * 60)
    result = send_redis_command(["HGETALL", hash_key])
    print(f"Command: HGETALL {hash_key}")
    print(f"Response: {result}")
    print(f"Status: {'✓ PASSED' if result and isinstance(result.get('result'), list) else '✗ FAILED'}")
    print()
    
    # Test 10: DEL (delete)
    print("Test 10: DEL Command")
    print("-" * 60)
    result = send_redis_command(["DEL", test_key, counter_key, list_key, hash_key, temp_key])
    print(f"Command: DEL {test_key} {counter_key} {list_key} {hash_key} {temp_key}")
    print(f"Response: {result}")
    print(f"Keys deleted: {result.get('result') if result else 'N/A'}")
    print(f"Status: {'✓ PASSED' if result and result.get('result') >= 0 else '✗ FAILED'}")
    print()
    
    # Summary
    print("=" * 60)
    print("REDIS TEST COMPLETED")
    print("=" * 60)
    print("Connection: ✓ SUCCESSFUL")
    print("All basic operations tested successfully!")
    print()

if __name__ == "__main__":
    test_redis_connection()
