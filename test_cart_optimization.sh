#!/bin/bash
# Cart System Quick Start Testing Guide
# Test the new optimized cart endpoints

BASE_URL="http://localhost:5000"
AUTH_TOKEN="your_jwt_token_here"

echo "=== CART SYSTEM OPTIMIZATION - TESTING GUIDE ==="
echo ""

# ==================== GUEST CART TESTS ====================
echo "1. CREATE GUEST CART"
echo "===================="
GUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cart/v2/guest/cart" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": 1, "quantity": 2, "price": 2999},
      {"product_id": 2, "quantity": 1, "price": 1500}
    ],
    "coupon_code": null
  }')

echo "Response: $GUEST_RESPONSE"
GUEST_ID=$(echo $GUEST_RESPONSE | jq -r '.guest_id')
echo "Guest ID: $GUEST_ID"
echo ""

# ==================== RETRIEVE GUEST CART ====================
echo "2. RETRIEVE GUEST CART"
echo "======================"
curl -s -X GET "$BASE_URL/api/cart/v2/guest/cart?guest_id=$GUEST_ID" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ==================== CACHE STATS ====================
echo "3. CHECK CACHE STATISTICS"
echo "========================="
curl -s -X GET "$BASE_URL/api/cart/v2/cache/stats" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ==================== GET OPTIMIZED CART (USER) ====================
echo "4. GET OPTIMIZED CART (Authenticated User)"
echo "=========================================="
curl -s -X GET "$BASE_URL/api/cart/v2/optimized" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ==================== UPDATE GUEST CART ====================
echo "5. ADD ITEM TO GUEST CART"
echo "========================="
curl -s -X POST "$BASE_URL/api/cart/v2/guest/cart" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {\"product_id\": 1, \"quantity\": 2, \"price\": 2999},
      {\"product_id\": 2, \"quantity\": 1, \"price\": 1500},
      {\"product_id\": 3, \"quantity\": 1, \"price\": 5999}
    ]
  }" | jq '.'
echo ""

# ==================== DELETE GUEST CART ====================
echo "6. DELETE GUEST CART"
echo "==================="
curl -s -X DELETE "$BASE_URL/api/cart/v2/guest/cart/$GUEST_ID" \
  -H "Content-Type: application/json" | jq '.'
echo ""

# ==================== INVALIDATE PRODUCT CACHE ====================
echo "7. INVALIDATE PRODUCT CACHE"
echo "=========================="
curl -s -X POST "$BASE_URL/api/cart/v2/cache/invalidate/product/1" \
  -H "Content-Type: application/json" | jq '.'
echo ""

echo "=== TESTING COMPLETE ==="
echo ""
echo "Key Observations:"
echo "- Guest cart should load from Redis (<100ms)"
echo "- First product lookup uses cache after second request"
echo "- Cache invalidation should return success"
echo ""
echo "Performance Metrics to Monitor:"
echo "- Cache hit rate (target: 85-95%)"
echo "- Average response time (target: <250ms)"
echo "- Database queries (should decrease over time)"
