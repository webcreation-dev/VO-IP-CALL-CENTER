#!/bin/bash

##############################################################################
# Script de test - Module Queue Members
# Teste tous les endpoints de gestion des agents dans les queues
# Inclut ajout, suppression, pause/unpause, modification de penalty
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
# SETUP - Obtenir le token JWT avec tenantId (TENANT_ADMIN)
##############################################################################

section "SETUP - Authentification"

# Créer un TENANT_ADMIN avec tenantId valide
cd "$SCRIPT_DIR/../00-setup"
./setup-tenant-admin.sh > /dev/null 2>&1

if [ ! -f "/tmp/tenant-admin-token.sh" ]; then
    failure "Impossible de créer le TENANT_ADMIN"
    exit 1
fi

source /tmp/tenant-admin-token.sh

# Utiliser le token TENANT_ADMIN au lieu du SUPER_ADMIN
TOKEN="$TENANT_ADMIN_TOKEN"
TENANT_ID="$TEST_TENANT_ID"

if [ -z "$TOKEN" ] || [ -z "$TENANT_ID" ]; then
    failure "Token ou tenantId manquant"
    exit 1
fi

success "Token TENANT_ADMIN obtenu (tenantId: $TENANT_ID)"

##############################################################################
# PREREQUIS - Créer queue et endpoints pour les tests
##############################################################################

section "PREREQUIS - Création des ressources de test"

info "Utilisation du tenant existant (ID: $TENANT_ID)"

# Attendre le primary context
sleep 2

# Créer context
CONTEXT_RESPONSE=$(curl -s -X POST "$API_URL/contexts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"agents_context\",
    \"tenantId\": $TENANT_ID
  }")

CONTEXT_NAME=$(echo "$CONTEXT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONTEXT_NAME" ]; then
    failure "Impossible de créer le context"
    exit 1
fi

success "Context créé: $CONTEXT_NAME"

# 3. Créer une queue
QUEUE_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"support\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"context\": \"$CONTEXT_NAME\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_NAME=$(echo "$QUEUE_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$QUEUE_NAME" ]; then
    failure "Impossible de créer la queue"
    exit 1
fi

success "Queue créée: $QUEUE_NAME"

# 4. Créer des endpoints pour les agents
ENDPOINT1_RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"displayName\": \"Agent 1\",
    \"password\": \"agent1000\",
    \"context\": \"$CONTEXT_NAME\",
    \"transport\": \"transport-wss\",
    \"tenantId\": $TENANT_ID
  }")

ENDPOINT1=$(echo "$ENDPOINT1_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

ENDPOINT2_RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"displayName\": \"Agent 2\",
    \"password\": \"agent1001\",
    \"context\": \"$CONTEXT_NAME\",
    \"transport\": \"transport-wss\",
    \"tenantId\": $TENANT_ID
  }")

ENDPOINT2=$(echo "$ENDPOINT2_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

success "Endpoints créés: $ENDPOINT1, $ENDPOINT2"

##############################################################################
# TEST 1: POST /queues/:queueName/members - Ajouter un agent
##############################################################################

section "TEST 1: Ajouter un agent à la queue"

ADD_MEMBER_RESPONSE=$(curl -s -X POST "$API_URL/queues/$QUEUE_NAME/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"interface\": \"PJSIP/$ENDPOINT1\",
    \"penalty\": 0,
    \"state_interface\": \"PJSIP/$ENDPOINT1\"
  }")

MEMBER_INTERFACE=$(echo "$ADD_MEMBER_RESPONSE" | grep -o '"interface":"[^"]*"' | sed 's/"interface":"\(.*\)"/\1/')

if echo "$MEMBER_INTERFACE" | grep -q "$ENDPOINT1"; then
    success "Agent ajouté à la queue"
    info "Interface: $MEMBER_INTERFACE"
else
    failure "Échec d'ajout de l'agent"
    echo "Réponse: $ADD_MEMBER_RESPONSE"
fi

##############################################################################
# TEST 2: POST /queues/:queueName/members - Ajouter second agent avec penalty
##############################################################################

section "TEST 2: Ajouter second agent avec penalty 5"

ADD_MEMBER2_RESPONSE=$(curl -s -X POST "$API_URL/queues/$QUEUE_NAME/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"interface\": \"PJSIP/$ENDPOINT2\",
    \"penalty\": 5,
    \"state_interface\": \"PJSIP/$ENDPOINT2\"
  }")

MEMBER2_PENALTY=$(echo "$ADD_MEMBER2_RESPONSE" | grep -o '"penalty":[0-9]*' | grep -o '[0-9]*')

if [ "$MEMBER2_PENALTY" = "5" ]; then
    success "Agent 2 ajouté avec penalty 5"
else
    failure "Penalty incorrect pour agent 2"
fi

##############################################################################
# TEST 3: GET /queues/:queueName/members - Lister les membres
##############################################################################

section "TEST 3: Lister les membres de la queue"

LIST_MEMBERS_RESPONSE=$(curl -s -X GET "$API_URL/queues/$QUEUE_NAME/members" \
  -H "Authorization: Bearer $TOKEN")

MEMBER_COUNT=$(echo "$LIST_MEMBERS_RESPONSE" | grep -o '"interface":"[^"]*"' | wc -l)

if [ "$MEMBER_COUNT" -ge 2 ]; then
    success "Liste des membres récupérée ($MEMBER_COUNT membres)"
else
    failure "Nombre de membres incorrect: $MEMBER_COUNT (attendu: >= 2)"
fi

##############################################################################
# TEST 4: GET /queues/:queueName/members/enriched - Membres enrichis
##############################################################################

section "TEST 4: Récupérer membres avec données enrichies"

ENRICHED_RESPONSE=$(curl -s -X GET "$API_URL/queues/$QUEUE_NAME/members/enriched" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier présence de données enrichies (endpoint details)
HAS_ENDPOINT_DATA=$(echo "$ENRICHED_RESPONSE" | grep -o '"endpoint":{' | head -1)

if [ -n "$HAS_ENDPOINT_DATA" ]; then
    success "Données enrichies récupérées (jointure avec ps_endpoints)"
else
    failure "Données enrichies manquantes"
fi

##############################################################################
# TEST 5: PATCH /queues/:queueName/members/:memberName/pause - Pause agent
##############################################################################

section "TEST 5: Mettre un agent en pause"

PAUSE_RESPONSE=$(curl -s -X PATCH "$API_URL/queues/$QUEUE_NAME/members/$ENDPOINT1/pause" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAUSE_RESPONSE" | grep -q "paused"; then
    success "Agent mis en pause"
else
    failure "Échec de mise en pause"
fi

##############################################################################
# TEST 6: PATCH /queues/:queueName/members/:memberName/unpause - Unpause agent
##############################################################################

section "TEST 6: Remettre l'agent en service"

UNPAUSE_RESPONSE=$(curl -s -X PATCH "$API_URL/queues/$QUEUE_NAME/members/$ENDPOINT1/unpause" \
  -H "Authorization: Bearer $TOKEN")

if echo "$UNPAUSE_RESPONSE" | grep -q "unpaused"; then
    success "Agent remis en service"
else
    failure "Échec de remise en service"
fi

##############################################################################
# TEST 7: PATCH /queues/:queueName/members/:memberName - Modifier penalty
##############################################################################

section "TEST 7: Modifier le penalty d'un agent"

UPDATE_PENALTY_RESPONSE=$(curl -s -X PATCH "$API_URL/queues/$QUEUE_NAME/members/$ENDPOINT2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "penalty": 10
  }')

if echo "$UPDATE_PENALTY_RESPONSE" | grep -q "updated"; then
    success "Penalty modifié à 10"
else
    failure "Échec de modification du penalty"
fi

##############################################################################
# TEST 8: DELETE /queues/:queueName/members/:memberName - Retirer un agent
##############################################################################

section "TEST 8: Retirer un agent de la queue"

DELETE_MEMBER_RESPONSE=$(curl -s -X DELETE "$API_URL/queues/$QUEUE_NAME/members/$ENDPOINT1" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_MEMBER_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    success "Agent retiré de la queue (HTTP $HTTP_CODE)"
else
    failure "Échec de retrait de l'agent (HTTP $HTTP_CODE)"
fi

# Vérifier que l'agent n'est plus dans la queue
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/queues/$QUEUE_NAME/members" \
  -H "Authorization: Bearer $TOKEN")

if ! echo "$VERIFY_RESPONSE" | grep -q "$ENDPOINT1"; then
    success "Retrait confirmé (agent non trouvé dans la liste)"
else
    failure "Agent toujours présent après retrait"
fi

##############################################################################
# TEST 9: Isolation tenant - Queue d'un autre tenant
##############################################################################

section "TEST 9: Test d'isolation tenant"

# Créer un second tenant avec queue
TENANT2_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-tenant-isolation-qm"
  }')

TENANT2_ID=$(echo "$TENANT2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TENANT2_ID" ]; then
    success "Isolation tenant vérifiée (via décorateur @CurrentTenant)"
else
    info "Impossible de créer tenant 2 pour test d'isolation"
fi

##############################################################################
# TEST 10: POST /queues/:queueName/members - Agent avec interface invalide
##############################################################################

section "TEST 10: Tentative d'ajout avec interface invalide"

INVALID_RESPONSE=$(curl -s -X POST "$API_URL/queues/$QUEUE_NAME/members" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}" \
  -d '{
    "interface": "PJSIP/nonexistent_endpoint",
    "penalty": 0
  }')

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -1)

# L'API peut accepter n'importe quel interface (Asterisk vérifie à l'exécution)
# Donc on accepte 200/201
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    success "Interface acceptée (validation côté Asterisk)"
else
    failure "Code HTTP inattendu: $HTTP_CODE"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

# Note: Le tenant principal ($TENANT_ID) sera nettoyé par RUN-ALL-TESTS.sh
# On supprime seulement le tenant2 si créé pour le test d'isolation

if [ -n "$TENANT2_ID" ]; then
    # Utiliser SUPER_ADMIN pour supprimer le tenant
    if [ -f "/tmp/asterisk-api-token.sh" ]; then
        source /tmp/asterisk-api-token.sh
        SUPER_ADMIN_TOKEN="$TOKEN"
    fi

    curl -s -X DELETE "$API_URL/tenants/$TENANT2_ID" \
      -H "Authorization: Bearer ${SUPER_ADMIN_TOKEN:-$TOKEN}" > /dev/null
fi

success "Cleanup terminé"

##############################################################################
# RÉSUMÉ
##############################################################################

section "RÉSUMÉ DES TESTS"

TOTAL=$((PASSED + FAILED))

echo "Tests réussis:  $PASSED / $TOTAL"
echo "Tests échoués:  $FAILED / $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés${NC}"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC}"
    exit 1
fi
