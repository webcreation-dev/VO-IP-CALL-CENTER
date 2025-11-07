#!/bin/bash

##############################################################################
# Script de test du module CONTEXTS
# Teste TOUS les endpoints du controller TenantContextsController
##############################################################################

API_URL="${API_URL:-http://localhost:3001/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

success() {
    echo -e "${GREEN}✅ SUCCESS${NC} - $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

failure() {
    echo -e "${RED}❌ FAILURE${NC} - $1 - $2"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"

    info "Test: $test_name"

    if [ -n "$data" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -d "$data")
    else
        RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" \
          -H "Authorization: Bearer $TOKEN")
    fi

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq "$expected_status" ] || [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 204 ]; then
        success "$test_name (HTTP $HTTP_CODE)"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        echo "$BODY"
        return 0
    else
        failure "$test_name" "HTTP $HTTP_CODE (attendu: $expected_status)"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        echo ""
        return 1
    fi
}

section "MODULE CONTEXTS - TESTS AUTOMATISÉS"

info "Obtention du token JWT..."
source "$SCRIPT_DIR/../00-setup/get-token.sh" > /dev/null 2>&1
source /tmp/asterisk-api-token.sh

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Échec de l'authentification${NC}"
    exit 1
fi

success "Authentification réussie"
echo ""

# Créer un tenant pour les tests
section "PRÉPARATION: Créer un tenant de test"
TENANT_DATA='{"name":"Context Test Tenant '$(date +%s)'","domain":"context-test.local","timezone":"Europe/Paris","language":"fr","maxAgents":10,"maxQueues":5,"isActive":true}'
RESPONSE=$(test_endpoint "POST /tenants" "POST" "/tenants" "$TENANT_DATA" "201")
TENANT_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$TENANT_ID" ]; then
    failure "Création tenant" "Impossible d'extraire l'ID"
    exit 1
fi

info "Tenant créé: ID=$TENANT_ID"
echo ""

# TEST 1: GET /contexts
section "TEST 1: GET /contexts"
test_endpoint "GET /contexts" "GET" "/contexts" "" "200"
echo ""

# TEST 2: GET /tenants/:tenantId/contexts
section "TEST 2: GET /tenants/$TENANT_ID/contexts"
test_endpoint "GET /tenants/:tenantId/contexts" "GET" "/tenants/$TENANT_ID/contexts" "" "200"
echo ""

# TEST 3: POST /contexts - Créer un contexte
section "TEST 3: POST /contexts - Créer un contexte"
CONTEXT_DATA='{"tenantId":'$TENANT_ID',"name":"ivr","description":"IVR Context","dialplanConfig":{"allowInbound":true,"allowOutbound":true,"allowInternal":true,"allowInterContext":false}}'
RESPONSE=$(test_endpoint "POST /contexts" "POST" "/contexts" "$CONTEXT_DATA" "201")
CONTEXT_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$CONTEXT_ID" ]; then
    failure "POST /contexts" "Impossible d'extraire l'ID du contexte"
    exit 1
fi

info "Contexte créé: ID=$CONTEXT_ID"
echo ""

# TEST 4: GET /contexts/:id
section "TEST 4: GET /contexts/$CONTEXT_ID"
test_endpoint "GET /contexts/:id" "GET" "/contexts/$CONTEXT_ID" "" "200"
echo ""

# TEST 5: PATCH /contexts/:id
section "TEST 5: PATCH /contexts/$CONTEXT_ID - Mettre à jour"
UPDATE_DATA='{"description":"IVR Context (Updated)","dialplanConfig":{"allowInbound":true,"allowOutbound":false,"allowInternal":true,"allowInterContext":true}}'
test_endpoint "PATCH /contexts/:id" "PATCH" "/contexts/$CONTEXT_ID" "$UPDATE_DATA" "200"
echo ""

# TEST 6: DELETE /contexts/:id
section "TEST 6: DELETE /contexts/$CONTEXT_ID"
test_endpoint "DELETE /contexts/:id" "DELETE" "/contexts/$CONTEXT_ID" "" "204"
echo ""

# Nettoyage: Supprimer le tenant
section "NETTOYAGE: Supprimer le tenant de test"
test_endpoint "DELETE /tenants/$TENANT_ID" "DELETE" "/tenants/$TENANT_ID" "" "200"
echo ""

section "RAPPORT FINAL - MODULE CONTEXTS"

echo "Total de tests      : $TOTAL_TESTS"
echo -e "Tests réussis       : ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests échoués       : ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${NC}"
    exit 0
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    exit 1
fi
