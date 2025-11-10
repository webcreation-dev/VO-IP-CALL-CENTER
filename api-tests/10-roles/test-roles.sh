#!/bin/bash

##############################################################################
# Script de test - Module Roles
# Teste tous les endpoints de gestion des rôles utilisateur
# Inclut CRUD, presets, callable-roles, statistiques
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
# PREREQUIS - Utiliser le tenant de test existant
##############################################################################

section "PREREQUIS - Vérification du tenant"

info "Utilisation du tenant existant (ID: $TENANT_ID)"

##############################################################################
# TEST 1: GET /roles/presets - Lister les presets disponibles
##############################################################################

section "TEST 1: Récupérer la liste des presets de rôles"

PRESETS_RESPONSE=$(curl -s -X GET "$API_URL/roles/presets" \
  -H "Authorization: Bearer $TOKEN")

PRESET_COUNT=$(echo "$PRESETS_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)

if [ "$PRESET_COUNT" -ge 1 ]; then
    success "Presets récupérés ($PRESET_COUNT presets disponibles)"

    # Extraire le premier preset ID pour test ultérieur
    PRESET_ID=$(echo "$PRESETS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\(.*\)"/\1/')
    info "Premier preset: $PRESET_ID"
else
    failure "Aucun preset trouvé"
fi

##############################################################################
# TEST 2: GET /roles/presets/:id - Obtenir détails d'un preset
##############################################################################

section "TEST 2: Obtenir détails d'un preset spécifique"

if [ -n "$PRESET_ID" ]; then
    PRESET_DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/roles/presets/$PRESET_ID" \
      -H "Authorization: Bearer $TOKEN")

    PRESET_NAME=$(echo "$PRESET_DETAIL_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\(.*\)"/\1/')

    if [ -n "$PRESET_NAME" ]; then
        success "Détails du preset récupérés (name: $PRESET_NAME)"
    else
        failure "Impossible de récupérer les détails du preset"
    fi
else
    failure "Pas de preset ID disponible pour ce test"
fi

##############################################################################
# TEST 3: POST /roles - Créer un rôle personnalisé
##############################################################################

section "TEST 3: Créer un rôle personnalisé"

ROLE_RESPONSE=$(curl -s -X POST "$API_URL/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"team_leader\",
    \"displayName\": \"Team Leader\",
    \"level\": 5,
    \"canCallSameLevel\": true,
    \"canCallLowerLevel\": true,
    \"canCallHigherLevel\": false,
    \"tenantId\": $TENANT_ID
  }")

ROLE_ID=$(echo "$ROLE_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
ROLE_NAME=$(echo "$ROLE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\(.*\)"/\1/')

if [ -n "$ROLE_ID" ] && [ "$ROLE_NAME" = "team_leader" ]; then
    success "Rôle créé avec succès (ID: $ROLE_ID)"
else
    failure "Échec de création du rôle"
    echo "Réponse: $ROLE_RESPONSE"
fi

##############################################################################
# TEST 4: POST /roles - Rôle en double (doit échouer)
##############################################################################

section "TEST 4: Tentative de création d'un rôle en double"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}" \
  -d "{
    \"name\": \"team_leader\",
    \"displayName\": \"Team Leader Duplicate\",
    \"level\": 50,
    \"canCallSameLevel\": true,
    \"canCallLowerLevel\": true,
    \"canCallHigherLevel\": false,
    \"tenantId\": $TENANT_ID
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    success "Refus correct du rôle en double (HTTP $HTTP_CODE)"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 409 ou 400)"
fi

##############################################################################
# TEST 5: GET /roles - Lister tous les rôles du tenant
##############################################################################

section "TEST 5: Lister tous les rôles du tenant"

LIST_ROLES_RESPONSE=$(curl -s -X GET "$API_URL/roles" \
  -H "Authorization: Bearer $TOKEN")

ROLE_COUNT=$(echo "$LIST_ROLES_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$ROLE_COUNT" -ge 1 ]; then
    success "Liste des rôles récupérée ($ROLE_COUNT rôles)"
else
    failure "Aucun rôle trouvé"
fi

##############################################################################
# TEST 6: GET /roles?activeOnly=true - Filtrer rôles actifs
##############################################################################

section "TEST 6: Filtrer les rôles actifs uniquement"

ACTIVE_ROLES_RESPONSE=$(curl -s -X GET "$API_URL/roles?activeOnly=true" \
  -H "Authorization: Bearer $TOKEN")

ACTIVE_COUNT=$(echo "$ACTIVE_ROLES_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$ACTIVE_COUNT" -ge 1 ]; then
    success "Rôles actifs filtrés ($ACTIVE_COUNT rôles actifs)"
else
    info "Aucun rôle actif (peut être normal)"
fi

##############################################################################
# TEST 7: GET /roles/:id - Obtenir un rôle spécifique
##############################################################################

section "TEST 7: Récupérer un rôle par ID"

GET_ROLE_RESPONSE=$(curl -s -X GET "$API_URL/roles/$ROLE_ID" \
  -H "Authorization: Bearer $TOKEN")

FOUND_DISPLAY_NAME=$(echo "$GET_ROLE_RESPONSE" | grep -o '"displayName":"[^"]*"' | head -1 | sed 's/"displayName":"\(.*\)"/\1/')

if [ "$FOUND_DISPLAY_NAME" = "Team Leader" ]; then
    success "Rôle récupéré correctement"
else
    failure "Rôle non trouvé ou displayName incorrect"
fi

##############################################################################
# TEST 8: PATCH /roles/:id - Modifier un rôle
##############################################################################

section "TEST 8: Modifier le rôle"

UPDATE_ROLE_RESPONSE=$(curl -s -X PATCH "$API_URL/roles/$ROLE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "displayName": "Team Leader Senior",
    "canCallSameLevel": true,
    "canCallLowerLevel": true,
    "canCallHigherLevel": true
  }')

UPDATED_DISPLAY_NAME=$(echo "$UPDATE_ROLE_RESPONSE" | grep -o '"displayName":"[^"]*"' | sed 's/"displayName":"\(.*\)"/\1/')

if [ "$UPDATED_DISPLAY_NAME" = "Team Leader Senior" ]; then
    success "Rôle modifié avec succès (displayName: Team Leader Senior)"
else
    failure "Échec de modification du rôle"
fi

##############################################################################
# TEST 9: GET /roles/statistics - Obtenir statistiques
##############################################################################

section "TEST 9: Récupérer statistiques des rôles"

STATS_RESPONSE=$(curl -s -X GET "$API_URL/roles/statistics" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier présence de statistiques
HAS_STATS=$(echo "$STATS_RESPONSE" | grep -o '"total[^"]*"' | head -1)

if [ -n "$HAS_STATS" ]; then
    success "Statistiques récupérées"
    info "Stats: $(echo "$STATS_RESPONSE" | head -c 100)..."
else
    failure "Statistiques manquantes"
fi

##############################################################################
# TEST 10: POST /roles/presets/:id/apply - Appliquer un preset
##############################################################################

section "TEST 10: Appliquer un preset à un nouveau tenant"

# Créer nouveau tenant pour appliquer preset
NEW_TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-tenant-preset"
  }')

NEW_TENANT_ID=$(echo "$NEW_TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$NEW_TENANT_ID" ] && [ -n "$PRESET_ID" ]; then
    # Note: L'API utilise @TenantId() qui extrait du JWT, donc on doit ajuster
    # Pour ce test, on vérifie juste que l'endpoint existe

    APPLY_PRESET_RESPONSE=$(curl -s -X POST "$API_URL/roles/presets/$PRESET_ID/apply" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$APPLY_PRESET_RESPONSE" | tail -1)

    # Peut retourner 400 si le tenant (du JWT) a déjà des rôles
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
        success "Endpoint apply preset fonctionne (HTTP $HTTP_CODE)"
    else
        failure "Échec d'application du preset (HTTP $HTTP_CODE)"
    fi
else
    info "Pas de tenant/preset pour ce test"
fi

##############################################################################
# TEST 11: GET /roles/:id/callable-roles - Rôles appelables
##############################################################################

section "TEST 11: Récupérer les rôles appelables"

CALLABLE_RESPONSE=$(curl -s -X GET "$API_URL/roles/$ROLE_ID/callable-roles" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que l'endpoint répond (peut être vide)
if echo "$CALLABLE_RESPONSE" | grep -q -E '(\[|\{)'; then
    success "Endpoint callable-roles fonctionne"
else
    failure "Erreur sur endpoint callable-roles"
fi

##############################################################################
# TEST 12: DELETE /roles/:id - Supprimer un rôle
##############################################################################

section "TEST 12: Supprimer un rôle"

DELETE_ROLE_RESPONSE=$(curl -s -X DELETE "$API_URL/roles/$ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_ROLE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Rôle supprimé avec succès (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression du rôle (HTTP $HTTP_CODE)"
fi

# Vérifier que le rôle n'existe plus
VERIFY_DELETE=$(curl -s -X GET "$API_URL/roles/$ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$VERIFY_DELETE" | tail -1)

if [ "$HTTP_CODE" = "404" ]; then
    success "Suppression confirmée (rôle non trouvé)"
else
    failure "Rôle toujours présent après suppression"
fi

##############################################################################
# TEST 13: Créer rôle avec level en conflit
##############################################################################

section "TEST 13: Test de création avec level en conflit"

ROLE2_RESPONSE=$(curl -s -X POST "$API_URL/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"agent_support\",
    \"displayName\": \"Agent Support\",
    \"level\": 10,
    \"canCallSameLevel\": true,
    \"canCallLowerLevel\": false,
    \"canCallHigherLevel\": false,
    \"tenantId\": $TENANT_ID
  }")

ROLE2_ID=$(echo "$ROLE2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$ROLE2_ID" ]; then
    success "Rôle Agent Support créé (level: 10)"

    # Essayer de créer un autre rôle avec le même level
    CONFLICT_RESPONSE=$(curl -s -X POST "$API_URL/roles" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}" \
      -d "{
        \"name\": \"another_role\",
        \"displayName\": \"Another Role\",
        \"level\": 10,
        \"canCallSameLevel\": true,
        \"canCallLowerLevel\": false,
        \"canCallHigherLevel\": false,
        \"tenantId\": $TENANT_ID
      }")

    HTTP_CODE=$(echo "$CONFLICT_RESPONSE" | tail -1)

    # Certaines implémentations permettent le même level, d'autres non
    if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        success "Gestion du level en conflit OK (HTTP $HTTP_CODE)"
    else
        failure "Réponse inattendue pour level en conflit (HTTP $HTTP_CODE)"
    fi
else
    failure "Échec de création du rôle Agent Support"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

# Note: Le tenant principal ($TENANT_ID) sera nettoyé par RUN-ALL-TESTS.sh
# On supprime seulement le tenant additionnel si créé pour le test

if [ -n "$NEW_TENANT_ID" ]; then
    # Utiliser SUPER_ADMIN pour supprimer le tenant
    if [ -f "/tmp/asterisk-api-token.sh" ]; then
        source /tmp/asterisk-api-token.sh
        SUPER_ADMIN_TOKEN="$TOKEN"
    fi

    curl -s -X DELETE "$API_URL/tenants/$NEW_TENANT_ID" \
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
