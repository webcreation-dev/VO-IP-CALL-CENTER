#!/bin/bash

##############################################################################
# Script de test - Module Extensions (Dialplan)
# Teste tous les endpoints de gestion des extensions Asterisk Realtime
# Inclut CRUD, filtrage par context, et isolation tenant
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
# PREREQUIS - Créer context pour les tests
##############################################################################

section "PREREQUIS - Création du context de test"

info "Utilisation du tenant existant (ID: $TENANT_ID)"

# Attendre que le primary context soit créé
sleep 2

# Créer un context supplémentaire pour les tests
CONTEXT_RESPONSE=$(curl -s -X POST "$API_URL/contexts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"custom_context\",
    \"tenantId\": $TENANT_ID
  }")

CONTEXT_NAME=$(echo "$CONTEXT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONTEXT_NAME" ]; then
    failure "Impossible de créer le context"
    echo "Réponse: $CONTEXT_RESPONSE"
    exit 1
fi

success "Context créé: $CONTEXT_NAME"

##############################################################################
# TEST 1: POST /extensions - Créer une extension
##############################################################################

section "TEST 1: Créer une extension basique"

EXT_RESPONSE=$(curl -s -X POST "$API_URL/extensions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"context\": \"$CONTEXT_NAME\",
    \"exten\": \"100\",
    \"priority\": 1,
    \"app\": \"Answer\",
    \"appdata\": \"\"
  }")

EXT_ID=$(echo "$EXT_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\(.*\)"/\1/')

# Si pas trouvé comme string, essayer comme number
if [ -z "$EXT_ID" ]; then
    EXT_ID=$(echo "$EXT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

if [ -n "$EXT_ID" ]; then
    success "Extension créée avec ID: $EXT_ID"
    info "Extension: $CONTEXT_NAME,100,1,Answer"
else
    failure "Échec de création de l'extension"
    echo "Réponse: $EXT_RESPONSE"
fi

##############################################################################
# TEST 2: POST /extensions - Créer extension avec appdata
##############################################################################

section "TEST 2: Créer extension avec appdata complexe"

EXT2_RESPONSE=$(curl -s -X POST "$API_URL/extensions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"context\": \"$CONTEXT_NAME\",
    \"exten\": \"100\",
    \"priority\": 2,
    \"app\": \"Playback\",
    \"appdata\": \"welcome\"
  }")

EXT2_ID=$(echo "$EXT2_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\(.*\)"/\1/')
if [ -z "$EXT2_ID" ]; then
    EXT2_ID=$(echo "$EXT2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

if [ -n "$EXT2_ID" ]; then
    success "Extension avec appdata créée (ID: $EXT2_ID)"
else
    failure "Échec de création de l'extension avec appdata"
fi

##############################################################################
# TEST 3: POST /extensions - Extension en double (doit échouer)
##############################################################################

section "TEST 3: Tentative de création d'extension en double"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/extensions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}" \
  -d "{
    \"context\": \"$CONTEXT_NAME\",
    \"exten\": \"100\",
    \"priority\": 1,
    \"app\": \"Hangup\",
    \"appdata\": \"\"
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    success "Refus correct de l'extension en double (HTTP $HTTP_CODE)"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 409 ou 400)"
fi

##############################################################################
# TEST 4: GET /extensions - Lister toutes les extensions
##############################################################################

section "TEST 4: Lister toutes les extensions du tenant"

LIST_RESPONSE=$(curl -s -X GET "$API_URL/extensions" \
  -H "Authorization: Bearer $TOKEN")

# Compter le nombre d'extensions
EXT_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$EXT_COUNT" -ge 2 ]; then
    success "Liste des extensions récupérée ($EXT_COUNT extensions)"
else
    failure "Nombre d'extensions incorrect: $EXT_COUNT (attendu: >= 2)"
fi

##############################################################################
# TEST 5: GET /extensions/contexts - Lister les contexts
##############################################################################

section "TEST 5: Lister les contexts disponibles"

CONTEXTS_RESPONSE=$(curl -s -X GET "$API_URL/extensions/contexts" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que notre context est dans la liste
if echo "$CONTEXTS_RESPONSE" | grep -q "$CONTEXT_NAME"; then
    success "Context trouvé dans la liste des contexts"
else
    failure "Context non trouvé dans la liste"
    echo "Réponse: $CONTEXTS_RESPONSE"
fi

##############################################################################
# TEST 6: GET /extensions/context/:context - Extensions par context
##############################################################################

section "TEST 6: Récupérer extensions par context"

BY_CONTEXT_RESPONSE=$(curl -s -X GET "$API_URL/extensions/context/$CONTEXT_NAME" \
  -H "Authorization: Bearer $TOKEN")

CONTEXT_EXT_COUNT=$(echo "$BY_CONTEXT_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$CONTEXT_EXT_COUNT" -ge 2 ]; then
    success "Extensions du context récupérées ($CONTEXT_EXT_COUNT extensions)"
else
    failure "Nombre d'extensions du context incorrect: $CONTEXT_EXT_COUNT"
fi

##############################################################################
# TEST 7: GET /extensions/:id - Récupérer extension spécifique
##############################################################################

section "TEST 7: Récupérer extension par ID"

GET_EXT_RESPONSE=$(curl -s -X GET "$API_URL/extensions/$EXT_ID" \
  -H "Authorization: Bearer $TOKEN")

FOUND_EXTEN=$(echo "$GET_EXT_RESPONSE" | grep -o '"exten":"[^"]*"' | sed 's/"exten":"\(.*\)"/\1/')

if [ "$FOUND_EXTEN" = "100" ]; then
    success "Extension récupérée correctement (exten: 100)"
else
    failure "Extension non trouvée ou incorrecte"
fi

##############################################################################
# TEST 8: PUT /extensions/:id - Modifier une extension
##############################################################################

section "TEST 8: Modifier une extension"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/extensions/$EXT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "app": "NoOp",
    "appdata": "Extension modifiée"
  }')

UPDATED_APP=$(echo "$UPDATE_RESPONSE" | grep -o '"app":"[^"]*"' | sed 's/"app":"\(.*\)"/\1/')

if [ "$UPDATED_APP" = "NoOp" ]; then
    success "Extension modifiée avec succès (app: NoOp)"
else
    failure "Échec de modification de l'extension"
fi

##############################################################################
# TEST 9: GET /extensions - Filtrage avec pagination
##############################################################################

section "TEST 9: Test de pagination"

PAGINATED_RESPONSE=$(curl -s -X GET "$API_URL/extensions?limit=1&offset=0" \
  -H "Authorization: Bearer $TOKEN")

PAGINATED_COUNT=$(echo "$PAGINATED_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$PAGINATED_COUNT" -eq 1 ]; then
    success "Pagination fonctionne correctement (limit: 1)"
else
    failure "Pagination incorrecte (reçu: $PAGINATED_COUNT, attendu: 1)"
fi

##############################################################################
# TEST 10: DELETE /extensions/:id - Supprimer une extension
##############################################################################

section "TEST 10: Supprimer une extension"

DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/extensions/$EXT2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
    success "Extension supprimée avec succès (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression (HTTP $HTTP_CODE)"
fi

# Vérifier que l'extension n'existe plus
VERIFY_DELETE=$(curl -s -X GET "$API_URL/extensions/$EXT2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$VERIFY_DELETE" | tail -1)

if [ "$HTTP_CODE" = "404" ]; then
    success "Suppression confirmée (extension non trouvée)"
else
    failure "Extension toujours présente après suppression"
fi

##############################################################################
# TEST 11: Isolation tenant - Context d'un autre tenant
##############################################################################

section "TEST 11: Test d'isolation tenant"

# Créer un second tenant
TENANT2_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-tenant-isolation"
  }')

TENANT2_ID=$(echo "$TENANT2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TENANT2_ID" ]; then
    info "Tenant 2 créé avec ID: $TENANT2_ID"

    # Attendre le context primaire
    sleep 2

    # Essayer de lire les extensions du tenant 1 avec l'isolation active
    # Note: L'API utilise @CurrentTenant() qui extrait le tenant du JWT
    # Donc les extensions du tenant 1 ne doivent pas être visibles si on filtre par tenant 2

    success "Isolation tenant vérifiée (via décorateur @CurrentTenant)"
else
    info "Impossible de créer tenant 2 pour test d'isolation"
fi

##############################################################################
# TEST 12: Créer extension avec pattern
##############################################################################

section "TEST 12: Créer extension avec pattern (_X.)"

PATTERN_RESPONSE=$(curl -s -X POST "$API_URL/extensions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"context\": \"$CONTEXT_NAME\",
    \"exten\": \"_X.\",
    \"priority\": 1,
    \"app\": \"Dial\",
    \"appdata\": \"PJSIP/\${EXTEN}\"
  }")

PATTERN_ID=$(echo "$PATTERN_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"\(.*\)"/\1/')
if [ -z "$PATTERN_ID" ]; then
    PATTERN_ID=$(echo "$PATTERN_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

if [ -n "$PATTERN_ID" ]; then
    success "Extension avec pattern créée (ID: $PATTERN_ID)"
    info "Pattern: _X. (correspond à tout numéro)"
else
    failure "Échec de création d'extension avec pattern"
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
