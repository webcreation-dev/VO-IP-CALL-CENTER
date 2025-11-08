#!/bin/bash

##############################################################################
# Script de test - Module Sounds (Fichiers Audio)
# Teste tous les endpoints de l'API relatifs aux fichiers audio
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3001/api/v1}"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

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
    "name": "test-sounds-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# Vérifier que les fichiers de test existent
if [ ! -f "$FIXTURES_DIR/test-music.wav" ]; then
    failure "Fichier test-music.wav introuvable dans $FIXTURES_DIR"
    exit 1
fi

success "Fichiers de test trouvés"

##############################################################################
# TEST 1: POST /sounds/upload - Upload fichier WAV (MoH)
##############################################################################

section "TEST 1: Upload fichier WAV (catégorie MoH)"

UPLOAD1_RESPONSE=$(curl -s -X POST "$API_URL/sounds/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FIXTURES_DIR/test-music.wav" \
  -F "name=Background Music" \
  -F "category=moh" \
  -F "description=Test music file for MoH" \
  -F "tenantId=$TENANT_ID")

SOUND1_ID=$(echo "$UPLOAD1_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
SOUND1_NAME=$(echo "$UPLOAD1_RESPONSE" | grep -o '"name":"[^"]*"' | sed 's/"name":"\(.*\)"/\1/')

if [ -n "$SOUND1_ID" ]; then
    success "Fichier WAV uploadé (ID: $SOUND1_ID)"
    info "Nom: $SOUND1_NAME"

    # Vérifier la conversion automatique
    CONVERTED=$(echo "$UPLOAD1_RESPONSE" | grep -o '"converted"')
    if [ -n "$CONVERTED" ]; then
        info "Fichiers convertis automatiquement (GSM/ulaw)"
    fi
else
    failure "Échec de l'upload WAV"
    echo "Réponse: $UPLOAD1_RESPONSE"
fi

##############################################################################
# TEST 2: POST /sounds/upload - Upload fichier MP3 (Prompt)
##############################################################################

section "TEST 2: Upload fichier MP3 (catégorie Prompt)"

UPLOAD2_RESPONSE=$(curl -s -X POST "$API_URL/sounds/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FIXTURES_DIR/test-prompt.mp3" \
  -F "name=Test Prompt" \
  -F "category=prompt" \
  -F "description=Test prompt file" \
  -F "tenantId=$TENANT_ID")

SOUND2_ID=$(echo "$UPLOAD2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$SOUND2_ID" ]; then
    success "Fichier MP3 uploadé (ID: $SOUND2_ID)"
else
    failure "Échec de l'upload MP3"
fi

##############################################################################
# TEST 3: POST /sounds/upload - Upload fichier ULAW (Announcement)
##############################################################################

section "TEST 3: Upload fichier ULAW (catégorie Announcement)"

UPLOAD3_RESPONSE=$(curl -s -X POST "$API_URL/sounds/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FIXTURES_DIR/test-announcement.ulaw" \
  -F "name=Test Announcement" \
  -F "category=announcement" \
  -F "description=Test announcement file" \
  -F "tenantId=$TENANT_ID")

SOUND3_ID=$(echo "$UPLOAD3_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$SOUND3_ID" ]; then
    success "Fichier ULAW uploadé (ID: $SOUND3_ID)"
else
    failure "Échec de l'upload ULAW"
fi

##############################################################################
# TEST 4: GET /sounds - Lister tous les fichiers
##############################################################################

section "TEST 4: Lister tous les fichiers audio"

LIST_RESPONSE=$(curl -s -X GET "$API_URL/sounds" \
  -H "Authorization: Bearer $TOKEN")

# Compter les fichiers (should be 3)
COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$COUNT" -ge 3 ]; then
    success "Liste des fichiers récupérée ($COUNT fichiers)"
else
    failure "Liste incorrecte (attendu: 3, reçu: $COUNT)"
    echo "Réponse: $LIST_RESPONSE"
fi

##############################################################################
# TEST 5: GET /sounds?category=moh - Filtrer par catégorie
##############################################################################

section "TEST 5: Filtrer fichiers par catégorie (MoH)"

FILTER_RESPONSE=$(curl -s -X GET "$API_URL/sounds?category=moh" \
  -H "Authorization: Bearer $TOKEN")

MOH_COUNT=$(echo "$FILTER_RESPONSE" | grep -o '"category":"moh"' | wc -l)

if [ "$MOH_COUNT" -ge 1 ]; then
    success "Filtrage par catégorie fonctionne ($MOH_COUNT fichier MoH)"
else
    failure "Filtrage par catégorie ne fonctionne pas"
fi

##############################################################################
# TEST 6: GET /sounds/:id - Obtenir détails d'un fichier
##############################################################################

section "TEST 6: Obtenir détails d'un fichier spécifique"

if [ -n "$SOUND1_ID" ]; then
    DETAIL_RESPONSE=$(curl -s -X GET "$API_URL/sounds/$SOUND1_ID" \
      -H "Authorization: Bearer $TOKEN")

    FOUND_ID=$(echo "$DETAIL_RESPONSE" | grep -o "\"id\":$SOUND1_ID")

    if [ -n "$FOUND_ID" ]; then
        success "Détails du fichier récupérés"

        # Vérifier les métadonnées
        FILENAME=$(echo "$DETAIL_RESPONSE" | grep -o '"filename":"[^"]*"')
        FILESIZE=$(echo "$DETAIL_RESPONSE" | grep -o '"filesize":[0-9]*')

        if [ -n "$FILENAME" ] && [ -n "$FILESIZE" ]; then
            info "Métadonnées: $FILENAME, $FILESIZE"
        fi
    else
        failure "Détails du fichier non trouvés"
    fi
else
    info "Test ignoré (pas de SOUND1_ID)"
fi

##############################################################################
# TEST 7: GET /sounds/:id/download - Télécharger un fichier
##############################################################################

section "TEST 7: Télécharger un fichier audio"

if [ -n "$SOUND1_ID" ]; then
    DOWNLOAD_FILE="/tmp/test-download-$SOUND1_ID.wav"

    curl -s -X GET "$API_URL/sounds/$SOUND1_ID/download" \
      -H "Authorization: Bearer $TOKEN" \
      -o "$DOWNLOAD_FILE" \
      -w "\n%{http_code}" > /tmp/download_status.txt

    HTTP_CODE=$(tail -1 /tmp/download_status.txt)

    if [ "$HTTP_CODE" = "200" ] && [ -f "$DOWNLOAD_FILE" ]; then
        FILE_SIZE=$(stat -f%z "$DOWNLOAD_FILE" 2>/dev/null || stat -c%s "$DOWNLOAD_FILE" 2>/dev/null)

        if [ "$FILE_SIZE" -gt 0 ]; then
            success "Fichier téléchargé ($FILE_SIZE bytes)"
            rm -f "$DOWNLOAD_FILE"
        else
            failure "Fichier téléchargé mais vide"
        fi
    else
        failure "Échec du téléchargement (HTTP $HTTP_CODE)"
    fi
else
    info "Test ignoré (pas de SOUND1_ID)"
fi

##############################################################################
# TEST 8: GET /sounds - Pagination
##############################################################################

section "TEST 8: Pagination de la liste"

PAGE_RESPONSE=$(curl -s -X GET "$API_URL/sounds?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier qu'on a max 2 résultats
PAGE_COUNT=$(echo "$PAGE_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$PAGE_COUNT" -le 2 ]; then
    success "Pagination fonctionne (limite: 2, reçu: $PAGE_COUNT)"
else
    failure "Pagination ne fonctionne pas (attendu: ≤2, reçu: $PAGE_COUNT)"
fi

##############################################################################
# TEST 9: DELETE /sounds/:id - Supprimer un fichier
##############################################################################

section "TEST 9: Supprimer un fichier audio"

if [ -n "$SOUND2_ID" ]; then
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/sounds/$SOUND2_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
        success "Fichier supprimé"

        # Vérifier que le fichier n'existe plus
        CHECK_RESPONSE=$(curl -s -X GET "$API_URL/sounds/$SOUND2_ID" \
          -H "Authorization: Bearer $TOKEN" \
          -w "\n%{http_code}")

        CHECK_CODE=$(echo "$CHECK_RESPONSE" | tail -1)

        if [ "$CHECK_CODE" = "404" ]; then
            success "Suppression confirmée (fichier non trouvé)"
        fi
    else
        failure "Échec de suppression (HTTP $HTTP_CODE)"
    fi
else
    info "Test ignoré (pas de SOUND2_ID)"
fi

##############################################################################
# CLEANUP - Supprimer les ressources de test
##############################################################################

section "CLEANUP - Suppression des ressources"

# Supprimer les fichiers restants
if [ -n "$SOUND1_ID" ]; then
    curl -s -X DELETE "$API_URL/sounds/$SOUND1_ID" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

if [ -n "$SOUND3_ID" ]; then
    curl -s -X DELETE "$API_URL/sounds/$SOUND3_ID" \
      -H "Authorization: Bearer $TOKEN" > /dev/null
fi

# Supprimer le tenant (cascade delete)
curl -s -X DELETE "$API_URL/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

# Cleanup fichiers temporaires
rm -f /tmp/download_status.txt

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
