#!/usr/bin/env python3
"""
Django/Flask-style setup script to configure Redis for development.
Run this once after cloning to initialize Redis caching.
"""
import os
import sys
import subprocess
from pathlib import Path

# Colors for terminal output
GREEN = '\033[92m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def print_success(msg):
    print(f"{GREEN}✓{RESET} {msg}")

def print_info(msg):
    print(f"{BLUE}ℹ{RESET} {msg}")

def print_warning(msg):
    print(f"{YELLOW}⚠{RESET} {msg}")

def print_error(msg):
    print(f"{RED}✗{RESET} {msg}")

def main():
    print(f"\n{BLUE}{'=' * 70}{RESET}")
    print(f"{BLUE}Redis Caching Setup for MIZIZZI E-Commerce{RESET}")
    print(f"{BLUE}{'=' * 70}{RESET}\n")
    
    # Check if environment variables are set
    print_info("Checking environment variables...")
    
    redis_url = os.environ.get('UPSTASH_REDIS_REST_URL')
    redis_token = os.environ.get('UPSTASH_REDIS_REST_TOKEN')
    
    if not redis_url:
        print_error("UPSTASH_REDIS_REST_URL not set")
        print("Please set this in your .env file or system environment variables")
        return False
    
    if not redis_token:
        print_error("UPSTASH_REDIS_REST_TOKEN not set")
        print("Please set this in your .env file or system environment variables")
        return False
    
    print_success("UPSTASH_REDIS_REST_URL is set")
    print_success("UPSTASH_REDIS_REST_TOKEN is set")
    
    # Run the test script
    print_info("\nRunning Redis connectivity test...")
    
    script_path = Path(__file__).parent / 'test_redis_backend.py'
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=Path(__file__).parent.parent,
            capture_output=False
        )
        
        if result.returncode == 0:
            print_success("Redis connectivity test passed!")
        else:
            print_error("Redis connectivity test failed!")
            return False
            
    except Exception as e:
        print_error(f"Failed to run test script: {e}")
        return False
    
    # Success
    print(f"\n{GREEN}{'=' * 70}{RESET}")
    print(f"{GREEN}Redis setup complete!{RESET}")
    print(f"{GREEN}{'=' * 70}{RESET}\n")
    
    print("Next steps:")
    print("1. Start your Flask development server")
    print("2. Make a request to any product route")
    print("3. Check response headers for 'X-Cache' header")
    print("   - X-Cache: MISS (first request)")
    print("   - X-Cache: HIT (subsequent requests)")
    print("\nRedis is now caching all product data automatically!")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
