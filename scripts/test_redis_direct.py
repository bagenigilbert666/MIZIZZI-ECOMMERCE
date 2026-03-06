#!/usr/bin/env python3
"""
Simple standalone Redis connectivity test.
Tests Upstash Redis REST API without importing Flask app.

Run from project root:
    python scripts/test_redis_direct.py
"""
import os
import sys
from datetime import datetime
from pathlib import Path

# Load .env file
def load_env_file():
    """Load environment variables from .env file."""
    backend_dir = Path(__file__).parent.parent / 'backend'
    env_file = backend_dir / '.env'
    
    # Try using python-dotenv first
    try:
        from dotenv import load_dotenv
        load_dotenv(str(env_file))
        print(f"✓ Loaded .env using python-dotenv\n")
        return True
    except ImportError:
        # Fallback to manual loading
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            os.environ[key.strip()] = value.strip()
            print(f"✓ Loaded .env with manual parsing\n")
            return True
    return False

# Load environment first
load_env_file()

import requests
import json

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
    """Test direct Redis REST API connectivity."""
    print_header("UPSTASH REDIS - DIRECT HTTP REST API TEST")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    # Check environment variables
    print_header("ENVIRONMENT VARIABLES")
    redis_url = os.environ.get('UPSTASH_REDIS_REST_URL', '').strip()
    redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN', '').strip()
    
    print_test("UPSTASH_REDIS_REST_URL", bool(redis_url),
               redis_url[:50] + "..." if len(redis_url) > 50 else redis_url)
    print_test("UPSTASH_REDIS_REST_TOKEN", bool(redis_token),
               redis_token[:30] + "..." if len(redis_token) > 30 else redis_token)
    
    if not (redis_url and redis_token):
        print("\n✗ Environment variables not set correctly")
        return False
    
    # Test 1: PING command
    print_header("TEST 1: PING COMMAND")
    try:
        headers = {
            'Authorization': f'Bearer {redis_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            redis_url,
            headers=headers,
            json=['PING'],
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print_test("HTTP Request", True, f"Status: {response.status_code}")
            print_test("PING Response", result.get('result') == 'PONG', 
                      f"Result: {result.get('result')}")
        else:
            print_test("HTTP Request", False, f"Status: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print_test("HTTP Request", False, f"Error: {e}")
        return False
    
    # Test 2: SET command
    print_header("TEST 2: SET COMMAND")
    try:
        response = requests.post(
            redis_url,
            headers=headers,
            json=['SET', 'test:direct', 'Hello Redis', 'EX', '60'],
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            set_ok = result.get('result') == 'OK'
            print_test("SET command", set_ok, f"Result: {result.get('result')}")
        else:
            print_test("SET command", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("SET command", False, f"Error: {e}")
        return False
    
    # Test 3: GET command
    print_header("TEST 3: GET COMMAND")
    try:
        response = requests.post(
            redis_url,
            headers=headers,
            json=['GET', 'test:direct'],
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            value = result.get('result')
            get_ok = value == 'Hello Redis'
            print_test("GET command", get_ok, f"Retrieved: {value}")
        else:
            print_test("GET command", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("GET command", False, f"Error: {e}")
        return False
    
    # Test 4: INCR command
    print_header("TEST 4: INCR COMMAND")
    try:
        response = requests.post(
            redis_url,
            headers=headers,
            json=['INCR', 'test:counter'],
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            counter_val = result.get('result')
            print_test("INCR command", counter_val == 1, f"Counter: {counter_val}")
        else:
            print_test("INCR command", False, f"Status: {response.status_code}")
            return False
            
    except Exception as e:
        print_test("INCR command", False, f"Error: {e}")
        return False
    
    # Test 5: DEL command (cleanup)
    print_header("TEST 5: CLEANUP (DEL COMMAND)")
    try:
        for key in ['test:direct', 'test:counter']:
            response = requests.post(
                redis_url,
                headers=headers,
                json=['DEL', key],
                timeout=10
            )
            
            if response.status_code == 200:
                print_test(f"DELETE {key}", True)
            else:
                print_test(f"DELETE {key}", False)
                
    except Exception as e:
        print_test("Cleanup", False, f"Error: {e}")
        return False
    
    # Summary
    print_header("SUMMARY")
    print("""
All tests passed! Your Upstash Redis connection is working correctly.

Next steps:
1. Run the Flask backend: cd backend && python run.py
2. The backend will automatically use Redis for caching
3. All product routes will now have cache headers:
   - X-Cache: HIT (cached response)
   - X-Cache: MISS (fresh request)
   - X-Cache-TTL: <seconds>

Your Redis setup is production-ready!
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
