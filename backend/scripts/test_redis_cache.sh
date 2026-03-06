#!/bin/bash

# Redis Cache Testing Script for Mizizzi E-commerce Products API
# Tests each endpoint one by one to verify Redis caching is working
# Shows cache hits/misses and response times

BASE_URL="http://localhost:5000/api/products"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"  # Set ADMIN_TOKEN env var if needed

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0

# Helper function to print section headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Helper function to run a test
run_test() {
    local test_name=$1
    local endpoint=$2
    local headers=$3
    local expected_cache=$4  # "HIT", "MISS", or "IGNORE"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Test $TOTAL_TESTS: $test_name${NC}"
    echo "Endpoint: $endpoint"
    echo "Command: curl -i $headers \"$BASE_URL$endpoint\""
    echo ""
    
    if [ -z "$headers" ]; then
        response=$(curl -s -i "$BASE_URL$endpoint")
    else
        response=$(curl -s -i $headers "$BASE_URL$endpoint")
    fi
    
    # Extract cache headers
    cache_status=$(echo "$response" | grep -i "^X-Cache:" | awk '{print $2}' | tr -d '\r')
    cache_time=$(echo "$response" | grep -i "^X-Cache-Time-Ms:" | awk '{print $2}' | tr -d '\r')
    response_time=$(echo "$response" | grep -i "^X-Response-Time-Ms:" | awk '{print $2}' | tr -d '\r')
    http_code=$(echo "$response" | head -n 1 | awk '{print $2}')
    
    # Parse JSON response body
    body=$(echo "$response" | tail -n +2 | grep -v "^$" | tail -n 1 2>/dev/null)
    
    # Display results
    echo -e "HTTP Status: ${GREEN}$http_code${NC}"
    
    if [ ! -z "$cache_status" ]; then
        if [ "$cache_status" == "HIT" ]; then
            echo -e "Cache Status: ${GREEN}$cache_status${NC} (${YELLOW}${cache_time}ms${NC})"
        else
            echo -e "Cache Status: ${YELLOW}$cache_status${NC} (${YELLOW}${response_time}ms${NC})"
        fi
        
        # Validate cache status if specified
        if [ "$expected_cache" != "IGNORE" ] && [ ! -z "$cache_status" ]; then
            if [ "$cache_status" == "$expected_cache" ]; then
                echo -e "${GREEN}✓ Cache status matches expected: $expected_cache${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}✗ Cache status mismatch. Expected: $expected_cache, Got: $cache_status${NC}"
            fi
        else
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        if [ "$http_code" == "200" ]; then
            echo -e "${GREEN}✓ Endpoint returned 200${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    fi
    
    if [ ! -z "$body" ]; then
        echo "Response: $(echo $body | head -c 100)..."
    fi
    
    echo ""
}

# ============================================
# START TESTING
# ============================================

print_header "REDIS CACHE TESTING - Products API"

echo "Starting cache tests. Each test will be run twice - first for MISS, then for HIT"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
print_header "Test 1: Health Check Endpoint"
run_test "Health Check" "/health" "" "IGNORE"

# Test 2: Cache Status
print_header "Test 2: Cache Status Endpoint"
run_test "Get Cache Status" "/cache/status" "" "IGNORE"

# Test 3: Get All Products (FIRST RUN - MISS)
print_header "Test 3: Get All Products - First Run (CACHE MISS)"
run_test "Get All Products [MISS]" "/" "" "MISS"

# Test 3b: Get All Products (SECOND RUN - HIT)
print_header "Test 3b: Get All Products - Second Run (CACHE HIT)"
echo "Waiting 1 second before retry..."
sleep 1
run_test "Get All Products [HIT]" "/" "" "HIT"

# Test 4: Get Products with Category Filter (FIRST RUN - MISS)
print_header "Test 4: Category Filter - First Run (CACHE MISS)"
run_test "Get Products by Category [MISS]" "/?category_id=1" "" "MISS"

# Test 4b: Get Products with Category Filter (SECOND RUN - HIT)
print_header "Test 4b: Category Filter - Second Run (CACHE HIT)"
sleep 1
run_test "Get Products by Category [HIT]" "/?category_id=1" "" "HIT"

# Test 5: Get Products with Brand Filter (FIRST RUN - MISS)
print_header "Test 5: Brand Filter - First Run (CACHE MISS)"
run_test "Get Products by Brand [MISS]" "/?brand_id=1" "" "MISS"

# Test 5b: Get Products with Brand Filter (SECOND RUN - HIT)
print_header "Test 5b: Brand Filter - Second Run (CACHE HIT)"
sleep 1
run_test "Get Products by Brand [HIT]" "/?brand_id=1" "" "HIT"

# Test 6: Flash Sale Products (FIRST RUN - MISS)
print_header "Test 6: Flash Sale Products - First Run (CACHE MISS)"
run_test "Get Flash Sale Products [MISS]" "/flash-sale?limit=20" "" "MISS"

# Test 6b: Flash Sale Products (SECOND RUN - HIT)
print_header "Test 6b: Flash Sale Products - Second Run (CACHE HIT)"
sleep 1
run_test "Get Flash Sale Products [HIT]" "/flash-sale?limit=20" "" "HIT"

# Test 7: Trending Products (FIRST RUN - MISS)
print_header "Test 7: Trending Products - First Run (CACHE MISS)"
run_test "Get Trending Products [MISS]" "/trending?limit=20" "" "MISS"

# Test 7b: Trending Products (SECOND RUN - HIT)
print_header "Test 7b: Trending Products - Second Run (CACHE HIT)"
sleep 1
run_test "Get Trending Products [HIT]" "/trending?limit=20" "" "HIT"

# Test 8: New Arrivals (FIRST RUN - MISS)
print_header "Test 8: New Arrivals - First Run (CACHE MISS)"
run_test "Get New Arrivals [MISS]" "/new-arrivals?limit=20" "" "MISS"

# Test 8b: New Arrivals (SECOND RUN - HIT)
print_header "Test 8b: New Arrivals - Second Run (CACHE HIT)"
sleep 1
run_test "Get New Arrivals [HIT]" "/new-arrivals?limit=20" "" "HIT"

# Test 9: Search Products (FIRST RUN - MISS)
print_header "Test 9: Search Products - First Run (CACHE MISS)"
run_test "Search Products [MISS]" "/?search=shirt" "" "MISS"

# Test 9b: Search Products (SECOND RUN - HIT)
print_header "Test 9b: Search Products - Second Run (CACHE HIT)"
sleep 1
run_test "Search Products [HIT]" "/?search=shirt" "" "HIT"

# Test 10: Get Single Product by ID (FIRST RUN - MISS)
print_header "Test 10: Get Product by ID - First Run (CACHE MISS)"
run_test "Get Product by ID [MISS]" "/1" "" "MISS"

# Test 10b: Get Single Product by ID (SECOND RUN - HIT)
print_header "Test 10b: Get Product by ID - Second Run (CACHE HIT)"
sleep 1
run_test "Get Product by ID [HIT]" "/1" "" "HIT"

# Test 11: Get Product by Slug (FIRST RUN - MISS)
print_header "Test 11: Get Product by Slug - First Run (CACHE MISS)"
run_test "Get Product by Slug [MISS]" "/product/test-product" "" "MISS"

# Test 11b: Get Product by Slug (SECOND RUN - HIT)
print_header "Test 11b: Get Product by Slug - Second Run (CACHE HIT)"
sleep 1
run_test "Get Product by Slug [HIT]" "/product/test-product" "" "HIT"

# Test 12: Pagination Test
print_header "Test 12: Pagination - Different Page (CACHE MISS)"
run_test "Get Products Page 2 [MISS]" "/?page=2" "" "MISS"

# Test 12b: Pagination Test (SECOND RUN - HIT)
print_header "Test 12b: Pagination - Different Page (CACHE HIT)"
sleep 1
run_test "Get Products Page 2 [HIT]" "/?page=2" "" "HIT"

# Test 13: Complex Filter (FIRST RUN - MISS)
print_header "Test 13: Complex Filter - First Run (CACHE MISS)"
run_test "Complex Filter [MISS]" "/?category_id=1&is_featured=1&sort_by=price_asc" "" "MISS"

# Test 13b: Complex Filter (SECOND RUN - HIT)
print_header "Test 13b: Complex Filter - Second Run (CACHE HIT)"
sleep 1
run_test "Complex Filter [HIT]" "/?category_id=1&is_featured=1&sort_by=price_asc" "" "HIT"

# Test 14: Get All Cached Products
print_header "Test 14: Get All Cached Products"
run_test "Get All Cached Products" "/cache/all" "" "IGNORE"

# Test 15: Featured Products
print_header "Test 15: Featured Products - First Run (CACHE MISS)"
run_test "Get Featured Products [MISS]" "/featured?limit=20" "" "MISS"

# Test 15b: Featured Products (SECOND RUN - HIT)
print_header "Test 15b: Featured Products - Second Run (CACHE HIT)"
sleep 1
run_test "Get Featured Products [HIT]" "/featured?limit=20" "" "HIT"

# Summary
print_header "TEST SUMMARY"
echo -e "Total Tests Run: $TOTAL_TESTS"
echo -e "Passed Tests: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed Tests: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
