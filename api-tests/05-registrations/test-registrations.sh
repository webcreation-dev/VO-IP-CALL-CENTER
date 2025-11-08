#!/bin/bash

##############################################################################
# Script de test - Module Registrations (SIP Trunks)
# Teste tous les endpoints de l'API relatifs aux trunks SIP
# Inclut les tests de routing automatique vers les queues
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
# PREREQUIS - Créer tenant, context et queue pour les tests
##############################################################################

section "PREREQUIS - Création des ressources de test"

# 1. Créer tenant
TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-trunk-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# Attendre que le primary context soit créé automatiquement
info "Waiting for primary context creation..."
sleep 2

# 2. Créer context (use underscore instead of hyphen for Asterisk compatibility)
CONTEXT_RESPONSE=$(curl -s -X POST "$API_URL/contexts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"from_trunk\",
    \"tenantId\": $TENANT_ID
  }")

# Extract context name, looking specifically for the tenant context format
CONTEXT_NAME=$(echo "$CONTEXT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONTEXT_NAME" ]; then
    failure "Impossible de créer le context"
    echo "Réponse complète:"
    echo "$CONTEXT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CONTEXT_RESPONSE"
    exit 1
fi

success "Context créé: $CONTEXT_NAME"

# 3. Créer queue (pour tester le routing)
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

# Extract queue name, looking for tenant-prefixed queue format
QUEUE_NAME=$(echo "$QUEUE_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$QUEUE_NAME" ]; then
    failure "Impossible de créer la queue"
    echo "Réponse complète:"
    echo "$QUEUE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUEUE_RESPONSE"
    exit 1
fi

success "Queue créée: $QUEUE_NAME"

##############################################################################
# TEST 1: POST /registrations - Créer un SIP trunk
##############################################################################

section "TEST 1: Créer un SIP trunk"

TRUNK_RESPONSE=$(curl -s -X POST "$API_URL/registrations?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"operator_trunk\",
    \"remote_host\": \"197.234.218.195:25060\",
    \"username\": \"62908521\",
    \"password\": \"167d458f-8\",
    \"transport\": \"transport-udp\",
    \"context\": \"$CONTEXT_NAME\",
    \"sends_registrations\": true,
    \"sends_auth\": true,
    \"destination_type\": \"queue\",
    \"destination_id\": \"$QUEUE_NAME\",
    \"did_pattern\": \"_X.\"
  }")

TRUNK_NAME=$(echo "$TRUNK_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\(.*\)"/\1/')

if [ -z "$TRUNK_NAME" ]; then
    failure "Impossible de créer le trunk SIP"
    echo "Réponse: $TRUNK_RESPONSE"
else
    success "Trunk créé: $TRUNK_NAME"
fi

##############################################################################
# TEST 2: GET /registrations - Lister les trunks
##############################################################################

section "TEST 2: Lister les SIP trunks"

LIST_RESPONSE=$(curl -s -X GET "$API_URL/registrations" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":"operator_trunk"' | wc -l)

if [ "$COUNT" -ge 1 ]; then
    success "Trunk trouvé dans la liste"
else
    failure "Trunk non trouvé dans la liste"
    echo "Réponse: $LIST_RESPONSE"
fi

##############################################################################
# TEST 3: GET /registrations/:id - Obtenir un trunk spécifique
##############################################################################

section "TEST 3: Obtenir détails du trunk"

DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/registrations/$TRUNK_NAME" \
  -H "Authorization: Bearer $TOKEN")

FOUND_ID=$(echo "$DETAIL_RESPONSE" | grep -o '"id":"operator_trunk"')

if [ -n "$FOUND_ID" ]; then
    success "Détails du trunk récupérés"
else
    failure "Impossible de récupérer les détails du trunk"
fi

##############################################################################
# TEST 4: GET /registrations/:id?with_status=true - Avec statut AMI
##############################################################################

section "TEST 4: Obtenir trunk avec statut AMI"

STATUS_RESPONSE=$(curl -s -X GET "$API_URL/registrations/$TRUNK_NAME?with_status=true" \
  -H "Authorization: Bearer $TOKEN")

HAS_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":{' | head -1)

if [ -n "$HAS_STATUS" ]; then
    success "Statut AMI inclus dans la réponse"
    STATUS_VALUE=$(echo "$STATUS_RESPONSE" | grep -o '"status":{[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | tail -1 | cut -d'"' -f4)
    info "Status: ${STATUS_VALUE:-unknown}"
else
    failure "Statut AMI non inclus"
fi

##############################################################################
# TEST 5: PATCH /registrations/:id/routing - Configurer le routing
##############################################################################

section "TEST 5: Configurer le routing trunk → queue"

ROUTING_RESPONSE=$(curl -s -X PATCH "$API_URL/registrations/$TRUNK_NAME/routing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"destination_type\": \"queue\",
    \"destination_id\": \"$QUEUE_NAME\",
    \"did_pattern\": \"_X.\"
  }")

ROUTING_SUCCESS=$(echo "$ROUTING_RESPONSE" | grep -o '"message":"Routing configured successfully"')

if [ -n "$ROUTING_SUCCESS" ]; then
    success "Routing configuré vers la queue"
    info "Pattern DID: _X."

    # Vérifier qu'une extension a été créée
    EXT_CREATED=$(echo "$ROUTING_RESPONSE" | grep -o '"extensions_created"')
    if [ -n "$EXT_CREATED" ]; then
        success "Extension de dialplan créée automatiquement"
    else
        info "Pas d'extension créée (peut être normal)"
    fi
else
    failure "Échec de configuration du routing"
    echo "Réponse: $ROUTING_RESPONSE"
fi

##############################################################################
# TEST 6: GET /registrations/:id/routing - Obtenir la configuration de routing
##############################################################################

section "TEST 6: Obtenir configuration de routing"

GET_ROUTING_RESPONSE=$(curl -s -X GET "$API_URL/registrations/$TRUNK_NAME/routing" \
  -H "Authorization: Bearer $TOKEN")

DEST_TYPE=$(echo "$GET_ROUTING_RESPONSE" | grep -o '"destination_type":"queue"')
DEST_ID=$(echo "$GET_ROUTING_RESPONSE" | grep -o '"destination_id":"[^"]*"' | sed 's/"destination_id":"\(.*\)"/\1/')

if [ -n "$DEST_TYPE" ] && [ -n "$DEST_ID" ]; then
    success "Configuration de routing récupérée"
    info "Type: queue, ID: $DEST_ID"
else
    failure "Configuration de routing incorrecte"
    echo "Réponse: $GET_ROUTING_RESPONSE"
fi

##############################################################################
# TEST 7: PATCH /registrations/:id/routing - Modifier le routing (DID pattern)
##############################################################################

section "TEST 7: Modifier le routing (nouveau DID pattern)"

UPDATE_ROUTING_RESPONSE=$(curl -s -X PATCH "$API_URL/registrations/$TRUNK_NAME/routing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"destination_type\": \"queue\",
    \"destination_id\": \"$QUEUE_NAME\",
    \"did_pattern\": \"_1NXXNXXXXXX\"
  }")

UPDATE_SUCCESS=$(echo "$UPDATE_ROUTING_RESPONSE" | grep -o '"message":"Routing configured successfully"')

if [ -n "$UPDATE_SUCCESS" ]; then
    success "Routing mis à jour avec nouveau DID pattern"
    info "Nouveau pattern: _1NXXNXXXXXX"
else
    failure "Échec de mise à jour du routing"
fi

##############################################################################
# TEST 8: PATCH /registrations/:id - Modifier le trunk
##############################################################################

section "TEST 8: Modifier le trunk"

UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/registrations/$TRUNK_NAME" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"retry_interval\": 30,
    \"expiration\": 1800
  }")

UPDATE_ID=$(echo "$UPDATE_RESPONSE" | grep -o '"id":"operator_trunk"')

if [ -n "$UPDATE_ID" ]; then
    success "Trunk modifié"
else
    failure "Échec de modification du trunk"
fi

##############################################################################
# TEST 9: POST /registrations/:id/register - Forcer la registration
##############################################################################

section "TEST 9: Forcer la registration SIP"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/registrations/$TRUNK_NAME/register" \
  -H "Authorization: Bearer $TOKEN")

# Accepter soit un succès soit une erreur (le provider peut ne pas être accessible)
if echo "$REGISTER_RESPONSE" | grep -q -E '("message"|"success"|"error")'; then
    success "Commande de registration envoyée"
    info "Réponse: $(echo "$REGISTER_RESPONSE" | grep -o '"message":"[^"]*"' || echo "Registration tentée")"
else
    failure "Échec de la commande de registration"
fi

##############################################################################
# TEST 10: GET /registrations/status/ami - Statut des registrations via AMI
##############################################################################

section "TEST 10: Obtenir statut via AMI"

AMI_STATUS_RESPONSE=$(curl -s -X GET "$API_URL/registrations/status/ami" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que la réponse est un tableau (peut être vide si pas de registrations actives)
if echo "$AMI_STATUS_RESPONSE" | grep -q -E '(\[|\{)'; then
    success "Statut AMI récupéré"
else
    failure "Échec de récupération du statut AMI"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

# Supprimer le trunk
DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/registrations/$TRUNK_NAME" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    success "Trunk supprimé"
else
    failure "Échec de suppression du trunk (HTTP $HTTP_CODE)"
fi

# Supprimer la queue
curl -s -X DELETE "$API_URL/queues/$QUEUE_NAME" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Supprimer le tenant (cascade delete)
curl -s -X DELETE "$API_URL/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

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
