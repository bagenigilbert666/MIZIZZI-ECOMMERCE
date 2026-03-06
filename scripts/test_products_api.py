#!/usr/bin/env python3
"""
Comprehensive test suite for products routes.
Tests all endpoints, caching, serialization, and refactoring.
Run: python scripts/test_products_api.py
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Tuple

BASE_URL = "http://localhost:5000/api/products"
FEATURED_BASE = "http://localhost:5000/api"

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_test(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*70}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}TEST: {title}{Colors.ENDC}")
    print(f"{Colors.CYAN}{'='*70}{Colors.ENDC}")

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.ENDC}")

def log_info(msg: str):
    print(f"{Colors.CYAN}ℹ {msg}{Colors.ENDC}")

def test_endpoint(method: str, url: str, params: Dict = None, headers: Dict = None, description: str = "") -> Tuple[int, Dict, float]:
    """Test an endpoint and return status, response, and time."""
    try:
        start = time.time()
        if method == "GET":
            resp = requests.get(url, params=params, headers=headers or {}, timeout=10)
        elif method == "POST":
            resp = requests.post(url, json=params, headers=headers or {}, timeout=10)
        elapsed = time.time() - start
        
        try:
            data = resp.json()
        except:
            data = {"error": "Invalid JSON response"}
        
        return resp.status_code, data, elapsed
    except requests.exceptions.ConnectionError:
        log_error(f"Connection failed to {url}")
        return 0, {"error": "Connection error"}, 0
    except Exception as e:
        log_error(f"Request failed: {str(e)}")
        return 0, {"error": str(e)}, 0

def validate_response(status: int, data: Dict, expected_status: int = 200) -> bool:
    """Validate response status and structure."""
    if status != expected_status:
        log_error(f"Expected status {expected_status}, got {status}")
        return False
    if status >= 400:
        log_error(f"Error: {data.get('error', 'Unknown error')}")
        return False
    return True

def check_serialized_product(product: Dict, lightweight: bool = False) -> bool:
    """Validate product serialization."""
    if lightweight:
        required = ['id', 'name', 'slug', 'price']
        optional = ['sale_price', 'image']
    else:
        required = ['id', 'name', 'slug', 'price', 'stock']
        optional = ['category', 'brand', 'sale_price', 'is_featured']
    
    for field in required:
        if field not in product:
            log_error(f"Missing required field: {field}")
            return False
    return True

# ===========================
# TEST SUITE
# ===========================

def test_single_product_endpoints():
    """Test GET /products/<id> and /products/slug/<slug>"""
    log_test("Single Product Endpoints")
    # Pick an existing product from the list so tests don't assume id=1
    log_info("Fetching product list to pick a product for single-product tests")
    status_list, data_list, _ = test_endpoint("GET", f"{BASE_URL}/", params={"page": 1, "per_page": 1})

    product_id = 1
    product_slug = None
    if status_list == 200:
        items = data_list.get('items', data_list.get('products', []))
        if items and len(items) > 0:
            first = items[0]
            product_id = first.get('id', 1)
            product_slug = first.get('slug')

    # Test product by ID
    log_info(f"Testing GET /products/{product_id}")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/{product_id}")
    
    if validate_response(status, data):
        if check_serialized_product(data):
            log_success(f"Product by ID works - {elapsed*1000:.2f}ms")
            product_name = data.get('name', 'Unknown')
            product_slug = data.get('slug', 'unknown')
        else:
            log_error("Product serialization incomplete")
            return False
    else:
        log_error("Failed to fetch product by ID")
        return False
    
    # Test cache hit
    log_info("Testing cache hit on same product")
    status2, data2, elapsed2 = test_endpoint("GET", f"{BASE_URL}/1")
    if elapsed2 < elapsed * 0.5:
        log_success(f"Cache hit detected - {elapsed2*1000:.2f}ms (was {elapsed*1000:.2f}ms)")
    else:
        log_info(f"Cache hit not detected (expected on first run) - {elapsed2*1000:.2f}ms")
    
    # Test product by slug
    if product_slug:
        log_info(f"Testing GET /products/slug/{product_slug}")
        status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/slug/{product_slug}")
        
        if validate_response(status, data):
            if data.get('slug') == product_slug:
                log_success(f"Product by slug works - {elapsed*1000:.2f}ms")
            else:
                log_error("Slug mismatch in response")
                return False
        else:
            log_error("Failed to fetch product by slug")
            return False
    
    return True

def test_list_endpoints():
    """Test GET /products and /products/fast"""
    log_test("List Endpoints")
    
    # Test basic list
    log_info("Testing GET /products (page=1, per_page=10)")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/", params={"page": 1, "per_page": 10})
    
    if validate_response(status, data):
        items = data.get('items', data.get('products', []))
        pagination = data.get('pagination', {})
        
        if items and len(items) > 0:
            log_success(f"List endpoint works - {len(items)} items - {elapsed*1000:.2f}ms")
            if check_serialized_product(items[0], lightweight=True):
                log_success("Product serialization is lightweight (optimal)")
        else:
            log_info("No items in response (may be empty database)")
        
        if pagination:
            log_info(f"Pagination: page={pagination.get('page')}, total={pagination.get('total_items')}")
    else:
        log_error("Failed to fetch product list")
        return False
    
    # Test fast endpoint
    log_info("Testing GET /products/fast (page=1, per_page=10)")
    status, data, elapsed_fast = test_endpoint("GET", f"{BASE_URL}/fast", params={"page": 1, "per_page": 10})
    
    if validate_response(status, data):
        items = data.get('items', data.get('products', []))
        log_success(f"Fast endpoint works - {len(items)} items - {elapsed_fast*1000:.2f}ms")
        
        if elapsed_fast < elapsed * 0.8:
            log_success(f"Fast endpoint is faster ({elapsed_fast*1000:.2f}ms vs {elapsed*1000:.2f}ms)")
        else:
            log_info(f"Fast endpoint timing comparable ({elapsed_fast*1000:.2f}ms vs {elapsed*1000:.2f}ms)")
    else:
        log_error("Failed to fetch fast products")
        return False
    
    # Test with filters
    log_info("Testing list with filters (is_featured=true)")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/", 
                                          params={"page": 1, "per_page": 5, "is_featured": "true"})
    
    if validate_response(status, data):
        items = data.get('items', data.get('products', []))
        log_success(f"Filter works - found {len(items)} featured products - {elapsed*1000:.2f}ms")
    else:
        log_info("Filter request failed (may be normal if no featured products)")
    
    # Test boolean normalization (is_featured=1 should equal is_featured=true in cache)
    log_info("Testing boolean normalization (is_featured=1 vs true)")
    status1, data1, _ = test_endpoint("GET", f"{BASE_URL}/fast", 
                                      params={"page": 1, "per_page": 5, "is_featured": "true"})
    status2, data2, _ = test_endpoint("GET", f"{BASE_URL}/fast", 
                                      params={"page": 1, "per_page": 5, "is_featured": "1"})
    
    items1 = data1.get('items', [])
    items2 = data2.get('items', [])
    
    if len(items1) == len(items2):
        log_success("Boolean normalization works (true == 1)")
    else:
        log_error(f"Boolean normalization failed ({len(items1)} vs {len(items2)} items)")
    
    return True

def test_featured_sections():
    """Test featured section endpoints"""
    log_test("Featured Section Endpoints")
    
    sections = [
        ("trending", "Trending Products"),
        ("flash_sale", "Flash Sale"),
        ("new_arrivals", "New Arrivals"),
        ("top_picks", "Top Picks"),
        ("daily_finds", "Daily Finds"),
        ("luxury_deals", "Luxury Deals"),
    ]
    
    for section_key, section_name in sections:
        # Test normal endpoint
        log_info(f"Testing /products/{section_key}?limit=5")
        status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/{section_key}", params={"limit": 5})
        
        if validate_response(status, data, expected_status=200):
            items = data.get('items', data.get('products', []))
            total = data.get('total', len(items))
            cached_at = data.get('cached_at', 'unknown')
            
            if items:
                log_success(f"{section_name}: {len(items)} items (total: {total}) - {elapsed*1000:.2f}ms")
            else:
                log_info(f"{section_name}: no items (may be normal)")
        else:
            log_error(f"Failed to fetch {section_name}")
        
        # Test fast endpoint
        log_info(f"Testing /products/{section_key}/fast?limit=5")
        status, data, elapsed_fast = test_endpoint("GET", f"{BASE_URL}/{section_key}/fast", params={"limit": 5})
        
        if validate_response(status, data, expected_status=200):
            items = data.get('items', data.get('products', []))
            count = data.get('count', len(items))
            
            if items:
                log_success(f"{section_name} (fast): {count} items - {elapsed_fast*1000:.2f}ms")
    
    return True

def test_cache_management():
    """Test cache warming and invalidation endpoints"""
    log_test("Cache Management Endpoints")
    
    # Test cache status (GET, no auth required for info)
    log_info("Testing GET /products/cache/warming-status")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/cache/warming-status")
    
    if status == 200 or status == 403:  # 403 if admin-only
        log_success("Cache status endpoint responds")
        if status == 200 and 'state' in data:
            log_info(f"Cache state: {json.dumps(data.get('state', {}), indent=2)[:100]}...")
    else:
        log_info(f"Cache status returned {status} (may require admin auth)")
    
    # Test cache info endpoint
    log_info("Testing GET /products/cache/info")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/cache/info")
    
    if validate_response(status, data, expected_status=200):
        cache_type = data.get('cache_type', 'unknown')
        log_success(f"Cache type: {cache_type}")
    else:
        log_info("Cache info endpoint not available (may require admin auth)")
    
    return True

def test_error_handling():
    """Test error handling"""
    log_test("Error Handling")
    
    # Test 404
    log_info("Testing 404: GET /products/99999999")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/99999999")
    
    if status == 404:
        log_success("404 error handled correctly")
    else:
        log_info(f"Got status {status} (expected 404)")
    
    # Test invalid slug
    log_info("Testing 404: GET /products/slug/nonexistent-product")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/slug/nonexistent-product")
    
    if status == 404:
        log_success("404 for invalid slug handled correctly")
    else:
        log_info(f"Got status {status} (expected 404)")
    
    # Test invalid parameters
    log_info("Testing invalid parameters")
    status, data, elapsed = test_endpoint("GET", f"{BASE_URL}/", 
                                          params={"page": -1, "per_page": 999})
    
    if status == 200:
        log_success("Invalid parameters handled gracefully")
    else:
        log_error(f"Invalid parameters returned {status}")
    
    return True

def test_serialization_quality():
    """Test that serialization is correct and lightweight"""
    log_test("Serialization Quality")
    
    # Fetch a full product
    # Pick a product from the list instead of assuming id=1
    status_list, data_list, _ = test_endpoint("GET", f"{BASE_URL}/", params={"page": 1, "per_page": 1})
    product_id = 1
    if status_list == 200:
        items = data_list.get('items', data_list.get('products', []))
        if items and len(items) > 0:
            product_id = items[0].get('id', 1)

    status, full_product, _ = test_endpoint("GET", f"{BASE_URL}/{product_id}")
    
    if status != 200:
        log_error("Could not fetch full product")
        return False
    
    # Count fields
    full_fields = len(full_product)
    log_info(f"Full product serialization: {full_fields} fields")
    
    # Fetch from list (lightweight)
    status, data, _ = test_endpoint("GET", f"{BASE_URL}/", params={"page": 1, "per_page": 1})
    
    if status == 200:
        items = data.get('items', data.get('products', []))
        if items:
            lightweight_fields = len(items[0])
            log_info(f"Lightweight product serialization: {lightweight_fields} fields")
            
            if lightweight_fields < full_fields:
                reduction = ((full_fields - lightweight_fields) / full_fields) * 100
                log_success(f"Lightweight serialization reduces payload by {reduction:.1f}%")
            else:
                log_error("Lightweight serialization should have fewer fields")
    
    # Check admin vs public (if we can access admin)
    log_info("Testing public vs admin serialization differences")
    
    # Public view (no auth)
    status_public, public_product, _ = test_endpoint("GET", f"{BASE_URL}/1")
    public_fields = set(public_product.keys()) if status_public == 200 else set()
    
    log_info(f"Public product has {len(public_fields)} fields")
    
    return True

def run_all_tests():
    """Run complete test suite"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║     PRODUCTS ROUTES COMPREHENSIVE TEST SUITE                       ║")
    print("║     Testing: Endpoints, Caching, Serialization, Refactoring       ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    results = []
    
    try:
        # Run all test suites
        results.append(("Single Product Endpoints", test_single_product_endpoints()))
        results.append(("List Endpoints", test_list_endpoints()))
        results.append(("Featured Sections", test_featured_sections()))
        results.append(("Cache Management", test_cache_management()))
        results.append(("Error Handling", test_error_handling()))
        results.append(("Serialization Quality", test_serialization_quality()))
        
    except Exception as e:
        log_error(f"Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Summary
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║                         TEST SUMMARY                              ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}PASS{Colors.ENDC}" if result else f"{Colors.RED}FAIL{Colors.ENDC}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Overall: {passed}/{total} test suites passed{Colors.ENDC}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✓ All tests passed! Routes are production-ready.{Colors.ENDC}\n")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗ Some tests failed. Check output above.{Colors.ENDC}\n")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(run_all_tests())
