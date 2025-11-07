#!/bin/bash

# ============================================
# LAM-TEK 2025 Backend API Test Script
# Tests all endpoints with cURL
# ============================================

BASE_URL="http://localhost:8000"
API_URL="${BASE_URL}/api/v1"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   LAM-TEK 2025 Backend API Test Suite                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  local expected_code="${5:-200}"
  
  echo -n "Testing: $name ... "
  
  if [ "$method" == "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url")
  elif [ "$method" == "POST" ]; then
    if [ -n "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url")
    else
      response=$(curl -s -w "\n%{http_code}" -X POST "$url")
    fi
  elif [ "$method" == "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$data" "$url")
  elif [ "$method" == "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$url")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "$expected_code" ] || [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code, expected $expected_code)"
    echo "Response: $body" | head -c 200
    echo ""
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# ============================================
# Start Tests
# ============================================

echo "1. HEALTH & INFO ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Health Check" "GET" "${BASE_URL}/health"
test_endpoint "API Info" "GET" "${API_URL}"
echo ""

echo "2. SCORING INFO ENDPOINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Get Scoring Info (All)" "GET" "${API_URL}/scoring"
test_endpoint "Get Scoring Info (S)" "GET" "${API_URL}/scoring?programType=S"
test_endpoint "Get Scoring Info (M)" "GET" "${API_URL}/scoring?programType=M"
echo ""

echo "3. SUBMISSION ENDPOINTS (Empty Database)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Get All Submissions" "GET" "${API_URL}/submissions"
test_endpoint "Get Submissions with Filters" "GET" "${API_URL}/submissions?programStudi=Informatika&limit=5"
test_endpoint "Get Submission Stats" "GET" "${API_URL}/submissions/stats"
echo ""

echo "4. CUSTOM SCORING (No Upload Required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
custom_data='{
  "lkpsData": {
    "bop_value": 45000000,
    "dpd_total": 250000000,
    "ndtps": 29,
    "rmd": 20,
    "ripk": 3.51,
    "pds3": 100.0,
    "pgblkl": 82.76,
    "ptw": 75.0,
    "wt": 3,
    "kbk": 75.0
  },
  "programType": "S"
}'
test_endpoint "Calculate Custom Scores" "POST" "${API_URL}/scoring/custom" "$custom_data"
echo ""

echo "5. ERROR HANDLING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "404 Not Found" "GET" "${API_URL}/nonexistent" "" "404"
test_endpoint "Invalid UUID Format" "GET" "${API_URL}/submissions/invalid-uuid" "" "400"
test_endpoint "Missing Required Fields" "POST" "${API_URL}/scoring/calculate" '{"programType":"S"}' "400"
echo ""

echo "6. UPLOAD ENDPOINT (File Upload Test)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠ Note: File upload requires actual LED/LKPS files${NC}"
echo -e "${YELLOW}⚠ Skipping automated upload test (requires files)${NC}"
echo ""
echo "To test upload manually, run:"
echo "curl -X POST ${API_URL}/upload \\"
echo "  -F \"programStudi=Teknik Informatika\" \\"
echo "  -F \"institusi=Universitas ABC\" \\"
echo "  -F \"programType=S\" \\"
echo "  -F \"led_file=@/path/to/led.pdf\" \\"
echo "  -F \"lkps_file=@/path/to/lkps.xlsx\""
echo ""

# ============================================
# Summary
# ============================================

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Test Summary                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed.${NC}"
  exit 1
fi
