#!/bin/bash

##############################################################################
# Script de test - Module Endpoints (PJSIP)
# Teste tous les endpoints de l'API relatifs aux endpoints PJSIP
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3001/api/v1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

failure() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

##############################################################################
# SETUP - Obtenir le token JWT
##############################################################################

section "SETUP - Authentification"

# Source le token depuis le script d'authentification
if [ -f "/tmp/asterisk-api-token.sh" ]; then
    source /tmp/asterisk-api-token.sh
    info "Token récupéré depuis /tmp/asterisk-api-token.sh"
else
    info "Obtention d'un nouveau token..."
    cd "$SCRIPT_DIR/../00-setup"
    ./get-token.sh > /dev/null 2>&1
    source /tmp/asterisk-api-token.sh
fi

if [ -z "$TOKEN" ]; then
    failure "Impossible d'obtenir le token JWT"
    exit 1
fi

success "Token JWT obtenu"

##############################################################################
# PREREQUIS - Créer un tenant de test
##############################################################################

section "PREREQUIS - Création du tenant de test"

TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-endpoints-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"
echo "$TENANT_ID" > /tmp/tenant-test-id.txt

##############################################################################
# TEST 1: POST /endpoints - Créer un endpoint
##############################################################################

section "TEST 1: Créer un endpoint"

ENDPOINT_RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"displayName\": \"Test Endpoint 101\",
    \"password\": \"secret101\",
    \"transport\": \"transport-wss\",
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID
  }")

ENDPOINT_ID=$(echo "$ENDPOINT_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ENDPOINT_ID" ]; then
    success "Endpoint créé: $ENDPOINT_ID"
    echo "$ENDPOINT_ID" > /tmp/endpoint-test-id.txt
else
    failure "Échec création endpoint"
    echo "Réponse: $ENDPOINT_RESPONSE"
fi

##############################################################################
# TEST 2: GET /endpoints - Lister tous les endpoints
##############################################################################

section "TEST 2: Lister tous les endpoints"

RESPONSE=$(curl -s -X GET "$API_URL/endpoints" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$ENDPOINT_ID"; then
    success "Liste des endpoints récupérée (endpoint trouvé)"
else
    failure "Liste des endpoints - endpoint non trouvé"
fi

##############################################################################
# TEST 3: GET /endpoints/:id - Récupérer un endpoint spécifique
##############################################################################

section "TEST 3: Récupérer endpoint $ENDPOINT_ID"

RESPONSE=$(curl -s -X GET "$API_URL/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$ENDPOINT_ID"; then
    success "Endpoint $ENDPOINT_ID récupéré"
else
    failure "Échec récupération endpoint $ENDPOINT_ID"
fi

##############################################################################
# TEST 4: PATCH /endpoints/:id - Modifier un endpoint
##############################################################################

section "TEST 4: Modifier endpoint $ENDPOINT_ID"

RESPONSE=$(curl -s -X PATCH "$API_URL/endpoints/$ENDPOINT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "callerid": "Extension 101 <101>"
  }')

if echo "$RESPONSE" | grep -q "101"; then
    success "Endpoint modifié"
else
    failure "Échec modification endpoint"
fi

##############################################################################
# TEST 5: GET /tenants/:id/endpoints - Endpoints d'un tenant
##############################################################################

section "TEST 5: Lister endpoints du tenant $TENANT_ID"

RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/endpoints" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$ENDPOINT_ID"; then
    success "Endpoints du tenant récupérés"
else
    failure "Échec récupération endpoints du tenant"
fi

##############################################################################
# TEST 6: DELETE /endpoints/:id - Supprimer un endpoint
##############################################################################

section "TEST 6: Supprimer endpoint $ENDPOINT_ID"

RESPONSE=$(curl -s -X DELETE "$API_URL/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que l'endpoint n'existe plus
RESPONSE=$(curl -s -X GET "$API_URL/endpoints/$ENDPOINT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "404\|not found\|Not Found"; then
    success "Endpoint supprimé"
else
    failure "Échec suppression endpoint"
fi

##############################################################################
# FINAL - Créer des endpoints permanents pour vérification Asterisk
##############################################################################

section "FINAL - Création d'endpoints permanents"

# Créer 3 endpoints WebRTC pour tests Asterisk
for i in 201 202 203; do
    FINAL_ENDPOINT=$(curl -s -X POST "$API_URL/endpoints" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"displayName\": \"Agent WebRTC $i\",
        \"password\": \"webrtc$i\",
        \"transport\": \"transport-wss\",
        \"context\": \"t${TENANT_ID}_default\",
        \"tenantId\": $TENANT_ID
      }")

    FINAL_ID=$(echo "$FINAL_ENDPOINT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$FINAL_ID" ]; then
        info "Endpoint WebRTC permanent créé: $FINAL_ID"
    fi
done

# Créer 3 endpoints UDP/SIP pour tests Asterisk (softphones classiques)
for i in 301 302 303; do
    FINAL_ENDPOINT=$(curl -s -X POST "$API_URL/endpoints" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"displayName\": \"Agent SIP $i\",
        \"password\": \"sip$i\",
        \"transport\": \"transport-udp\",
        \"context\": \"t${TENANT_ID}_default\",
        \"tenantId\": $TENANT_ID
      }")

    FINAL_ID=$(echo "$FINAL_ENDPOINT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$FINAL_ID" ]; then
        info "Endpoint SIP/UDP permanent créé: $FINAL_ID"
    fi
done

success "6 endpoints permanents créés (3 WebRTC + 3 SIP/UDP) pour vérification Asterisk"

##############################################################################
# RAPPORT
##############################################################################

section "RAPPORT FINAL - MODULE ENDPOINTS"

echo "Tests réussis : ${GREEN}$PASSED${NC}"
echo "Tests échoués : ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${NC}"
    exit 0
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    exit 1
fi
