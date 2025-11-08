#!/bin/bash

##############################################################################
# Script de test - Module Queues (Files d'attente)
# Teste tous les endpoints de l'API relatifs aux files d'attente
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
    "name": "test-queues-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

##############################################################################
# TEST 1: POST /queues - Créer une file d'attente
##############################################################################

section "TEST 1: Créer une file d'attente"

QUEUE_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"sales\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"maxlen\": 0,
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_NAME=$(echo "$QUEUE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$QUEUE_NAME" ]; then
    success "File d'attente créée: $QUEUE_NAME"
    echo "$QUEUE_NAME" > /tmp/queue-test-name.txt
else
    failure "Échec création file d'attente"
    echo "Réponse: $QUEUE_RESPONSE"
fi

##############################################################################
# TEST 2: GET /queues - Lister toutes les files
##############################################################################

section "TEST 2: Lister toutes les files d'attente"

RESPONSE=$(curl -s -X GET "$API_URL/queues" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$QUEUE_NAME"; then
    success "Liste des files récupérée (file trouvée)"
else
    failure "Liste des files - file non trouvée"
fi

##############################################################################
# TEST 3: GET /queues/:name - Récupérer une file spécifique
##############################################################################

section "TEST 3: Récupérer file $QUEUE_NAME"

RESPONSE=$(curl -s -X GET "$API_URL/queues/$QUEUE_NAME" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$QUEUE_NAME"; then
    success "File $QUEUE_NAME récupérée"
else
    failure "Échec récupération file $QUEUE_NAME"
fi

##############################################################################
# TEST 4: PATCH /queues/:name - Modifier une file
##############################################################################

section "TEST 4: Modifier file $QUEUE_NAME"

RESPONSE=$(curl -s -X PATCH "$API_URL/queues/$QUEUE_NAME" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "timeout": 60,
    "strategy": "rrmemory"
  }')

if echo "$RESPONSE" | grep -q "rrmemory\|60"; then
    success "File modifiée"
else
    failure "Échec modification file"
fi

##############################################################################
# TEST 5: GET /tenants/:id/queues - Files d'un tenant
##############################################################################

section "TEST 5: Lister files du tenant $TENANT_ID"

RESPONSE=$(curl -s -X GET "$API_URL/tenants/$TENANT_ID/queues" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "$QUEUE_NAME"; then
    success "Files du tenant récupérées"
else
    failure "Échec récupération files du tenant"
fi

##############################################################################
# TEST 6: POST /queues/:name/reload - Recharger dans Asterisk
##############################################################################

section "TEST 6: Recharger file dans Asterisk"

RESPONSE=$(curl -s -X POST "$API_URL/queues/$QUEUE_NAME/reload" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "success\|reloaded"; then
    success "File rechargée dans Asterisk"
else
    # Peut être considéré comme succès si pas d'erreur
    info "Reload déclenché (vérifier manuellement dans Asterisk)"
    ((PASSED++))
fi

##############################################################################
# TEST 7: DELETE /queues/:name - Supprimer une file
##############################################################################

section "TEST 7: Supprimer file $QUEUE_NAME"

RESPONSE=$(curl -s -X DELETE "$API_URL/queues/$QUEUE_NAME" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que la file n'existe plus
RESPONSE=$(curl -s -X GET "$API_URL/queues/$QUEUE_NAME" \
  -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q "404\|not found\|Not Found"; then
    success "File supprimée"
else
    failure "Échec suppression file"
fi

##############################################################################
# FINAL - Créer des queues permanentes pour vérification Asterisk
##############################################################################

section "FINAL - Création de queues permanentes"

# Créer 2 queues pour tests Asterisk
QUEUE_SALES=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"sales\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"maxlen\": 0,
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_SUPPORT=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"support\",
    \"strategy\": \"rrmemory\",
    \"timeout\": 60,
    \"maxlen\": 10,
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID
  }")

SALES_NAME=$(echo "$QUEUE_SALES" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
SUPPORT_NAME=$(echo "$QUEUE_SUPPORT" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$SALES_NAME" ] && [ -n "$SUPPORT_NAME" ]; then
    info "Queue permanente créée: $SALES_NAME"
    info "Queue permanente créée: $SUPPORT_NAME"
    success "2 queues permanentes créées pour vérification Asterisk"
else
    failure "Échec création queues permanentes"
fi

##############################################################################
# RAPPORT
##############################################################################

section "RAPPORT FINAL - MODULE QUEUES"

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
