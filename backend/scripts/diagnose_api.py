#!/usr/bin/env python3
"""
Simple diagnostic tool to test products API endpoints with comprehensive error reporting.
Tests core functionality without requiring database state.
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5000"
API_PREFIX = "/api/products"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def print_header(text):
    print(f"\n{BOLD}{BLUE}{'='*70}{RESET}")
    print(f"{BOLD}{BLUE}{text:^70}{RESET}")
    print(f"{BOLD}{BLUE}{'='*70}{RESET}\n")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")

def print_info(text):
    print(f"{BLUE}ℹ {text}{RESET}")

def test_connection():
    """Test if backend is running."""
    print_header("CONNECTION TEST")
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=2)
        print_success(f"Backend is running at {BASE_URL}")
        return True
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to backend at {BASE_URL}")
        print_info("Make sure the backend is running: python backend/run.py")
        return False
    except Exception as e:
        print_error(f"Connection error: {str(e)}")
        return False

def test_endpoint(method, path, expected_status=None, params=None, headers=None, description=""):
    """Test a single endpoint."""
    url = f"{BASE_URL}{API_PREFIX}{path}"
    try:
        start = time.time()
        if method.upper() == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=5)
        elif method.upper() == "POST":
            response = requests.post(url, json=params, headers=headers, timeout=5)
        elif method.upper() == "PUT":
            response = requests.put(url, json=params, headers=headers, timeout=5)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=5)
        
        elapsed = (time.time() - start) * 1000
        
        # Check cache headers
        cache_status = response.headers.get('X-Cache', 'MISS')
        
        if expected_status and response.status_code != expected_status:
            print_error(f"{method} {path} - Expected {expected_status}, got {response.status_code} ({elapsed:.2f}ms)")
            if response.text:
                print_info(f"Response: {response.text[:200]}")
            return False
        else:
            status_text = f"{response.status_code} [{cache_status}]"
            if response.status_code < 400:
                print_success(f"{method} {path} - {status_text} ({elapsed:.2f}ms)")
                
                # Try to show brief response info
                try:
                    data = response.json()
                    if isinstance(data, dict):
                        if 'items' in data:
                            print_info(f"  Response: {len(data.get('items', []))} items")
                        if 'products' in data:
                            print_info(f"  Response: {len(data.get('products', []))} products")
                        if 'pagination' in data:
                            total = data['pagination'].get('total_items', 0)
                            print_info(f"  Pagination: {total} total items")
                except:
                    pass
                return True
            else:
                print_warning(f"{method} {path} - {status_text} ({elapsed:.2f}ms)")
                return False
    
    except requests.exceptions.Timeout:
        print_error(f"{method} {path} - Timeout (>5s)")
        return False
    except Exception as e:
        print_error(f"{method} {path} - {str(e)}")
        return False

def main():
    """Run all diagnostic tests."""
    print(f"\n{BOLD}PRODUCTS API DIAGNOSTIC TEST SUITE{RESET}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend URL: {BASE_URL}")
    
    # Check connection
    if not test_connection():
        print_error("\n❌ Backend is not running. Tests aborted.")
        print_info("To start the backend:")
        print_info("  cd backend && python run.py")
        return 1
    
    # Test core endpoints
    print_header("ENDPOINT TESTS")
    
    tests = [
        ("GET", "/", 200, None, "List all products"),
        ("GET", "/fast?limit=5", 200, None, "Fast products list"),
        ("GET", "/trending?limit=3", 200, None, "Trending products"),
        ("GET", "/flash-sale?limit=5", 200, None, "Flash sale products"),
        ("GET", "/new-arrivals?limit=6", 200, None, "New arrivals"),
        ("GET", "/top-picks?limit=4", 200, None, "Top picks"),
        ("GET", "/daily-finds?limit=5", 200, None, "Daily finds"),
        ("GET", "/luxury-deals?limit=3", 200, None, "Luxury deals"),
    ]
    
    passed = 0
    failed = 0
    
    for method, path, status, params, desc in tests:
        if test_endpoint(method, path, status, params, description=desc):
            passed += 1
        else:
            failed += 1
    
    # Cache tests
    print_header("CACHE FUNCTIONALITY")
    
    print_info("Testing cache hit detection...")
    # First request (cache miss)
    response1 = requests.get(f"{BASE_URL}{API_PREFIX}/?page=1&per_page=10", timeout=5)
    cache1 = response1.headers.get('X-Cache', 'N/A')
    print_info(f"First request cache status: {cache1}")
    
    # Second request (should be cache hit)
    time.sleep(0.1)
    response2 = requests.get(f"{BASE_URL}{API_PREFIX}/?page=1&per_page=10", timeout=5)
    cache2 = response2.headers.get('X-Cache', 'N/A')
    print_info(f"Second request cache status: {cache2}")
    
    if cache2 == "HIT":
        print_success("Cache is working correctly")
    else:
        print_warning("Cache may not be working (check Redis connection)")
    
    # Summary
    print_header("TEST SUMMARY")
    print_info(f"Endpoints tested: {passed + failed}")
    print_success(f"Passed: {passed}")
    if failed > 0:
        print_error(f"Failed: {failed}")
    
    print_info(f"\nBackend Status: {'✓ RUNNING' if passed > 0 else '✗ NOT RESPONDING'}")
    print_info(f"Cache Status: {'✓ ENABLED' if cache2 == 'HIT' else '✗ CHECK REDIS'}")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit(main())
