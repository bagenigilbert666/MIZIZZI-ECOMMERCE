#!/bin/bash

# Homepage API Batch Testing Script
# Tests the unified /api/homepage endpoint with various parameters

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:5000}"
TIMEOUT=30

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Homepage API Batch Testing${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}API Base URL: ${API_BASE_URL}${NC}"
echo -e "${YELLOW}Timeout: ${TIMEOUT}s${NC}"
echo ""

# Test 1: Basic homepage data fetch
test_basic_fetch() {
    echo -e "${BLUE}[TEST 1] Basic Homepage Fetch${NC}"
    echo "Description: Fetch all homepage sections with default limits"
    echo "Command:"
    echo "curl -X GET '${API_BASE_URL}/api/homepage' -H 'Content-Type: application/json'"
    echo ""
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/api/homepage" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ HTTP ${http_code}${NC}"
        echo "Response Preview:"
        echo "$body" | head -c 500
        echo -e "\n${GREEN}✓ Test passed${NC}\n"
    else
        echo -e "${RED}✗ HTTP ${http_code}${NC}"
        echo "Error Response:"
        echo "$body"
        echo -e "${RED}✗ Test failed${NC}\n"
    fi
}

# Test 2: Custom limits
test_custom_limits() {
    echo -e "${BLUE}[TEST 2] Custom Limits${NC}"
    echo "Description: Fetch homepage with custom limits for each section"
    echo "Command:"
    echo "curl -X GET '${API_BASE_URL}/api/homepage?categories_limit=10&flash_sale_limit=15&luxury_limit=8&all_products_limit=20&all_products_page=1' -H 'Content-Type: application/json'"
    echo ""
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/api/homepage" \
        -G \
        -d "categories_limit=10" \
        -d "flash_sale_limit=15" \
        -d "luxury_limit=8" \
        -d "all_products_limit=20" \
        -d "all_products_page=1" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ HTTP ${http_code}${NC}"
        echo "Response (first 500 chars):"
        echo "$body" | head -c 500
        echo -e "\n${GREEN}✓ Test passed${NC}\n"
    else
        echo -e "${RED}✗ HTTP ${http_code}${NC}"
        echo "Error:"
        echo "$body"
        echo -e "${RED}✗ Test failed${NC}\n"
    fi
}

# Test 3: Cache headers
test_cache_headers() {
    echo -e "${BLUE}[TEST 3] Cache Headers${NC}"
    echo "Description: Check cache headers and performance"
    echo "Command:"
    echo "curl -I -X GET '${API_BASE_URL}/api/homepage' -H 'Content-Type: application/json'"
    echo ""
    
    response=$(curl -s -i -X GET "${API_BASE_URL}/api/homepage" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    
    echo "Response Headers:"
    echo "$response" | head -20
    
    # Check for cache headers
    if echo "$response" | grep -q "X-Cache"; then
        echo -e "${GREEN}✓ Cache headers present${NC}"
    else
        echo -e "${YELLOW}⚠ Cache headers not found${NC}"
    fi
    
    echo ""
}

# Test 4: Performance - measure response time
test_performance() {
    echo -e "${BLUE}[TEST 4] Performance Measurement${NC}"
    echo "Description: Measure response time for cached and uncached requests"
    echo ""
    
    # First request (uncached)
    echo "First request (likely uncached):"
    time1=$(curl -s -o /dev/null -w "%{time_total}" -X GET "${API_BASE_URL}/api/homepage" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    echo -e "Time: ${YELLOW}${time1}s${NC}"
    
    # Second request (likely cached)
    echo "Second request (likely cached):"
    time2=$(curl -s -o /dev/null -w "%{time_total}" -X GET "${API_BASE_URL}/api/homepage" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    echo -e "Time: ${YELLOW}${time2}s${NC}"
    
    echo ""
    echo -e "${GREEN}✓ Performance test complete${NC}\n"
}

# Test 5: Error handling - invalid parameters
test_invalid_params() {
    echo -e "${BLUE}[TEST 5] Invalid Parameters${NC}"
    echo "Description: Test API with invalid parameter values"
    echo "Command:"
    echo "curl -X GET '${API_BASE_URL}/api/homepage?categories_limit=abc' -H 'Content-Type: application/json'"
    echo ""
    
    response=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/api/homepage" \
        -G \
        -d "categories_limit=abc" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo -e "HTTP ${http_code}"
    echo "Response:"
    echo "$body" | head -c 300
    echo ""
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
        echo -e "${GREEN}✓ Error handling works${NC}\n"
    else
        echo -e "${RED}✗ Unexpected response${NC}\n"
    fi
}

# Test 6: Full response analysis
test_response_structure() {
    echo -e "${BLUE}[TEST 6] Response Structure Validation${NC}"
    echo "Description: Verify response structure matches expected format"
    echo ""
    
    response=$(curl -s -X GET "${API_BASE_URL}/api/homepage" \
        -H "Content-Type: application/json" \
        --max-time $TIMEOUT)
    
    echo "Full Response (formatted):"
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    
    # Check for required fields
    if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Response has status field${NC}"
    else
        echo -e "${RED}✗ Missing status field${NC}"
    fi
    
    if echo "$response" | jq -e '.data' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Response has data field${NC}"
    else
        echo -e "${RED}✗ Missing data field${NC}"
    fi
    
    echo ""
}

# Main execution
main() {
    # Check if API is reachable
    echo -e "${YELLOW}Checking API availability...${NC}"
    if ! curl -s --max-time 5 "${API_BASE_URL}/api/homepage" > /dev/null 2>&1; then
        echo -e "${RED}✗ Cannot reach API at ${API_BASE_URL}${NC}"
        echo -e "${YELLOW}Make sure the backend server is running:${NC}"
        echo "  cd backend && python run.py"
        echo ""
        exit 1
    fi
    echo -e "${GREEN}✓ API is reachable${NC}\n"
    
    # Run tests
    test_basic_fetch
    test_custom_limits
    test_cache_headers
    test_response_structure
    test_performance
    test_invalid_params
    
    echo -e "${BLUE}================================================${NC}"
    echo -e "${GREEN}Testing Complete!${NC}"
    echo -e "${BLUE}================================================${NC}"
}

# Run main function
main
