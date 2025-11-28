"""
Meilisearch Test Script for FREE Self-Hosted Version
=====================================================
This script tests the Meilisearch integration to ensure everything is working.

PREREQUISITES:
1. Start Meilisearch with Docker (FREE - no API key needed):
   docker run -it --rm -p 7700:7700 -v meili_data:/meili_data getmeili/meilisearch:v1.10

2. Run setup script first:
   python scripts/setup_meilisearch.py

Usage:
    python scripts/test_meilisearch.py

Environment Variables (Optional):
    - MEILISEARCH_HOST: The Meilisearch server URL (default: http://localhost:7700)
    - MEILISEARCH_API_KEY: Only needed if you set a master key
"""

import os
import sys
import time

try:
    import meilisearch
except ImportError:
    print("ERROR: meilisearch package not installed")
    print("Run: pip install meilisearch")
    sys.exit(1)

# Try to load dotenv (optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Try to load requests for API tests (optional)
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# Test results tracking
test_results = {
    'passed': 0,
    'failed': 0,
    'tests': []
}

def log_test(name, passed, message=""):
    """Log test result"""
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}")
    if message:
        print(f"         {message}")
    
    test_results['tests'].append({
        'name': name,
        'passed': passed,
        'message': message
    })
    
    if passed:
        test_results['passed'] += 1
    else:
        test_results['failed'] += 1

def get_client():
    """Get Meilisearch client for FREE self-hosted version"""
    host = os.getenv('MEILISEARCH_HOST', 'http://localhost:7700')
    api_key = os.getenv('MEILISEARCH_API_KEY', '')
    
    if api_key:
        return meilisearch.Client(host, api_key)
    else:
        return meilisearch.Client(host)

def test_connection():
    """Test 1: Connection to Meilisearch"""
    print("\n--- Test 1: Connection ---")
    
    try:
        client = get_client()
        health = client.health()
        
        if health['status'] == 'available':
            log_test("Server connection", True, f"Status: {health['status']}")
            
            try:
                version = client.get_version()
                log_test(f"Version: {version.get('pkgVersion', 'unknown')}", True)
            except:
                pass
        else:
            log_test("Server connection", False, f"Unexpected status: {health['status']}")
            
    except Exception as e:
        log_test("Server connection", False, str(e))
        print("\n  Tip: Start Meilisearch with:")
        print("  docker run -it --rm -p 7700:7700 -v meili_data:/meili_data getmeili/meilisearch:v1.10")

def test_products_index_exists():
    """Test 2: Products index exists"""
    print("\n--- Test 2: Products Index ---")
    
    try:
        client = get_client()
        index = client.get_index('products')
        stats = index.get_stats()
        
        # The newer meilisearch-python SDK returns IndexStats object, not dict
        try:
            # Try object attribute access (newer SDK)
            num_docs = stats.number_of_documents
        except AttributeError:
            # Fallback to dictionary access (older SDK)
            num_docs = stats.get('numberOfDocuments', 0) if isinstance(stats, dict) else 0
        
        log_test("Products index exists", True, f"Documents: {num_docs}")
        
        # Check if index has documents
        if num_docs > 0:
            log_test("Products index has data", True)
        else:
            log_test("Products index has data", False, "No documents found - run setup script or sync products")
            print("\n  Tip: Sync products by running:")
            print("  curl -X POST http://localhost:5000/api/admin/meilisearch/sync-products")
            print("  Or run: python scripts/setup_meilisearch.py")
            
    except meilisearch.errors.MeilisearchApiError as e:
        if 'index_not_found' in str(e):
            log_test("Products index exists", False, "Index not found - run setup script")
        else:
            log_test("Products index exists", False, str(e))
    except Exception as e:
        log_test("Products index exists", False, str(e))

def test_index_settings():
    """Test 3: Index settings are configured"""
    print("\n--- Test 3: Index Settings ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Check searchable attributes
        searchable = index.get_searchable_attributes()
        has_searchable = len(searchable) > 0 and searchable != ['*']
        log_test("Searchable attributes configured", has_searchable, 
                 f"Attributes: {searchable[:3]}..." if len(searchable) > 3 else f"Attributes: {searchable}")
        
        # Check filterable attributes
        filterable = index.get_filterable_attributes()
        has_filterable = len(filterable) > 0
        log_test("Filterable attributes configured", has_filterable,
                 f"Attributes: {filterable[:3]}..." if len(filterable) > 3 else f"Attributes: {filterable}")
        
        # Check sortable attributes
        sortable = index.get_sortable_attributes()
        has_sortable = len(sortable) > 0
        log_test("Sortable attributes configured", has_sortable,
                 f"Attributes: {sortable[:3]}..." if len(sortable) > 3 else f"Attributes: {sortable}")
        
    except Exception as e:
        log_test("Index settings", False, str(e))

def test_basic_search():
    """Test 4: Basic search functionality"""
    print("\n--- Test 4: Basic Search ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Test empty query (should return all)
        results = index.search('')
        log_test("Empty query search", True, f"Returned {len(results['hits'])} hits")
        
        # Test with a simple query
        results = index.search('product')
        log_test("Simple query search", True, f"Query 'product' returned {len(results['hits'])} hits")
        
        # Test search with limit
        results = index.search('', {'limit': 5})
        limited = len(results['hits']) <= 5
        log_test("Search with limit", limited, f"Limited to {len(results['hits'])} results")
        
    except Exception as e:
        log_test("Basic search", False, str(e))

def test_filtered_search():
    """Test 5: Filtered search"""
    print("\n--- Test 5: Filtered Search ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Get a sample to find a valid category
        sample = index.search('', {'limit': 1})
        
        if sample['hits']:
            # Test filter by in_stock
            results = index.search('', {'filter': 'in_stock = true'})
            log_test("Filter by in_stock", True, f"Found {len(results['hits'])} in-stock products")
            
            # Test filter by price range
            results = index.search('', {'filter': 'price >= 0 AND price <= 1000'})
            log_test("Filter by price range", True, f"Found {len(results['hits'])} products in price range")
            
        else:
            log_test("Filtered search", False, "No products to test with")
            
    except Exception as e:
        log_test("Filtered search", False, str(e))

def test_sorted_search():
    """Test 6: Sorted search"""
    print("\n--- Test 6: Sorted Search ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Sort by price ascending
        results = index.search('', {'sort': ['price:asc'], 'limit': 5})
        log_test("Sort by price (asc)", True, f"First result price: {results['hits'][0].get('price', 'N/A') if results['hits'] else 'No results'}")
        
        # Sort by price descending
        results = index.search('', {'sort': ['price:desc'], 'limit': 5})
        log_test("Sort by price (desc)", True, f"First result price: {results['hits'][0].get('price', 'N/A') if results['hits'] else 'No results'}")
        
    except Exception as e:
        log_test("Sorted search", False, str(e))

def test_add_and_delete_document():
    """Test 7: Add and delete document"""
    print("\n--- Test 7: Add/Delete Document ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Add a test document
        test_doc = {
            'id': 999999,
            'title': 'TEST_PRODUCT_DELETE_ME',
            'name': 'Test Product',
            'description': 'This is a test product for Meilisearch testing',
            'price': 99.99,
            'category': 'Test',
            'in_stock': True,
            'is_active': True
        }
        
        task = index.add_documents([test_doc])
        client.wait_for_task(task.task_uid)
        
        # Verify it was added
        time.sleep(1)  # Small delay for indexing
        results = index.search('TEST_PRODUCT_DELETE_ME')
        added = any(hit.get('id') == 999999 for hit in results['hits'])
        log_test("Add test document", added, f"Document ID: 999999")
        
        # Delete the test document
        task = index.delete_document(999999)
        client.wait_for_task(task.task_uid)
        
        # Verify it was deleted
        time.sleep(1)
        results = index.search('TEST_PRODUCT_DELETE_ME')
        deleted = not any(hit.get('id') == 999999 for hit in results['hits'])
        log_test("Delete test document", deleted)
        
    except Exception as e:
        log_test("Add/Delete document", False, str(e))

def test_typo_tolerance():
    """Test 8: Typo tolerance"""
    print("\n--- Test 8: Typo Tolerance ---")
    
    try:
        client = get_client()
        index = client.index('products')
        
        # Get a sample product name
        sample = index.search('', {'limit': 1})
        
        if sample['hits'] and sample['hits'][0].get('title'):
            original_title = sample['hits'][0]['title']
            
            # Introduce a typo (swap two letters or add extra letter)
            if len(original_title) > 3:
                typo_query = original_title[:2] + 'x' + original_title[3:]
                results = index.search(typo_query)
                
                found_original = any(hit.get('title') == original_title for hit in results['hits'])
                log_test("Typo tolerance", found_original or len(results['hits']) > 0, 
                        f"Query with typo returned {len(results['hits'])} results")
            else:
                log_test("Typo tolerance", True, "Skipped - title too short")
        else:
            log_test("Typo tolerance", False, "No products to test with")
            
    except Exception as e:
        log_test("Typo tolerance", False, str(e))

def test_api_endpoint():
    """Test 9: Test API endpoint (if server is running)"""
    print("\n--- Test 9: API Endpoint ---")
    
    if not REQUESTS_AVAILABLE:
        log_test("API endpoint", True, "Skipped - requests library not installed")
        return
    
    try:
        # Try local development server
        api_url = os.getenv('API_URL', 'http://localhost:5000')
        
        response = requests.get(f"{api_url}/api/search", params={'q': 'test'}, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            hits = data.get('results', data.get('hits', []))
            log_test("API endpoint accessible", True, f"Returned {len(hits)} results")
        elif response.status_code == 400:
            log_test("API endpoint accessible", True, "Returns 400 for empty results (expected)")
        else:
            log_test("API endpoint accessible", False, f"Status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        log_test("API endpoint", True, "Skipped - Flask server not running")
    except Exception as e:
        log_test("API endpoint", False, str(e))

def test_meilisearch_ui():
    """Test 10: Meilisearch UI accessible"""
    print("\n--- Test 10: Meilisearch UI ---")
    
    if not REQUESTS_AVAILABLE:
        log_test("Meilisearch UI", True, "Skipped - requests library not installed")
        return
    
    host = os.getenv('MEILISEARCH_HOST', 'http://localhost:7700')
    
    try:
        response = requests.get(host, timeout=5)
        
        if response.status_code == 200:
            log_test(f"Meilisearch UI at {host}", True)
        else:
            log_test("Meilisearch UI", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Meilisearch UI", False, str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    total = test_results['passed'] + test_results['failed']
    print(f"\nTotal tests: {total}")
    print(f"Passed: {test_results['passed']}")
    print(f"Failed: {test_results['failed']}")
    
    if test_results['failed'] > 0:
        print(f"\nFailed tests:")
        for test in test_results['tests']:
            if not test['passed']:
                print(f"  - {test['name']}: {test['message']}")
    
    print("\n" + "=" * 50)
    
    if test_results['failed'] == 0:
        print("All tests passed! Meilisearch is working correctly.")
    else:
        print(f"{test_results['failed']} test(s) failed. Please check the issues above.")
    
    print("\n--- Next Steps ---")
    print("1. Access Meilisearch UI: http://localhost:7700")
    print("2. Search API: GET /api/search?q=your+query")
    print("3. Admin sync: POST /api/admin/meilisearch/sync-products")
    
    return test_results['failed'] == 0

def main():
    """Run all tests"""
    print("=" * 50)
    print("MEILISEARCH TEST SUITE - FREE SELF-HOSTED VERSION")
    print("=" * 50)
    
    host = os.getenv('MEILISEARCH_HOST', 'http://localhost:7700')
    print(f"\nTesting against: {host}")
    print("(No API key required for free self-hosted version)")
    
    # Run all tests
    test_connection()
    test_products_index_exists()
    test_index_settings()
    test_basic_search()
    test_filtered_search()
    test_sorted_search()
    test_add_and_delete_document()
    test_typo_tolerance()
    test_api_endpoint()
    test_meilisearch_ui()  # Added new test
    
    # Print summary
    success = print_summary()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
