#!/bin/bash

# =====================================================
# Test Script: Soft Delete Synchronization with Asterisk
# =====================================================
# Purpose: Verify that soft-deleted records are automatically
#          removed from Asterisk configuration via database views
#
# Prerequisites:
#   1. Migration AddSoftDeleteColumns has been run
#   2. SQL views have been created (create-asterisk-views.sql)
#   3. extconfig.conf has been updated to use *_active views
#   4. Asterisk has been reloaded
#
# Usage:
#   ./scripts/test-soft-delete-sync.sh
# =====================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001/api/v1"
ASTERISK_CONTAINER="asterisk"  # Adjust if needed
TEST_TENANT_ID=1
TEST_ENDPOINT_USERNAME="test_soft_delete_$(date +%s)"
TEST_ENDPOINT_PASSWORD="TestPass123!"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 Soft Delete Synchronization Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =====================================================
# Step 1: Get authentication token
# =====================================================
echo -e "${YELLOW}Step 1: Authenticating with API...${NC}"

TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@asterisk.local",
    "password": "admin123"
  }' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Failed to authenticate${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated successfully${NC}"
echo ""

# =====================================================
# Step 2: Create a test endpoint via API
# =====================================================
echo -e "${YELLOW}Step 2: Creating test endpoint '$TEST_ENDPOINT_USERNAME'...${NC}"

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"username\": \"$TEST_ENDPOINT_USERNAME\",
    \"password\": \"$TEST_ENDPOINT_PASSWORD\",
    \"context\": \"default\",
    \"transport\": \"transport-wss\",
    \"tenantId\": $TEST_TENANT_ID
  }")

ENDPOINT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // .endpoint.id')

if [ -z "$ENDPOINT_ID" ] || [ "$ENDPOINT_ID" == "null" ]; then
  echo -e "${RED}❌ Failed to create endpoint${NC}"
  echo "$CREATE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Endpoint created: $ENDPOINT_ID${NC}"
echo ""

# Wait for Asterisk to pick up the change
sleep 2

# =====================================================
# Step 3: Verify endpoint appears in Asterisk
# =====================================================
echo -e "${YELLOW}Step 3: Verifying endpoint appears in Asterisk...${NC}"

ASTERISK_OUTPUT=$(docker exec "$ASTERISK_CONTAINER" asterisk -rx "pjsip show endpoints" | grep "$ENDPOINT_ID" || echo "")

if [ -z "$ASTERISK_OUTPUT" ]; then
  echo -e "${RED}❌ Endpoint NOT found in Asterisk (expected to be present)${NC}"
  echo "Full Asterisk output:"
  docker exec "$ASTERISK_CONTAINER" asterisk -rx "pjsip show endpoints"
  exit 1
fi

echo -e "${GREEN}✅ Endpoint IS visible in Asterisk${NC}"
echo "   $ASTERISK_OUTPUT"
echo ""

# =====================================================
# Step 4: Check database - endpoint should have NULL deleted_at
# =====================================================
echo -e "${YELLOW}Step 4: Verifying endpoint is active in database...${NC}"

DB_CHECK=$(docker exec postgres-container psql -U asterisk_user -d asterisk_db -t -c \
  "SELECT deleted_at IS NULL as is_active FROM ps_endpoints WHERE id = '$ENDPOINT_ID';" || echo "ERROR")

if [[ "$DB_CHECK" =~ "t" ]]; then
  echo -e "${GREEN}✅ Endpoint is active in database (deleted_at = NULL)${NC}"
else
  echo -e "${RED}❌ Unexpected database state${NC}"
  echo "$DB_CHECK"
  exit 1
fi
echo ""

# =====================================================
# Step 5: Soft delete the endpoint via API
# =====================================================
echo -e "${YELLOW}Step 5: Soft deleting endpoint via API...${NC}"

DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Endpoint soft deleted${NC}"
echo ""

# Wait for Asterisk to reload (if auto-reload is configured)
# Or manually reload PJSIP
echo -e "${YELLOW}Reloading Asterisk PJSIP...${NC}"
docker exec "$ASTERISK_CONTAINER" asterisk -rx "pjsip reload" > /dev/null
sleep 2

# =====================================================
# Step 6: Verify endpoint is GONE from Asterisk
# =====================================================
echo -e "${YELLOW}Step 6: Verifying endpoint is REMOVED from Asterisk...${NC}"

ASTERISK_OUTPUT_AFTER=$(docker exec "$ASTERISK_CONTAINER" asterisk -rx "pjsip show endpoints" | grep "$ENDPOINT_ID" || echo "")

if [ -n "$ASTERISK_OUTPUT_AFTER" ]; then
  echo -e "${RED}❌ Endpoint STILL visible in Asterisk (should be hidden)${NC}"
  echo "   $ASTERISK_OUTPUT_AFTER"
  exit 1
fi

echo -e "${GREEN}✅ Endpoint is NO LONGER visible in Asterisk${NC}"
echo ""

# =====================================================
# Step 7: Check database - endpoint should still exist with deleted_at set
# =====================================================
echo -e "${YELLOW}Step 7: Verifying endpoint still exists in database (soft deleted)...${NC}"

DB_CHECK_DELETED=$(docker exec postgres-container psql -U asterisk_user -d asterisk_db -t -c \
  "SELECT id, deleted_at IS NOT NULL as is_deleted, deleted_at FROM ps_endpoints WHERE id = '$ENDPOINT_ID';" || echo "ERROR")

if [[ "$DB_CHECK_DELETED" =~ "t" ]]; then
  echo -e "${GREEN}✅ Endpoint exists in database with deleted_at timestamp${NC}"
  echo "   $DB_CHECK_DELETED"
else
  echo -e "${RED}❌ Endpoint not found or not properly soft deleted${NC}"
  echo "$DB_CHECK_DELETED"
  exit 1
fi
echo ""

# =====================================================
# Step 8: Verify ps_endpoints_active view does NOT show the endpoint
# =====================================================
echo -e "${YELLOW}Step 8: Verifying endpoint is NOT in ps_endpoints_active view...${NC}"

VIEW_CHECK=$(docker exec postgres-container psql -U asterisk_user -d asterisk_db -t -c \
  "SELECT COUNT(*) FROM ps_endpoints_active WHERE id = '$ENDPOINT_ID';" || echo "ERROR")

if [[ "$VIEW_CHECK" =~ "0" ]]; then
  echo -e "${GREEN}✅ Endpoint is NOT in ps_endpoints_active view (correct!)${NC}"
else
  echo -e "${RED}❌ Endpoint still appears in ps_endpoints_active view${NC}"
  echo "$VIEW_CHECK"
  exit 1
fi
echo ""

# =====================================================
# Step 9: Verify base table still has the record
# =====================================================
echo -e "${YELLOW}Step 9: Verifying endpoint is still in base ps_endpoints table...${NC}"

BASE_TABLE_CHECK=$(docker exec postgres-container psql -U asterisk_user -d asterisk_db -t -c \
  "SELECT COUNT(*) FROM ps_endpoints WHERE id = '$ENDPOINT_ID';" || echo "ERROR")

if [[ "$BASE_TABLE_CHECK" =~ "1" ]]; then
  echo -e "${GREEN}✅ Endpoint is still in base ps_endpoints table (for historical data)${NC}"
else
  echo -e "${RED}❌ Endpoint missing from base table${NC}"
  echo "$BASE_TABLE_CHECK"
  exit 1
fi
echo ""

# =====================================================
# Optional: Cleanup (permanently delete test endpoint)
# =====================================================
echo -e "${YELLOW}Cleanup: Permanently deleting test endpoint from database...${NC}"

docker exec postgres-container psql -U asterisk_user -d asterisk_db -c \
  "DELETE FROM ps_auths WHERE id = '$ENDPOINT_ID';"

docker exec postgres-container psql -U asterisk_user -d asterisk_db -c \
  "DELETE FROM ps_aors WHERE id = '$ENDPOINT_ID';"

docker exec postgres-container psql -U asterisk_user -d asterisk_db -c \
  "DELETE FROM ps_endpoints WHERE id = '$ENDPOINT_ID';"

echo -e "${GREEN}✅ Test endpoint cleaned up${NC}"
echo ""

# =====================================================
# Final Summary
# =====================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Summary:${NC}"
echo -e "  1. ✅ Created endpoint via API"
echo -e "  2. ✅ Endpoint appeared in Asterisk"
echo -e "  3. ✅ Endpoint was active in database (deleted_at = NULL)"
echo -e "  4. ✅ Soft deleted endpoint via API"
echo -e "  5. ✅ Endpoint disappeared from Asterisk"
echo -e "  6. ✅ Endpoint still in database with deleted_at timestamp"
echo -e "  7. ✅ Endpoint filtered out of ps_endpoints_active view"
echo -e "  8. ✅ Base table retains historical data"
echo ""
echo -e "${GREEN}🎉 Soft delete synchronization is working correctly!${NC}"
echo -e "${GREEN}   Asterisk no longer sees deleted records thanks to database views.${NC}"
echo ""
