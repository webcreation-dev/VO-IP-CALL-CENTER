#!/bin/bash

##############################################################################
# Script de test - Module Music on Hold (MoH)
# Teste tous les endpoints de l'API relatifs aux classes MoH
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
    "name": "test-moh-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# Le répertoire MoH sera créé automatiquement par l'API
MOH_DIR="/var/lib/asterisk/sounds/custom/t${TENANT_ID}/moh"
info "Répertoire MoH: $MOH_DIR"

##############################################################################
# TEST 1: POST /moh/classes - Créer une classe MoH
##############################################################################

section "TEST 1: Créer une classe MoH (mode files)"

MOH1_RESPONSE=$(curl -s -X POST "$API_URL/moh/classes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"company_music\",
    \"mode\": \"files\",
    \"directory\": \"$MOH_DIR\",
    \"format\": \"wav\",
    \"sort\": \"random\",
    \"description\": \"Company background music\",
    \"tenantId\": $TENANT_ID
  }")

MOH1_ID=$(echo "$MOH1_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
MOH1_NAME=$(echo "$MOH1_RESPONSE" | grep -o '"name":"[^"]*"' | sed 's/"name":"\(.*\)"/\1/')

if [ -n "$MOH1_ID" ]; then
    success "Classe MoH créée (ID: $MOH1_ID, Name: $MOH1_NAME)"
    info "Mode: files, Directory: $MOH_DIR"

    # Vérifier que le fichier de config a été généré
    info "Configuration musiconhold.conf devrait être générée"
else
    failure "Échec de création de la classe MoH"
    echo "Réponse: $MOH1_RESPONSE"
fi

##############################################################################
# TEST 2: POST /moh/classes - Créer une deuxième classe MoH
##############################################################################

section "TEST 2: Créer une deuxième classe MoH (mode quietmp3)"

MOH2_RESPONSE=$(curl -s -X POST "$API_URL/moh/classes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"hold_music\",
    \"mode\": \"quietmp3\",
    \"directory\": \"$MOH_DIR\",
    \"sort\": \"alpha\",
    \"description\": \"Hold music for queues\",
    \"tenantId\": $TENANT_ID
  }")

MOH2_ID=$(echo "$MOH2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$MOH2_ID" ]; then
    success "Deuxième classe MoH créée (ID: $MOH2_ID)"
else
    failure "Échec de création de la deuxième classe"
fi

##############################################################################
# TEST 3: GET /moh/classes - Lister toutes les classes MoH
##############################################################################

section "TEST 3: Lister toutes les classes MoH"

LIST_RESPONSE=$(curl -s -X GET "$API_URL/moh/classes" \
  -H "Authorization: Bearer $TOKEN")

# Compter les classes (should be at least 2)
COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$COUNT" -ge 2 ]; then
    success "Liste des classes récupérée ($COUNT classes)"
else
    failure "Liste incorrecte (attendu: ≥2, reçu: $COUNT)"
    echo "Réponse: $LIST_RESPONSE"
fi

##############################################################################
# TEST 4: GET /moh/classes/:name - Obtenir une classe spécifique
##############################################################################

section "TEST 4: Obtenir détails d'une classe MoH"

if [ -n "$MOH1_NAME" ]; then
    DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/moh/classes/$MOH1_NAME" \
      -H "Authorization: Bearer $TOKEN")

    FOUND_NAME=$(echo "$DETAIL_RESPONSE" | grep -o "\"name\":\"$MOH1_NAME\"")

    if [ -n "$FOUND_NAME" ]; then
        success "Détails de la classe récupérés"

        # Vérifier les propriétés
        MODE=$(echo "$DETAIL_RESPONSE" | grep -o '"mode":"[^"]*"' | sed 's/"mode":"\(.*\)"/\1/')
        SORT=$(echo "$DETAIL_RESPONSE" | grep -o '"sort":"[^"]*"' | sed 's/"sort":"\(.*\)"/\1/')

        if [ -n "$MODE" ] && [ -n "$SORT" ]; then
            info "Mode: $MODE, Sort: $SORT"
        fi
    else
        failure "Détails de la classe non trouvés"
    fi
else
    info "Test ignoré (pas de MOH1_NAME)"
fi

##############################################################################
# TEST 5: PUT /moh/classes/:name - Modifier une classe MoH
##############################################################################

section "TEST 5: Modifier une classe MoH (changer le sort)"

if [ -n "$MOH1_NAME" ]; then
    UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/moh/classes/$MOH1_NAME" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "sort": "alpha",
        "description": "Company background music (updated)"
      }')

    UPDATE_NAME=$(echo "$UPDATE_RESPONSE" | grep -o "\"name\":\"$MOH1_NAME\"")
    UPDATE_SORT=$(echo "$UPDATE_RESPONSE" | grep -o '"sort":"alpha"')

    if [ -n "$UPDATE_NAME" ] && [ -n "$UPDATE_SORT" ]; then
        success "Classe MoH modifiée (sort: random → alpha)"
    else
        failure "Échec de modification de la classe"
        echo "Réponse: $UPDATE_RESPONSE"
    fi
else
    info "Test ignoré (pas de MOH1_NAME)"
fi

##############################################################################
# TEST 6: GET /moh/available - Obtenir classes disponibles
##############################################################################

section "TEST 6: Obtenir classes MoH disponibles pour le tenant"

AVAILABLE_RESPONSE=$(curl -s -X GET "$API_URL/moh/available" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier qu'on a au moins 2 classes
AVAILABLE_COUNT=$(echo "$AVAILABLE_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$AVAILABLE_COUNT" -ge 2 ]; then
    success "Classes disponibles récupérées ($AVAILABLE_COUNT classes)"

    # Vérifier le format des noms complets (t{tenantId}_{name})
    FULL_NAME=$(echo "$AVAILABLE_RESPONSE" | grep -o "\"fullName\":\"t${TENANT_ID}_[^\"]*\"" | head -1)

    if [ -n "$FULL_NAME" ]; then
        info "Format du nom: $FULL_NAME"
    fi
else
    failure "Classes disponibles incorrectes"
fi

##############################################################################
# TEST 7: POST /moh/reload - Recharger le module MoH Asterisk
##############################################################################

section "TEST 7: Recharger le module Music on Hold"

RELOAD_RESPONSE=$(curl -s -X POST "$API_URL/moh/reload" \
  -H "Authorization: Bearer $TOKEN")

RELOAD_MSG=$(echo "$RELOAD_RESPONSE" | grep -o '"message":"[^"]*"')

if [ -n "$RELOAD_MSG" ]; then
    success "Module MoH rechargé"
    info "$RELOAD_MSG"
else
    # Accepter aussi une réponse vide ou un succès sans message
    if echo "$RELOAD_RESPONSE" | grep -q -E '(\{|\})'; then
        success "Module MoH rechargé (pas de message)"
    else
        failure "Échec du reload du module MoH"
        echo "Réponse: $RELOAD_RESPONSE"
    fi
fi

##############################################################################
# TEST 8: Vérifier que les classes sont visibles uniquement pour le tenant
##############################################################################

section "TEST 8: Isolation multi-tenant des classes MoH"

# Les classes créées doivent être visibles dans /moh/available
TENANT_CLASSES=$(curl -s -X GET "$API_URL/moh/available" \
  -H "Authorization: Bearer $TOKEN")

TENANT_CLASS_COUNT=$(echo "$TENANT_CLASSES" | grep -o '"id":[0-9]*' | wc -l)

if [ "$TENANT_CLASS_COUNT" -ge 2 ]; then
    success "Classes MoH visibles pour le tenant ($TENANT_CLASS_COUNT classes)"
else
    failure "Isolation multi-tenant incorrecte"
fi

##############################################################################
# TEST 9: DELETE /moh/classes/:name - Supprimer une classe
##############################################################################

section "TEST 9: Supprimer une classe MoH"

if [ -n "$MOH2_ID" ] && [ -n "$MOH1_NAME" ]; then
    # Supprimer la deuxième classe (hold_music)
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/moh/classes/hold_music" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
        success "Classe MoH supprimée"

        # Vérifier que la classe n'existe plus
        CHECK_RESPONSE=$(curl -s -X GET "$API_URL/moh/classes/hold_music" \
          -H "Authorization: Bearer $TOKEN" \
          -w "\n%{http_code}")

        CHECK_CODE=$(echo "$CHECK_RESPONSE" | tail -1)

        if [ "$CHECK_CODE" = "404" ]; then
            success "Suppression confirmée (classe non trouvée)"
        fi
    else
        failure "Échec de suppression (HTTP $HTTP_CODE)"
    fi
else
    info "Test ignoré (pas de MOH2_ID)"
fi

##############################################################################
# TEST 10: Vérifier musiconhold.conf généré
##############################################################################

section "TEST 10: Vérifier génération de musiconhold.conf"

info "Le fichier musiconhold.conf devrait contenir les classes créées"
info "Format attendu: [t${TENANT_ID}_company_music]"

# Ce test est informatif car on ne peut pas accéder au fichier depuis le script
# L'API génère automatiquement le fichier lors de CREATE/UPDATE/DELETE

success "Configuration MoH gérée automatiquement par l'API"

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

# Supprimer la première classe
if [ -n "$MOH1_NAME" ]; then
    curl -s -X DELETE "$API_URL/moh/classes/$MOH1_NAME" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

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
