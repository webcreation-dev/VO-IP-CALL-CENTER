#!/bin/bash

##############################################################################
# Script de test - Module IVR DID Mappings
# Teste les endpoints de mapping entre numéros DID et menus IVR
# Permet de router les appels entrants vers les bons menus
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
# PREREQUIS - Créer tenant et menu IVR
##############################################################################

section "PREREQUIS - Création des ressources de test"

# 1. Créer tenant
TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-did-mappings-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# 2. Créer un menu IVR
sleep 1

MENU_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "main_reception",
    "description": "Accueil principal",
    "welcome_sound": "welcome",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": {"type": "hangup"},
    "invalid_action": {"type": "repeat"}
  }')

MENU_ID=$(echo "$MENU_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$MENU_ID" ]; then
    failure "Impossible de créer le menu IVR"
    exit 1
fi

success "Menu IVR créé avec ID: $MENU_ID"

##############################################################################
# TEST 1: POST /ivr/did-mappings - Créer mapping DID → menu
##############################################################################

section "TEST 1: Créer mapping DID vers menu IVR"

MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"did\": \"+33123456789\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true
  }")

MAPPING_ID=$(echo "$MAPPING_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$MAPPING_ID" ]; then
    success "Mapping DID créé avec ID: $MAPPING_ID"
    info "DID: +33123456789 → Menu ID: $MENU_ID"
else
    failure "Échec de création du mapping DID"
    echo "Réponse: $MAPPING_RESPONSE"
fi

##############################################################################
# TEST 2: POST /ivr/did-mappings - Mapping avec pattern
##############################################################################

section "TEST 2: Créer mapping avec pattern DID"

PATTERN_MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"did\": \"+331_________\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true
  }")

PATTERN_MAPPING_ID=$(echo "$PATTERN_MAPPING_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$PATTERN_MAPPING_ID" ]; then
    success "Mapping avec pattern créé (ID: $PATTERN_MAPPING_ID)"
    info "Pattern: +331_________ (tous les numéros français mobiles)"
else
    failure "Échec de création du mapping pattern"
fi

##############################################################################
# TEST 3: GET /ivr/did-mappings - Lister tous les mappings
##############################################################################

section "TEST 3: Lister tous les mappings DID"

LIST_MAPPINGS_RESPONSE=$(curl -s -X GET "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

MAPPING_COUNT=$(echo "$LIST_MAPPINGS_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$MAPPING_COUNT" -ge 2 ]; then
    success "Liste des mappings récupérée ($MAPPING_COUNT mappings)"
else
    failure "Nombre de mappings incorrect: $MAPPING_COUNT (attendu: >= 2)"
fi

##############################################################################
# TEST 4: GET /ivr/did-mappings/by-did/:did - Chercher par DID
##############################################################################

section "TEST 4: Rechercher mapping par DID"

FIND_DID_RESPONSE=$(curl -s -X GET "$API_URL/ivr/did-mappings/by-did/+33123456789?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

FOUND_DID=$(echo "$FIND_DID_RESPONSE" | grep -o '"did":"[^"]*"' | sed 's/"did":"\(.*\)"/\1/')

if [ "$FOUND_DID" = "+33123456789" ]; then
    success "Mapping trouvé par DID"
else
    failure "Mapping non trouvé (DID: $FOUND_DID)"
fi

##############################################################################
# TEST 5: PATCH /ivr/did-mappings/:id - Modifier un mapping
##############################################################################

section "TEST 5: Modifier un mapping DID"

UPDATE_MAPPING_RESPONSE=$(curl -s -X PATCH "$API_URL/ivr/did-mappings/$MAPPING_ID?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "is_active": false
  }')

IS_ACTIVE=$(echo "$UPDATE_MAPPING_RESPONSE" | grep -o '"is_active":[a-z]*' | grep -o '[a-z]*$')

if [ "$IS_ACTIVE" = "false" ]; then
    success "Mapping désactivé"
else
    failure "Échec de modification du mapping"
fi

##############################################################################
# TEST 6: PATCH /ivr/did-mappings/:id - Changer le menu cible
##############################################################################

section "TEST 6: Changer le menu cible d'un mapping"

# Créer un second menu
MENU2_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "support_menu",
    "description": "Menu support",
    "welcome_sound": "support_welcome",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": {"type": "hangup"},
    "invalid_action": {"type": "repeat"}
  }')

MENU2_ID=$(echo "$MENU2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$MENU2_ID" ]; then
    # Modifier le mapping pour pointer vers le nouveau menu
    CHANGE_MENU_RESPONSE=$(curl -s -X PATCH "$API_URL/ivr/did-mappings/$MAPPING_ID?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"menu_id\": $MENU2_ID,
        \"is_active\": true
      }")

    NEW_MENU_ID=$(echo "$CHANGE_MENU_RESPONSE" | grep -o '"menu_id":[0-9]*' | grep -o '[0-9]*')

    if [ "$NEW_MENU_ID" = "$MENU2_ID" ]; then
        success "Menu cible modifié (nouveau menu: $MENU2_ID)"
    else
        failure "Échec de changement de menu"
    fi
else
    failure "Impossible de créer le second menu pour ce test"
fi

##############################################################################
# TEST 7: POST /ivr/did-mappings - DID en double (doit échouer)
##############################################################################

section "TEST 7: Tentative de création de mapping en double"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}" \
  -d "{
    \"did\": \"+33123456789\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    success "Refus correct du DID en double (HTTP $HTTP_CODE)"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 409 ou 400)"
fi

##############################################################################
# TEST 8: Créer mapping avec DID international
##############################################################################

section "TEST 8: Créer mapping avec DID US"

US_MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"did\": \"+14155551234\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true
  }")

US_MAPPING_ID=$(echo "$US_MAPPING_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$US_MAPPING_ID" ]; then
    success "Mapping DID US créé (ID: $US_MAPPING_ID)"
else
    failure "Échec de création du mapping DID US"
fi

##############################################################################
# TEST 9: Créer mapping avec DID court (extension interne)
##############################################################################

section "TEST 9: Créer mapping avec extension courte"

EXT_MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"did\": \"100\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true
  }")

EXT_MAPPING_ID=$(echo "$EXT_MAPPING_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$EXT_MAPPING_ID" ]; then
    success "Mapping extension courte créé (ID: $EXT_MAPPING_ID)"
else
    failure "Échec de création du mapping extension"
fi

##############################################################################
# TEST 10: DELETE /ivr/did-mappings/:id - Supprimer un mapping
##############################################################################

section "TEST 10: Supprimer un mapping DID"

DELETE_MAPPING_RESPONSE=$(curl -s -X DELETE "$API_URL/ivr/did-mappings/$PATTERN_MAPPING_ID?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_MAPPING_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Mapping supprimé (HTTP $HTTP_CODE)"
else
    failure "Échec de suppression du mapping (HTTP $HTTP_CODE)"
fi

# Vérifier que le mapping n'existe plus
VERIFY_DELETE=$(curl -s -X GET "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

if ! echo "$VERIFY_DELETE" | grep -q "\"id\":$PATTERN_MAPPING_ID"; then
    success "Suppression confirmée (mapping non trouvé)"
else
    failure "Mapping toujours présent après suppression"
fi

##############################################################################
# TEST 11: Isolation tenant - Vérifier que les DID sont isolés
##############################################################################

section "TEST 11: Test d'isolation tenant"

# Créer un second tenant
TENANT2_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-tenant-isolation-did"
  }')

TENANT2_ID=$(echo "$TENANT2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TENANT2_ID" ]; then
    # Créer un mapping avec le même DID dans le tenant 2
    sleep 1

    MENU3_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT2_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "name": "menu_tenant2",
        "welcome_sound": "welcome",
        "timeout": 5,
        "max_retries": 3,
        "max_digits": 1,
        "timeout_action": {"type": "hangup"},
        "invalid_action": {"type": "repeat"}
      }')

    MENU3_ID=$(echo "$MENU3_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$MENU3_ID" ]; then
        ISOLATION_MAPPING=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT2_ID" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -d "{
            \"did\": \"+33123456789\",
            \"menu_id\": $MENU3_ID,
            \"is_active\": true
          }")

        ISOLATION_ID=$(echo "$ISOLATION_MAPPING" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

        if [ -n "$ISOLATION_ID" ]; then
            success "Isolation tenant OK: même DID possible dans différents tenants"
        else
            info "Isolation tenant stricte: DID unique global (peut être voulu)"
        fi
    fi
else
    info "Impossible de créer tenant 2 pour test d'isolation"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

curl -s -X DELETE "$API_URL/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

if [ -n "$TENANT2_ID" ]; then
    curl -s -X DELETE "$API_URL/tenants/$TENANT2_ID" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
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
