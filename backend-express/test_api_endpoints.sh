#!/bin/bash

# API Testing Script for LAM-TEK 2025 Backend
# Tests all newly created endpoints

BASE_URL="http://localhost:8000/api/v1"
UPPS_TOKEN=""
SEKRETARIAT_TOKEN=""
KEA_TOKEN=""
ASESOR_TOKEN=""

echo "╔════════════════════════════════════════════════════════╗"
echo "║  LAM-TEK 2025 Backend API Testing                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local data=$4
    local description=$5
    
    echo -e "${BLUE}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"
    
    if [ -z "$token" ]; then
        echo -e "${RED}  ❌ No token provided${NC}"
        echo ""
        return
    fi
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${token}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}  ✓ Success (${http_code})${NC}"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}  ✗ Failed (${http_code})${NC}"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# ============================================
# 1. LOGIN TO GET TOKENS
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. AUTHENTICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Login as UPPS
echo -e "${BLUE}Logging in as UPPS...${NC}"
response=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"upps_tip","password":"password123"}')
UPPS_TOKEN=$(echo $response | jq -r '.token' 2>/dev/null)
echo "UPPS Token: ${UPPS_TOKEN:0:50}..."
echo ""

# Login as Sekretariat
echo -e "${BLUE}Logging in as Sekretariat...${NC}"
response=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"sekretariat","password":"password123"}')
SEKRETARIAT_TOKEN=$(echo $response | jq -r '.token' 2>/dev/null)
echo "Sekretariat Token: ${SEKRETARIAT_TOKEN:0:50}..."
echo ""

# ============================================
# 2. TEST ASSESSORS API
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. ASSESSORS API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/assessors" "$UPPS_TOKEN" "" "Get all assessors"
test_endpoint "GET" "/assessors/asesor_001" "$UPPS_TOKEN" "" "Get assessor by ID"

# ============================================
# 3. TEST NOTIFICATIONS API
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. NOTIFICATIONS API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/notifications" "$UPPS_TOKEN" "" "Get user notifications"
test_endpoint "PUT" "/notifications/notif_001/read" "$UPPS_TOKEN" "" "Mark notification as read"
test_endpoint "PUT" "/notifications/read-all" "$UPPS_TOKEN" "" "Mark all as read"

# ============================================
# 4. TEST SEKRETARIAT API
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. SEKRETARIAT API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/sekretariat/submissions" "$SEKRETARIAT_TOKEN" "" "Get submissions for verification"
test_endpoint "GET" "/sekretariat/upps" "$SEKRETARIAT_TOKEN" "" "Get all UPPS"
test_endpoint "GET" "/sekretariat/payments" "$SEKRETARIAT_TOKEN" "" "Get all payments"
test_endpoint "GET" "/sekretariat/reports?range=month" "$SEKRETARIAT_TOKEN" "" "Get monthly reports"

# Test verify submission
verify_data='{"decision":"approve","notes":"Dokumen lengkap dan sesuai"}'
test_endpoint "POST" "/sekretariat/verify/SUB_001" "$SEKRETARIAT_TOKEN" "$verify_data" "Verify submission"

# ============================================
# 5. TEST KEA API
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. KEA API (Requires KEA Token)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: These will fail without KEA token, just for demonstration
test_endpoint "GET" "/kea/submissions-approved" "$KEA_TOKEN" "" "Get approved submissions"
test_endpoint "GET" "/kea/assessors" "$KEA_TOKEN" "" "Get available assessors"
test_endpoint "GET" "/kea/monitoring" "$KEA_TOKEN" "" "Get monitoring data"

# ============================================
# 6. TEST ASESOR API
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ASESOR API (Requires Asesor Token)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint "GET" "/asesor/assignments" "$ASESOR_TOKEN" "" "Get asesor assignments"
test_endpoint "GET" "/asesor/history" "$ASESOR_TOKEN" "" "Get assessment history"

# ============================================
# SUMMARY
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TESTING COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Note: Some endpoints require specific role tokens (KEA, Asesor)"
echo "Create those users first to test all endpoints"
echo ""
