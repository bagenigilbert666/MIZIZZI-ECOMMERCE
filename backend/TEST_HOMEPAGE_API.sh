#!/bin/bash
# Quick API Testing Guide for Homepage Batch API Refactoring

echo "=== Homepage Batch API Refactoring - Testing Guide ==="
echo ""

# Test 1: Basic request with defaults
echo "Test 1: Basic request with defaults"
curl -i http://localhost:5000/api/homepage

echo ""
echo "---"
echo ""

# Test 2: Cache key differentiation
echo "Test 2: Cache key differentiation (should see different cache keys)"
echo "Request 1: categories_limit=5"
curl -s http://localhost:5000/api/homepage?categories_limit=5 | jq '.meta.cache_key'
echo ""
echo "Request 2: categories_limit=100"
curl -s http://localhost:5000/api/homepage?categories_limit=100 | jq '.meta.cache_key'

echo ""
echo "---"
echo ""

# Test 3: Pagination
echo "Test 3: Pagination (request page 2)"
curl -s http://localhost:5000/api/homepage?all_products_page=2&all_products_limit=12 | jq '.data.all_products | {page, has_more, total}'

echo ""
echo "---"
echo ""

# Test 4: Cache hit/miss
echo "Test 4: Cache hit/miss (first request = MISS, second = HIT)"
echo "First request (should be MISS):"
curl -s -w '\nX-Cache: %{http_header{x-cache}}\n' http://localhost:5000/api/homepage?categories_limit=20 > /dev/null

echo "Second request (should be HIT):"
curl -s -w 'X-Cache: %{http_header{x-cache}}\n' http://localhost:5000/api/homepage?categories_limit=20

echo ""
echo "---"
echo ""

# Test 5: Metadata structure
echo "Test 5: Verify metadata structure in response"
curl -s http://localhost:5000/api/homepage | jq '.meta'

echo ""
echo "---"
echo ""

# Test 6: Contact CTA slides
echo "Test 6: Verify contact_cta_slides in response"
curl -s http://localhost:5000/api/homepage | jq '.data.contact_cta_slides | length'

echo ""
echo "---"
echo ""

# Test 7: Parameter validation (should be constrained)
echo "Test 7: Parameter validation (invalid values should be constrained)"
echo "Request with categories_limit=1000 (should be clamped to 100)"
curl -s http://localhost:5000/api/homepage?categories_limit=1000 | jq '.meta.cache_key' | grep 'cat_100'

echo ""
echo "---"
echo ""

# Test 8: Full response structure
echo "Test 8: Verify full response structure"
curl -s http://localhost:5000/api/homepage | jq 'keys'

echo ""
echo "Tests complete!"
