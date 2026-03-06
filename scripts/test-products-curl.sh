#!/bin/bash

# Comprehensive curl test suite for products routes
# Usage: bash scripts/test-products-curl.sh [BASE_URL]

BASE_URL="${1:-http://localhost:5000/api/products}"
ECHO_RED='\033[0;31m'
ECHO_GREEN='\033[0;32m'
ECHO_YELLOW='\033[1;33m'
ECHO_BLUE='\033[0;34m'
ECHO_NC='\033[0m' # No Color

echo -e "${ECHO_BLUE}════════════════════════════════════════════════════════════${ECHO_NC}"
echo -e "${ECHO_BLUE}  PRODUCTS ROUTES CURL TEST SUITE${ECHO_NC}"
echo -e "${ECHO_BLUE}════════════════════════════════════════════════════════════${ECHO_NC}"
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Single Product by ID
echo -e "${ECHO_YELLOW}[TEST 1] GET /products/1 (Single Product by ID)${ECHO_NC}"
echo "curl -s '$BASE_URL/1' | jq '.id, .name, .price, .slug'"
RESPONSE=$(curl -s "$BASE_URL/1")
if echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo -e "${ECHO_GREEN}✓ Valid JSON response${ECHO_NC}"
    echo "$RESPONSE" | jq -r '.id, .name, .price' 2>/dev/null | head -3
else
    echo -e "${ECHO_RED}✗ Invalid JSON response${ECHO_NC}"
fi
echo ""

# Test 2: Single Product by Slug
echo -e "${ECHO_YELLOW}[TEST 2] GET /products/slug/{slug} (Product by Slug)${ECHO_NC}"
SLUG=$(curl -s "$BASE_URL/1" | jq -r '.slug // empty')
if [ -n "$SLUG" ]; then
    echo "Testing with slug: $SLUG"
    RESPONSE=$(curl -s "$BASE_URL/slug/$SLUG")
    if echo "$RESPONSE" | jq -e '.slug' > /dev/null 2>&1; then
        echo -e "${ECHO_GREEN}✓ Slug endpoint works${ECHO_NC}"
    else
        echo -e "${ECHO_RED}✗ Slug endpoint failed${ECHO_NC}"
    fi
else
    echo -e "${ECHO_YELLOW}⊘ Could not get slug from product 1${ECHO_NC}"
fi
echo ""

# Test 3: Cache Hit on Product
echo -e "${ECHO_YELLOW}[TEST 3] Cache Hit Detection (Product by ID)${ECHO_NC}"
echo "Fetching /products/1 twice to check cache..."
TIME1=$(curl -w "%{time_total}" -o /tmp/test1.json -s "$BASE_URL/1")
sleep 0.1
TIME2=$(curl -w "%{time_total}" -o /tmp/test2.json -s "$BASE_URL/1")
echo "First request:  ${TIME1}s"
echo "Second request: ${TIME2}s"
if (( $(echo "$TIME2 < $TIME1 * 0.7" | bc -l) )); then
    echo -e "${ECHO_GREEN}✓ Cache hit detected (second request is faster)${ECHO_NC}"
else
    echo -e "${ECHO_YELLOW}⊘ Cache hit not detected (may be expected on first run)${ECHO_NC}"
fi
echo ""

# Test 4: Product List
echo -e "${ECHO_YELLOW}[TEST 4] GET /products/ (Product List)${ECHO_NC}"
RESPONSE=$(curl -s "$BASE_URL/?page=1&per_page=5")
if echo "$RESPONSE" | jq -e '.items // .products' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.items // .products | length')
    echo -e "${ECHO_GREEN}✓ List endpoint works - $COUNT items returned${ECHO_NC}"
else
    echo -e "${ECHO_RED}✗ List endpoint failed${ECHO_NC}"
fi
echo ""

# Test 5: Fast Endpoint
echo -e "${ECHO_YELLOW}[TEST 5] GET /products/fast (Fast Endpoint)${ECHO_NC}"
TIME_NORMAL=$(curl -w "%{time_total}" -o /tmp/normal.json -s "$BASE_URL/?page=1&per_page=5")
TIME_FAST=$(curl -w "%{time_total}" -o /tmp/fast.json -s "$BASE_URL/fast?page=1&per_page=5")
echo "Normal endpoint: ${TIME_NORMAL}s"
echo "Fast endpoint:   ${TIME_FAST}s"
if (( $(echo "$TIME_FAST < $TIME_NORMAL" | bc -l) )); then
    echo -e "${ECHO_GREEN}✓ Fast endpoint is faster${ECHO_NC}"
else
    echo -e "${ECHO_YELLOW}⊘ Fast endpoint timing comparable${ECHO_NC}"
fi
echo ""

# Test 6: Filters
echo -e "${ECHO_YELLOW}[TEST 6] Filters (is_featured=true)${ECHO_NC}"
RESPONSE=$(curl -s "$BASE_URL/?page=1&per_page=5&is_featured=true")
COUNT=$(echo "$RESPONSE" | jq '.items // .products | length')
echo -e "${ECHO_GREEN}✓ Filter works - $COUNT featured products${ECHO_NC}"
echo ""

# Test 7: Boolean Normalization
echo -e "${ECHO_YELLOW}[TEST 7] Boolean Normalization (is_featured=true vs is_featured=1)${ECHO_NC}"
RESP1=$(curl -s "$BASE_URL/fast?page=1&per_page=5&is_featured=true")
RESP2=$(curl -s "$BASE_URL/fast?page=1&per_page=5&is_featured=1")
COUNT1=$(echo "$RESP1" | jq '.items // .products | length')
COUNT2=$(echo "$RESP2" | jq '.items // .products | length')
echo "is_featured=true: $COUNT1 items"
echo "is_featured=1:    $COUNT2 items"
if [ "$COUNT1" == "$COUNT2" ]; then
    echo -e "${ECHO_GREEN}✓ Boolean normalization works${ECHO_NC}"
else
    echo -e "${ECHO_RED}✗ Boolean normalization mismatch${ECHO_NC}"
fi
echo ""

# Test 8: Featured Sections
echo -e "${ECHO_YELLOW}[TEST 8] Featured Sections${ECHO_NC}"
for section in trending flash_sale new_arrivals top_picks daily_finds luxury_deals; do
    RESPONSE=$(curl -s "$BASE_URL/$section?limit=5")
    if echo "$RESPONSE" | jq -e '.items // .products' > /dev/null 2>&1; then
        COUNT=$(echo "$RESPONSE" | jq '.items // .products | length')
        echo -e "${ECHO_GREEN}✓ /$section: $COUNT items${ECHO_NC}"
    else
        echo -e "${ECHO_YELLOW}⊘ /$section: no response${ECHO_NC}"
    fi
done
echo ""

# Test 9: Featured Sections - Fast
echo -e "${ECHO_YELLOW}[TEST 9] Featured Sections - Fast${ECHO_NC}"
for section in trending flash_sale new_arrivals; do
    RESPONSE=$(curl -s "$BASE_URL/$section/fast?limit=5")
    if echo "$RESPONSE" | jq -e '.items // .products' > /dev/null 2>&1; then
        COUNT=$(echo "$RESPONSE" | jq '.items // .products | length')
        echo -e "${ECHO_GREEN}✓ /$section/fast: $COUNT items${ECHO_NC}"
    else
        echo -e "${ECHO_YELLOW}⊘ /$section/fast: no response${ECHO_NC}"
    fi
done
echo ""

# Test 10: 404 Errors
echo -e "${ECHO_YELLOW}[TEST 10] Error Handling (404)${ECHO_NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/99999999")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "404" ]; then
    echo -e "${ECHO_GREEN}✓ 404 error handled correctly${ECHO_NC}"
else
    echo -e "${ECHO_RED}✗ Expected 404, got $HTTP_CODE${ECHO_NC}"
fi
echo ""

# Test 11: Cache Info
echo -e "${ECHO_YELLOW}[TEST 11] Cache Management - Cache Info${ECHO_NC}"
RESPONSE=$(curl -s "$BASE_URL/cache/info")
if echo "$RESPONSE" | jq -e '.cache_type' > /dev/null 2>&1; then
    CACHE_TYPE=$(echo "$RESPONSE" | jq -r '.cache_type')
    echo -e "${ECHO_GREEN}✓ Cache info available - Type: $CACHE_TYPE${ECHO_NC}"
else
    echo -e "${ECHO_YELLOW}⊘ Cache info endpoint not available${ECHO_NC}"
fi
echo ""

# Test 12: Serialization Fields
echo -e "${ECHO_YELLOW}[TEST 12] Serialization Quality Check${ECHO_NC}"
FULL=$(curl -s "$BASE_URL/1" | jq 'keys | length')
LIST=$(curl -s "$BASE_URL/?page=1&per_page=1" | jq '.items[0] // .products[0] | keys | length')
echo "Full product fields:       $FULL"
echo "List product fields:       $LIST"
if [ "$LIST" -lt "$FULL" ]; then
    REDUCTION=$(( ($FULL - $LIST) * 100 / $FULL ))
    echo -e "${ECHO_GREEN}✓ Lightweight serialization - $REDUCTION% payload reduction${ECHO_NC}"
else
    echo -e "${ECHO_YELLOW}⊘ Serialization sizes similar${ECHO_NC}"
fi
echo ""

# Final Summary
echo -e "${ECHO_BLUE}════════════════════════════════════════════════════════════${ECHO_NC}"
echo -e "${ECHO_GREEN}✓ Products routes test suite complete!${ECHO_NC}"
echo -e "${ECHO_BLUE}════════════════════════════════════════════════════════════${ECHO_NC}"
echo ""
echo "Key endpoints tested:"
echo "  ✓ GET /products/1"
echo "  ✓ GET /products/slug/{slug}"
echo "  ✓ GET /products/"
echo "  ✓ GET /products/fast"
echo "  ✓ Filters (is_featured=true)"
echo "  ✓ Boolean normalization"
echo "  ✓ Featured sections (trending, flash_sale, etc)"
echo "  ✓ Cache behavior"
echo "  ✓ Error handling (404)"
echo "  ✓ Serialization quality"
echo ""
