#!/bin/bash

##############################################################################
# Script de test du module TENANTS
# Teste TOUS les endpoints du controller TenantController
##############################################################################

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✅ SUCCESS${NC} - $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

# Fonction pour afficher un message d'échec
failure() {
    echo -e "${RED}❌ FAILURE${NC} - $1"
    echo -e "${RED}   Détails: $2${NC}"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

# Fonction pour afficher un message d'information
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher un titre de section
section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

# Fonction pour tester un endpoint
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

    if [ "$HTTP_CODE" -eq "$expected_status" ] || [ "$HTTP_CODE" -eq 201 ]; then
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

##############################################################################
# DÉBUT DES TESTS
##############################################################################

section "MODULE TENANTS - TESTS AUTOMATISÉS"

# 1. Authentification
info "Obtention du token JWT..."
source "$SCRIPT_DIR/../00-setup/get-token.sh" > /dev/null 2>&1

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Échec de l'authentification${NC}"
    exit 1
fi

source /tmp/asterisk-api-token.sh
success "Authentification réussie"
echo ""

##############################################################################
# TEST 1: GET /tenants - Liste tous les tenants
##############################################################################

section "TEST 1: GET /tenants - Liste tous les tenants"
RESPONSE=$(test_endpoint \
    "GET /tenants" \
    "GET" \
    "/tenants" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 2: GET /tenants/me - Obtenir le tenant de l'utilisateur courant
##############################################################################

section "TEST 2: GET /tenants/me - Tenant de l'utilisateur courant"
RESPONSE=$(test_endpoint \
    "GET /tenants/me" \
    "GET" \
    "/tenants/me" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 3: POST /tenants - Créer un nouveau tenant
##############################################################################

section "TEST 3: POST /tenants - Créer un nouveau tenant"

TENANT_NAME="Test Tenant $(date +%s)"
TENANT_DATA='{
  "name": "'"$TENANT_NAME"'",
  "domain": "test-tenant-'"$(date +%s)"'.local",
  "timezone": "Europe/Paris",
  "language": "fr",
  "maxAgents": 10,
  "maxQueues": 5,
  "isActive": true
}'

RESPONSE=$(test_endpoint \
    "POST /tenants" \
    "POST" \
    "/tenants" \
    "$TENANT_DATA" \
    "201")

# Extraire l'ID du tenant créé
TENANT_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$TENANT_ID" ]; then
    failure "POST /tenants" "Impossible d'extraire l'ID du tenant créé"
    echo ""
    exit 1
fi

info "Tenant créé avec l'ID: $TENANT_ID"
echo ""

##############################################################################
# TEST 4: GET /tenants/:id - Obtenir un tenant par ID
##############################################################################

section "TEST 4: GET /tenants/:id - Obtenir un tenant par ID"
RESPONSE=$(test_endpoint \
    "GET /tenants/$TENANT_ID" \
    "GET" \
    "/tenants/$TENANT_ID" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 5: PATCH /tenants/:id - Mettre à jour un tenant
##############################################################################

section "TEST 5: PATCH /tenants/:id - Mettre à jour un tenant"

UPDATE_DATA='{
  "name": "'"$TENANT_NAME"' (Updated)",
  "maxAgents": 20,
  "maxQueues": 10
}'

RESPONSE=$(test_endpoint \
    "PATCH /tenants/$TENANT_ID" \
    "PATCH" \
    "/tenants/$TENANT_ID" \
    "$UPDATE_DATA" \
    "200")
echo ""

##############################################################################
# TEST 6: GET /tenants/:id/endpoints - Obtenir les endpoints du tenant
##############################################################################

section "TEST 6: GET /tenants/:id/endpoints - Endpoints du tenant"
RESPONSE=$(test_endpoint \
    "GET /tenants/$TENANT_ID/endpoints" \
    "GET" \
    "/tenants/$TENANT_ID/endpoints" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 7: GET /tenants/:id/queues - Obtenir les queues du tenant
##############################################################################

section "TEST 7: GET /tenants/:id/queues - Queues du tenant"
RESPONSE=$(test_endpoint \
    "GET /tenants/$TENANT_ID/queues" \
    "GET" \
    "/tenants/$TENANT_ID/queues" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 8: DELETE /tenants/:id - Suppression logique (soft delete)
##############################################################################

section "TEST 8: DELETE /tenants/:id - Soft delete du tenant"
RESPONSE=$(test_endpoint \
    "DELETE /tenants/$TENANT_ID" \
    "DELETE" \
    "/tenants/$TENANT_ID" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 9: PATCH /tenants/:id/restore - Restaurer un tenant supprimé
##############################################################################

section "TEST 9: PATCH /tenants/:id/restore - Restaurer le tenant"
RESPONSE=$(test_endpoint \
    "PATCH /tenants/$TENANT_ID/restore" \
    "PATCH" \
    "/tenants/$TENANT_ID/restore" \
    "" \
    "200")
echo ""

##############################################################################
# TEST 10: Suppression définitive du tenant de test
##############################################################################

section "TEST 10: Nettoyage - Suppression finale du tenant de test"
RESPONSE=$(test_endpoint \
    "DELETE /tenants/$TENANT_ID (cleanup)" \
    "DELETE" \
    "/tenants/$TENANT_ID" \
    "" \
    "200")
echo ""

##############################################################################
# RAPPORT FINAL
##############################################################################

section "RAPPORT FINAL - MODULE TENANTS"

echo "Total de tests      : $TOTAL_TESTS"
echo -e "Tests réussis       : ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests échoués       : ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS SONT PASSÉS !${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    echo ""
    exit 1
fi
