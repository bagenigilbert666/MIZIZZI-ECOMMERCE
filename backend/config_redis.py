#!/usr/bin/env python3
"""
Backend Redis Configuration Utility

This script helps diagnose and configure Redis caching for the MIZIZZI
e-commerce backend. It provides detailed information about the Redis
setup and helps troubleshoot issues.

Usage:
    python backend/config_redis.py          # Show current configuration
    python backend/config_redis.py --test   # Run connectivity tests
    python backend/config_redis.py --reset  # Reset Redis cache
"""
import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def show_config():
    """Display current Redis configuration."""
    print("\n" + "=" * 70)
    print("REDIS CONFIGURATION STATUS")
    print("=" * 70)
    
    redis_url = os.environ.get('UPSTASH_REDIS_REST_URL', 'NOT SET')
    redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN', 'NOT SET')
    
    print(f"\nEnvironment Variables:")
    print(f"  UPSTASH_REDIS_REST_URL: {redis_url[:50] + '...' if redis_url != 'NOT SET' else redis_url}")
    print(f"  UPSTASH_REDIS_REST_TOKEN: {redis_token[:20] + '...' if redis_token != 'NOT SET' else redis_token}")
    
    try:
        from app.cache.redis_client import is_redis_connected, get_redis_client
        
        print(f"\nConnection Status:")
        if is_redis_connected():
            print(f"  Status: ✓ Connected")
            client = get_redis_client()
            if client and client.ping():
                print(f"  PING: ✓ Successful")
            else:
                print(f"  PING: ✗ Failed")
        else:
            print(f"  Status: ✗ Not Connected")
            
    except Exception as e:
        print(f"  Error: {e}")

def run_tests():
    """Run Redis connectivity tests."""
    print("\n" + "=" * 70)
    print("RUNNING REDIS CONNECTIVITY TESTS")
    print("=" * 70)
    
    script_path = Path(__file__).parent.parent / 'scripts' / 'test_redis_backend.py'
    
    if not script_path.exists():
        print(f"Error: Test script not found at {script_path}")
        return False
    
    import subprocess
    result = subprocess.run([sys.executable, str(script_path)])
    return result.returncode == 0

def reset_cache():
    """Reset Redis cache."""
    print("\n" + "=" * 70)
    print("RESETTING REDIS CACHE")
    print("=" * 70)
    
    try:
        from app.cache.cache import cache_manager
        
        print("\nClearing all cache entries...")
        count = cache_manager.invalidate_all()
        print(f"✓ Cleared {count} cache entries")
        
        print("\nCache Statistics:")
        stats = cache_manager.stats
        print(f"  Cache Type: {stats['cache_type']}")
        print(f"  Total Requests: {stats['total_requests']}")
        print(f"  Hits: {stats['hits']}")
        print(f"  Misses: {stats['misses']}")
        print(f"  Hit Rate: {stats['hit_rate_percent']}%")
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    
    return True

def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == '--test':
            return run_tests()
        elif command == '--reset':
            return reset_cache()
        elif command == '--help':
            print(__doc__)
            return True
        else:
            print(f"Unknown command: {command}")
            print(__doc__)
            return False
    else:
        show_config()
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
