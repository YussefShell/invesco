#!/bin/bash

# Test Database API Endpoints
# This script tests the database API endpoints

echo "========================================"
echo "Database API Endpoints Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${YELLOW}Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test 1: Health check
echo -e "${YELLOW}Test 1: Health Check Endpoint${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
    echo -e "${GREEN}✓ Health endpoint working${NC}"
    echo "  Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health endpoint failed${NC}"
    exit 1
fi
echo ""

# Test 2: Database initialization endpoint
echo -e "${YELLOW}Test 2: Database Initialization Endpoint${NC}"
INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/db/init)
if echo "$INIT_RESPONSE" | grep -q "success\|message"; then
    echo -e "${GREEN}✓ Init endpoint working${NC}"
    echo "  Response: $INIT_RESPONSE"
else
    echo -e "${RED}✗ Init endpoint failed${NC}"
    exit 1
fi
echo ""

# Test 3: Database cleanup endpoint
echo -e "${YELLOW}Test 3: Database Cleanup Endpoint${NC}"
CLEANUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/db/cleanup)
if echo "$CLEANUP_RESPONSE" | grep -q "success\|message"; then
    echo -e "${GREEN}✓ Cleanup endpoint working${NC}"
    echo "  Response: $CLEANUP_RESPONSE"
else
    echo -e "${RED}✗ Cleanup endpoint failed${NC}"
    exit 1
fi
echo ""

echo "========================================"
echo -e "${GREEN}All Endpoint Tests Passed! ✓${NC}"
echo "========================================"

