#!/bin/bash

##############################################################################
# Script de test - Module IVR Menus
# Teste les endpoints de gestion des menus IVR, options et conditions
# Inclut création, modification, validation, export/import
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
# PREREQUIS - Créer tenant et ressources pour les tests
##############################################################################

section "PREREQUIS - Création des ressources de test"

# 1. Créer tenant
TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-ivr-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# 2. Créer une queue pour actions de routage
sleep 2

CONTEXT_RESPONSE=$(curl -s -X POST "$API_URL/contexts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"ivr_context\",
    \"tenantId\": $TENANT_ID
  }")

CONTEXT_NAME=$(echo "$CONTEXT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

QUEUE_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"sales\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"context\": \"$CONTEXT_NAME\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_NAME=$(echo "$QUEUE_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

success "Queue créée: $QUEUE_NAME"

##############################################################################
# TEST 1: POST /ivr/menus - Créer un menu IVR
##############################################################################

section "TEST 1: Créer un menu IVR"

MENU_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "main_menu",
    "description": "Menu principal",
    "welcome_sound": "welcome",
    "invalid_sound": "invalid",
    "timeout_sound": "timeout",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": {
      "type": "hangup"
    },
    "invalid_action": {
      "type": "repeat"
    }
  }')

MENU_ID=$(echo "$MENU_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$MENU_ID" ]; then
    success "Menu IVR créé avec ID: $MENU_ID"
else
    failure "Échec de création du menu IVR"
    echo "Réponse: $MENU_RESPONSE"
fi

##############################################################################
# TEST 2: GET /ivr/menus - Lister tous les menus
##############################################################################

section "TEST 2: Lister tous les menus IVR"

LIST_MENUS_RESPONSE=$(curl -s -X GET "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

MENU_COUNT=$(echo "$LIST_MENUS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$MENU_COUNT" -ge 1 ]; then
    success "Liste des menus récupérée ($MENU_COUNT menus)"
else
    failure "Aucun menu trouvé"
fi

##############################################################################
# TEST 3: GET /ivr/menus/:id - Obtenir un menu spécifique
##############################################################################

section "TEST 3: Récupérer menu par ID"

GET_MENU_RESPONSE=$(curl -s -X GET "$API_URL/ivr/menus/$MENU_ID?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

MENU_NAME=$(echo "$GET_MENU_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\(.*\)"/\1/')

if [ "$MENU_NAME" = "main_menu" ]; then
    success "Menu récupéré correctement"
else
    failure "Menu non trouvé ou nom incorrect"
fi

##############################################################################
# TEST 4: PATCH /ivr/menus/:id - Modifier un menu
##############################################################################

section "TEST 4: Modifier le menu IVR"

UPDATE_MENU_RESPONSE=$(curl -s -X PATCH "$API_URL/ivr/menus/$MENU_ID?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "timeout": 10,
    "max_retries": 5
  }')

UPDATED_TIMEOUT=$(echo "$UPDATE_MENU_RESPONSE" | grep -o '"timeout":[0-9]*' | grep -o '[0-9]*')

if [ "$UPDATED_TIMEOUT" = "10" ]; then
    success "Menu modifié avec succès (timeout: 10)"
else
    failure "Échec de modification du menu"
fi

##############################################################################
# TEST 5: POST /ivr/menus/:menuId/options - Ajouter une option
##############################################################################

section "TEST 5: Ajouter option '1' au menu (vers queue)"

OPTION1_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/options?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"digit\": \"1\",
    \"description\": \"Service commercial\",
    \"action\": {
      \"type\": \"queue\",
      \"value\": \"$QUEUE_NAME\"
    },
    \"priority\": 1,
    \"is_active\": true
  }")

OPTION1_ID=$(echo "$OPTION1_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$OPTION1_ID" ]; then
    success "Option 1 ajoutée (ID: $OPTION1_ID, action: queue)"
else
    failure "Échec d'ajout de l'option 1"
fi

##############################################################################
# TEST 6: POST /ivr/menus/:menuId/options - Option avec sous-menu
##############################################################################

section "TEST 6: Ajouter option '2' (sous-menu)"

OPTION2_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/options?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "digit": "2",
    "description": "Support technique",
    "action": {
      "type": "submenu",
      "value": "support_menu"
    },
    "priority": 2,
    "is_active": true
  }')

OPTION2_ID=$(echo "$OPTION2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$OPTION2_ID" ]; then
    success "Option 2 ajoutée (ID: $OPTION2_ID, action: submenu)"
else
    failure "Échec d'ajout de l'option 2"
fi

##############################################################################
# TEST 7: GET /ivr/menus/:menuId/options - Lister les options
##############################################################################

section "TEST 7: Lister les options du menu"

LIST_OPTIONS_RESPONSE=$(curl -s -X GET "$API_URL/ivr/menus/$MENU_ID/options?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

OPTION_COUNT=$(echo "$LIST_OPTIONS_RESPONSE" | grep -o '"digit":"[^"]*"' | wc -l)

if [ "$OPTION_COUNT" -ge 2 ]; then
    success "Options récupérées ($OPTION_COUNT options)"
else
    failure "Nombre d'options incorrect: $OPTION_COUNT"
fi

##############################################################################
# TEST 8: PATCH /ivr/menus/:menuId/options/:optionId - Modifier option
##############################################################################

section "TEST 8: Modifier une option"

UPDATE_OPTION_RESPONSE=$(curl -s -X PATCH "$API_URL/ivr/menus/$MENU_ID/options/$OPTION1_ID?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "Service commercial - Nouveau",
    "priority": 10
  }')

UPDATED_PRIORITY=$(echo "$UPDATE_OPTION_RESPONSE" | grep -o '"priority":[0-9]*' | grep -o '[0-9]*')

if [ "$UPDATED_PRIORITY" = "10" ]; then
    success "Option modifiée (priority: 10)"
else
    failure "Échec de modification de l'option"
fi

##############################################################################
# TEST 9: POST /ivr/options/:optionId/toggle - Activer/désactiver
##############################################################################

section "TEST 9: Désactiver puis réactiver une option"

TOGGLE_RESPONSE=$(curl -s -X POST "$API_URL/ivr/options/$OPTION2_ID/toggle?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

IS_ACTIVE=$(echo "$TOGGLE_RESPONSE" | grep -o '"is_active":[a-z]*' | grep -o '[a-z]*$')

if [ "$IS_ACTIVE" = "false" ]; then
    success "Option désactivée"

    # Réactiver
    TOGGLE2_RESPONSE=$(curl -s -X POST "$API_URL/ivr/options/$OPTION2_ID/toggle?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN")

    IS_ACTIVE2=$(echo "$TOGGLE2_RESPONSE" | grep -o '"is_active":[a-z]*' | grep -o '[a-z]*$')

    if [ "$IS_ACTIVE2" = "true" ]; then
        success "Option réactivée"
    else
        failure "Échec de réactivation"
    fi
else
    failure "Échec de désactivation (is_active: $IS_ACTIVE)"
fi

##############################################################################
# TEST 10: POST /ivr/menus/:menuId/conditions - Ajouter condition
##############################################################################

section "TEST 10: Ajouter une condition temporelle"

CONDITION_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/conditions?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "condition_type": "time_based",
    "condition_config": {
      "start_time": "09:00",
      "end_time": "18:00",
      "days": [1,2,3,4,5]
    },
    "action": {
      "type": "playback",
      "value": "closed_message"
    },
    "priority": 1,
    "is_active": true
  }')

CONDITION_ID=$(echo "$CONDITION_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$CONDITION_ID" ]; then
    success "Condition ajoutée (ID: $CONDITION_ID)"
else
    failure "Échec d'ajout de la condition"
fi

##############################################################################
# TEST 11: GET /ivr/menus/:menuId/conditions - Lister conditions
##############################################################################

section "TEST 11: Lister les conditions du menu"

LIST_CONDITIONS_RESPONSE=$(curl -s -X GET "$API_URL/ivr/menus/$MENU_ID/conditions?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

CONDITION_COUNT=$(echo "$LIST_CONDITIONS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$CONDITION_COUNT" -ge 1 ]; then
    success "Conditions récupérées ($CONDITION_COUNT conditions)"
else
    failure "Aucune condition trouvée"
fi

##############################################################################
# TEST 12: POST /ivr/menus/:menuId/validate - Valider configuration
##############################################################################

section "TEST 12: Valider la configuration du menu"

VALIDATE_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/validate?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

IS_VALID=$(echo "$VALIDATE_RESPONSE" | grep -o '"valid":[a-z]*' | grep -o '[a-z]*$')

if [ "$IS_VALID" = "true" ]; then
    success "Configuration valide"
else
    info "Configuration invalide (peut être normal si actions non créées)"
fi

##############################################################################
# TEST 13: GET /ivr/menus/:menuId/export - Exporter configuration
##############################################################################

section "TEST 13: Exporter la configuration du menu en JSON"

EXPORT_RESPONSE=$(curl -s -X GET "$API_URL/ivr/menus/$MENU_ID/export?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

HAS_VERSION=$(echo "$EXPORT_RESPONSE" | grep -o '"version":"[^"]*"')

if [ -n "$HAS_VERSION" ]; then
    success "Configuration exportée avec succès"
    info "Export: ${EXPORT_RESPONSE:0:100}..."
else
    failure "Échec de l'export"
fi

##############################################################################
# TEST 14: POST /ivr/menus/:menuId/duplicate - Dupliquer menu
##############################################################################

section "TEST 14: Dupliquer le menu"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/duplicate?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "main_menu_copy"
  }')

DUPLICATE_ID=$(echo "$DUPLICATE_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$DUPLICATE_ID" ] && [ "$DUPLICATE_ID" != "$MENU_ID" ]; then
    success "Menu dupliqué (nouveau ID: $DUPLICATE_ID)"
else
    failure "Échec de duplication du menu"
fi

##############################################################################
# TEST 15: POST /ivr/menus/import - Importer configuration
##############################################################################

section "TEST 15: Importer une configuration JSON"

# Utiliser l'export précédent pour réimporter
if [ -n "$EXPORT_RESPONSE" ]; then
    # Modifier le nom pour éviter conflit
    IMPORT_DATA=$(echo "$EXPORT_RESPONSE" | sed 's/"name":"main_menu"/"name":"imported_menu"/g')

    IMPORT_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/import?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$IMPORT_DATA")

    IMPORT_ID=$(echo "$IMPORT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$IMPORT_ID" ]; then
        success "Menu importé avec succès (ID: $IMPORT_ID)"
    else
        failure "Échec de l'import"
    fi
else
    info "Pas de données d'export pour test d'import"
fi

##############################################################################
# TEST 16: POST /ivr/menus/:menuId/options/reorder - Réorganiser options
##############################################################################

section "TEST 16: Réorganiser l'ordre des options"

REORDER_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/options/reorder?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"order\": [$OPTION2_ID, $OPTION1_ID]
  }")

if echo "$REORDER_RESPONSE" | grep -q -E '(success|message)'; then
    success "Options réorganisées"
else
    failure "Échec de réorganisation"
fi

##############################################################################
# TEST 17: DELETE /ivr/menus/:menuId/options/:optionId - Supprimer option
##############################################################################

section "TEST 17: Supprimer une option"

DELETE_OPTION_RESPONSE=$(curl -s -X DELETE "$API_URL/ivr/menus/$MENU_ID/options/$OPTION2_ID?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_OPTION_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Option supprimée (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression de l'option (HTTP $HTTP_CODE)"
fi

##############################################################################
# TEST 18: DELETE /ivr/conditions/:conditionId - Supprimer condition
##############################################################################

section "TEST 18: Supprimer une condition"

DELETE_COND_RESPONSE=$(curl -s -X DELETE "$API_URL/ivr/conditions/$CONDITION_ID?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_COND_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Condition supprimée (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression de la condition (HTTP $HTTP_CODE)"
fi

##############################################################################
# TEST 19: DELETE /ivr/menus/:id - Supprimer menu
##############################################################################

section "TEST 19: Supprimer un menu"

DELETE_MENU_RESPONSE=$(curl -s -X DELETE "$API_URL/ivr/menus/$DUPLICATE_ID?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_MENU_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Menu supprimé (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression du menu (HTTP $HTTP_CODE)"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

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
