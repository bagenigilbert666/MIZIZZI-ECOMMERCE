#!/bin/bash

# Database Indexing Performance Testing Script
# Tests product routes with and without indexes to measure performance improvements

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
ITERATIONS=${ITERATIONS:-3}

echo "=========================================="
echo "Database Indexing Performance Testing"
echo "=========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Iterations per test: $ITERATIONS"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
}

# Helper function to test endpoint
test_endpoint() {
    local test_name=$1
    local endpoint=$2
    local description=$3
    
    print_section "Test: $test_name"
    echo "Description: $description"
    echo "Endpoint: $endpoint"
    echo ""
    
    total_time=0
    cache_hits=0
    cache_misses=0
    
    for i in $(seq 1 $ITERATIONS); do
        echo -n "  Iteration $i/$ITERATIONS: "
        
        # Execute curl and capture response time and headers
        response=$(curl -s -w "\n%{time_total}" "$BASE_URL$endpoint")
        time_taken=$(echo "$response" | tail -n1)
        headers=$(echo "$response" | head -n-1 | grep -i "x-cache:")
        
        # Check cache status
        if echo "$headers" | grep -q "HIT"; then
            echo -e "${GREEN}CACHE HIT${NC} - ${time_taken}s"
            ((cache_hits++))
        else
            echo -e "${YELLOW}CACHE MISS${NC} - ${time_taken}s"
            ((cache_misses++))
        fi
        
        # Add to total (convert to milliseconds for easier reading)
        ms=$(echo "$time_taken * 1000" | bc)
        total_time=$(echo "$total_time + $ms" | bc)
    done
    
    # Calculate average
    avg_time=$(echo "scale=2; $total_time / $ITERATIONS" | bc)
    
    echo ""
    echo -e "Results:"
    echo -e "  ${GREEN}Cache Hits: $cache_hits${NC}"
    echo -e "  ${YELLOW}Cache Misses: $cache_misses${NC}"
    echo -e "  Average Time: ${avg_time}ms"
    echo ""
}

# Test 1: Get all products (with pagination)
test_endpoint \
    "Products List with Pagination" \
    "/api/products/?page=1&per_page=20&sort_by=created_at" \
    "Tests basic product listing with sorting and pagination. Index: idx_products_sort_order_created"

# Test 2: Filter by category
test_endpoint \
    "Category Filter" \
    "/api/products/?category=electronics&is_active=true&is_visible=true" \
    "Tests category filtering with active/visible filters. Index: idx_products_category_active_visible"

# Test 3: Price range filter
test_endpoint \
    "Price Range Filter" \
    "/api/products/?category=electronics&min_price=100&max_price=5000&is_active=true" \
    "Tests price range filtering. Index: idx_products_category_price_range"

# Test 4: Brand filter with discount
test_endpoint \
    "Brand Filter with Discounts" \
    "/api/products/?brand=samsung&sort_by=discount" \
    "Tests brand filtering with discount sorting. Index: idx_products_brand_price_discount"

# Test 5: Flash sale products
test_endpoint \
    "Flash Sale Products" \
    "/api/products/flash-sale?limit=50" \
    "Tests flash sale products with discount ordering. Index: idx_products_flash_sale_active"

# Test 6: Luxury deals
test_endpoint \
    "Luxury Deals" \
    "/api/products/luxury-deals?limit=20" \
    "Tests luxury deals with custom sorting. Index: idx_products_luxury_deals_sort"

# Test 7: Featured products
test_endpoint \
    "Featured Products" \
    "/api/products/featured?limit=20" \
    "Tests featured and trending products. Index: idx_products_featured_trending"

# Test 8: New arrivals
test_endpoint \
    "New Arrivals" \
    "/api/products/new-arrivals?limit=20&sort_by=created_at" \
    "Tests new arrival products with date sorting. Index: idx_products_new_arrivals_sort"

# Test 9: Single product by slug
test_endpoint \
    "Single Product by Slug" \
    "/api/products/iphone-15-pro" \
    "Tests product retrieval by slug. Index: idx_products_active_slug"

# Test 10: Search with filters
test_endpoint \
    "Search with Filters" \
    "/api/products/search?q=phone&category=electronics&sort_by=relevance" \
    "Tests text search with category filtering and sorting"

# Print summary
print_section "Testing Summary"
echo ""
echo -e "${GREEN}All index performance tests completed!${NC}"
echo ""
echo "Key Performance Indicators:"
echo "  1. Cache Hit Ratio: Higher is better (aim for >80% on warm cache)"
echo "  2. Response Time: With indexes should be <200ms for most queries"
echo "  3. Pagination: With indexes should handle large pages efficiently"
echo ""
echo "Next Steps:"
echo "  1. Run tests multiple times to warm up cache"
echo "  2. Monitor index usage with: monitor_indexes.py"
echo "  3. Check explain plans with: EXPLAIN ANALYZE [query]"
echo ""
