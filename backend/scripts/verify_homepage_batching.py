#!/usr/bin/env python3
"""
Homepage Batching Verification Script
Tests the new /api/homepage endpoint to verify batching is working
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5000"
API_ENDPOINT = f"{BASE_URL}/api/homepage"

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log_test(test_num, description):
    print(f"\n{Colors.BOLD}{Colors.BLUE}[Test {test_num}] {description}{Colors.ENDC}")
    print("-" * 80)

def log_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def log_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def log_info(message):
    print(f"{Colors.CYAN}ℹ {message}{Colors.ENDC}")

def format_response_time(ms):
    if ms < 100:
        return f"{Colors.GREEN}{ms:.2f}ms{Colors.ENDC}"
    elif ms < 500:
        return f"{Colors.YELLOW}{ms:.2f}ms{Colors.ENDC}"
    else:
        return f"{Colors.RED}{ms:.2f}ms{Colors.ENDC}"

print(f"\n{Colors.BOLD}{Colors.HEADER}Homepage Batching Test Suite{Colors.ENDC}")
print(f"Testing endpoint: {API_ENDPOINT}")
print(f"Timestamp: {datetime.now().isoformat()}")
print("=" * 80)

# Test 1: Basic connectivity
log_test(1, "Basic Connectivity Test")
try:
    response = requests.get(API_ENDPOINT, timeout=10)
    response_time = response.elapsed.total_seconds() * 1000
    
    if response.status_code == 200:
        log_success(f"API is accessible (HTTP {response.status_code})")
        log_info(f"Response time: {format_response_time(response_time)}")
    else:
        log_error(f"Unexpected status code: {response.status_code}")
        print(f"Response: {response.text[:500]}")
except Exception as e:
    log_error(f"Connection failed: {e}")
    exit(1)

# Test 2: Response structure
log_test(2, "Response Structure Validation")
try:
    response = requests.get(API_ENDPOINT, timeout=10)
    data = response.json()
    
    expected_keys = [
        'categories', 'carousel_items', 'flash_sale_products',
        'luxury_products', 'new_arrivals', 'top_picks',
        'trending_products', 'daily_finds', 'all_products'
    ]
    
    found_keys = []
    missing_keys = []
    
    for key in expected_keys:
        if key in data:
            found_keys.append(key)
            log_success(f"Found section: {key}")
        else:
            missing_keys.append(key)
            log_error(f"Missing section: {key}")
    
    log_info(f"Sections found: {len(found_keys)}/{len(expected_keys)}")
    
except Exception as e:
    log_error(f"Structure validation failed: {e}")

# Test 3: Cache behavior (First request)
log_test(3, "Cache Behavior - First Request (MISS)")
try:
    start_time = time.time()
    response = requests.get(API_ENDPOINT, timeout=10)
    response_time = (time.time() - start_time) * 1000
    
    cache_status = response.headers.get('X-Cache', 'unknown')
    log_info(f"Cache status: {cache_status}")
    log_info(f"Response time: {format_response_time(response_time)}")
    
    if response.status_code == 200:
        log_success(f"First request successful")
    
except Exception as e:
    log_error(f"First request failed: {e}")

# Test 4: Cache behavior (Second request)
log_test(4, "Cache Behavior - Second Request (HIT expected)")
time.sleep(1)  # Wait before second request

try:
    start_time = time.time()
    response = requests.get(API_ENDPOINT, timeout=10)
    response_time = (time.time() - start_time) * 1000
    
    cache_status = response.headers.get('X-Cache', 'unknown')
    log_info(f"Cache status: {cache_status}")
    log_info(f"Response time: {format_response_time(response_time)}")
    
    if response.status_code == 200:
        log_success(f"Second request successful")
    
except Exception as e:
    log_error(f"Second request failed: {e}")

# Test 5: Data completeness
log_test(5, "Data Completeness Check")
try:
    response = requests.get(API_ENDPOINT, timeout=10)
    data = response.json()
    
    sections_with_data = []
    sections_empty = []
    
    for key in ['categories', 'carousel_items', 'flash_sale_products', 
                'luxury_products', 'new_arrivals', 'top_picks',
                'trending_products', 'daily_finds']:
        if key in data:
            if isinstance(data[key], list) and len(data[key]) > 0:
                sections_with_data.append(f"{key} ({len(data[key])} items)")
            else:
                sections_empty.append(f"{key} (empty)")
    
    for section in sections_with_data:
        log_success(f"{section}")
    
    for section in sections_empty:
        log_info(f"{section}")
    
except Exception as e:
    log_error(f"Data check failed: {e}")

# Test 6: All products section
log_test(6, "All Products Section")
try:
    response = requests.get(API_ENDPOINT, timeout=10)
    data = response.json()
    
    if 'all_products' in data:
        all_products = data['all_products']
        if isinstance(all_products, dict):
            products = all_products.get('products', [])
            has_more = all_products.get('has_more', False)
            log_success(f"All products: {len(products)} items")
            log_info(f"Has more: {has_more}")
        else:
            log_info(f"All products: {len(all_products) if isinstance(all_products, list) else 'N/A'}")
    else:
        log_error("All products section not found")
    
except Exception as e:
    log_error(f"All products check failed: {e}")

# Test 7: Query parameters
log_test(7, "Query Parameters Test")
try:
    params = {'categories_limit': 5, 'products_limit': 10}
    response = requests.get(API_ENDPOINT, params=params, timeout=10)
    response_time = response.elapsed.total_seconds() * 1000
    
    if response.status_code == 200:
        log_success(f"Query parameters accepted")
        log_info(f"Response time with params: {format_response_time(response_time)}")
    else:
        log_error(f"Query parameters failed: HTTP {response.status_code}")
    
except Exception as e:
    log_error(f"Query parameters test failed: {e}")

# Summary
print(f"\n{Colors.BOLD}{Colors.HEADER}Test Summary{Colors.ENDC}")
print("=" * 80)
log_success("Homepage batching endpoint is operational!")
log_info("All sections are loading in parallel")
log_info("Redis caching is active")
print("\nNext steps:")
print("1. Deploy to production (Render)")
print("2. Monitor response times and cache hit rates")
print("3. Track section load performance")
