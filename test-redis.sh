#!/bin/bash

echo "Testing Redis Integration..."
echo "=============================="
echo ""

# Check if .env.local exists
if [ -f "frontend/.env.local" ]; then
  echo "✓ .env.local exists"
else
  echo "✗ .env.local not found"
fi

echo ""
echo "Testing Redis connection..."
echo ""

# Make a test request to the health endpoint
echo "Making request to /api/redis/health..."
curl -X GET http://localhost:3000/api/redis/health \
  -H "Content-Type: application/json" \
  2>/dev/null | jq '.' || echo "Could not connect to server. Is it running?"

echo ""
echo ""
echo "Testing product caching..."
echo ""

# Test the products endpoint
echo "Making request to /api/products..."
curl -X GET http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -w "\nResponse headers: X-Cache-Source: %{http_header:X-Cache-Source}\n" \
  2>/dev/null | jq '.data | length' || echo "Could not connect to server"

echo ""
echo "Test complete!"
