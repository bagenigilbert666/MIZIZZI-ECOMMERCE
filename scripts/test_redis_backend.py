#!/usr/bin/env python3
"""
Test script for Upstash Redis connectivity.
Run from project root: python scripts/test_redis_backend.py
"""
import sys
import os
from datetime import datetime
from pathlib import Path

# Load .env file first
def load_env_file():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    backend_dir = project_root / 'backend'
    
    # Handle case where backend_dir doesn't exist
    if not backend_dir.exists():
        if (Path.cwd() / 'app').exists():
            backend_dir = Path.cwd()
        elif (Path.cwd().parent / 'app').exists():
            backend_dir = Path.cwd().parent
    
    env_file = backend_dir / '.env'
    
    if not env_file.exists():
        print(f"⚠️  .env not found at {env_file}")
        return False
    
    # Try python-dotenv first
    try:
        from dotenv import load_dotenv
        load_dotenv(str(env_file), override=True)
        print(f"✓ Loaded .env from {env_file}\n")
        return True
    except ImportError:
        # Manual fallback
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip().strip('\'"')
        print(f"✓ Loaded .env from {env_file} (manual)\n")
        return True

load_env_file()

# Setup path
script_dir = Path(__file__).parent
project_root = script_dir.parent
backend_path = project_root / 'backend'

if not backend_path.exists():
    if (Path.cwd() / 'app').exists():
        backend_path = Path.cwd()

sys.path.insert(0, str(backend_path))

def print_header(text):
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)

def print_test(name, passed, msg=""):
    status = "✓" if passed else "✗"
    print(f"{status} {name}" + (f" - {msg}" if msg else ""))

# Main test
print_header("UPSTASH REDIS BACKEND TEST")
print(f"Time: {datetime.now().isoformat()}\n")

# Check environment
print_header("ENVIRONMENT CHECK")
redis_url = os.environ.get('UPSTASH_REDIS_REST_URL')
redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')

print_test("UPSTASH_REDIS_REST_URL", bool(redis_url), redis_url[:40] + "..." if redis_url else "NOT SET")
print_test("UPSTASH_REDIS_REST_TOKEN", bool(redis_token), redis_token[:20] + "..." if redis_token else "NOT SET")

if not redis_url or not redis_token:
    print("\nERROR: Redis env vars not set!")
    print("  - Check backend/.env file has both variables")
    print("  - Or export: export UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=...")
    sys.exit(1)

# Import Redis client
print_header("IMPORTING REDIS CLIENT")
try:
    from app.cache.redis_client import get_redis_client
    print("✓ Successfully imported Redis client")
except ImportError as e:
    print(f"✗ Failed to import: {e}")
    sys.exit(1)

# Connect to Redis
print_header("CONNECTING TO REDIS")
client = get_redis_client()
if not client:
    print("✗ Failed to create Redis client")
    sys.exit(1)

print("✓ Redis client created")

# Test connectivity
print_header("TEST 1: PING")
if client.ping():
    print("✓ PING successful - connected to Redis!")
else:
    print("✗ PING failed")
    sys.exit(1)

# Test SET/GET
print_header("TEST 2: SET/GET")
if client.set("test:key", "test:value", ex=60):
    print("✓ SET successful")
else:
    print("✗ SET failed")
    sys.exit(1)

val = client.get("test:key")
if val == "test:value":
    print("✓ GET successful - retrieved correct value")
else:
    print(f"✗ GET failed - got {val}")
    sys.exit(1)

# Cleanup
print_header("CLEANUP")
client.delete("test:key")
print("✓ Test key cleaned up")

print_header("SUCCESS!")
print("""
Your Redis integration is working perfectly!

Next steps:
1. Start your Flask backend: cd backend && python run.py
2. Test product routes: curl http://localhost:5000/api/products
3. Check cache headers in response

Redis caching is now active!
""")
