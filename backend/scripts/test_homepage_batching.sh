#!/bin/bash

# Homepage Batching Test Script
# Tests the new /api/homepage batch endpoint

echo "=========================================="
echo "Homepage Batching Test"
echo "=========================================="

# Set base URL
BASE_URL="http://localhost:5000"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}[Test 1] First Request to /api/homepage (Should be MISS/fresh)${NC}"
curl -i "${BASE_URL}/api/homepage" 2>&1 | head -40

echo -e "\n${YELLOW}Waiting 2 seconds...${NC}\n"
sleep 2

echo -e "${BLUE}[Test 2] Second Request (Should be HIT from cache)${NC}"
curl -i "${BASE_URL}/api/homepage" 2>&1 | head -40

echo -e "\n${YELLOW}Waiting 2 seconds...${NC}\n"
sleep 2

echo -e "${BLUE}[Test 3] Request with limits${NC}"
curl -i "${BASE_URL}/api/homepage?categories_limit=5&products_limit=10" 2>&1 | head -40

echo -e "\n${YELLOW}Waiting 2 seconds...${NC}\n"
sleep 2

echo -e "${BLUE}[Test 4] Check response size and structure${NC}"
RESPONSE=$(curl -s "${BASE_URL}/api/homepage")
echo "Response size: $(echo $RESPONSE | wc -c) bytes"
echo "Response includes:"
echo $RESPONSE | jq 'keys' 2>/dev/null || echo "Could not parse JSON"

echo -e "\n${GREEN}✓ Tests Complete${NC}\n"
