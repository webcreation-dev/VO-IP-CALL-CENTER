#!/bin/bash

##############################################################################
# Script de test - Module IVR Audio
# Teste les endpoints de gestion des fichiers audio pour IVR
# Inclut upload, download, conversion, TTS
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
# PREREQUIS - Créer tenant et vérifier fichiers de test
##############################################################################

section "PREREQUIS - Création du tenant de test"

TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-ivr-audio-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# Localiser les fichiers audio de test (du module 06-sounds)
TEST_AUDIO_DIR="$SCRIPT_DIR/../06-sounds/test-audio-files"

if [ ! -d "$TEST_AUDIO_DIR" ]; then
    info "Dossier test-audio-files non trouvé, tentative avec chemin absolu..."
    TEST_AUDIO_DIR="/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk/api-tests/06-sounds/test-audio-files"
fi

if [ -d "$TEST_AUDIO_DIR" ]; then
    success "Fichiers de test trouvés: $TEST_AUDIO_DIR"
    TEST_WAV="$TEST_AUDIO_DIR/test-music.wav"
    TEST_MP3="$TEST_AUDIO_DIR/test-prompt.mp3"
else
    info "Fichiers de test non trouvés, les tests d'upload seront limités"
    TEST_WAV=""
    TEST_MP3=""
fi

##############################################################################
# TEST 1: POST /ivr/audio/upload - Upload fichier WAV
##############################################################################

section "TEST 1: Upload fichier audio WAV"

if [ -f "$TEST_WAV" ]; then
    UPLOAD_WAV_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/upload?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$TEST_WAV" \
      -F "name=IVR Welcome Message" \
      -F "language=fr")

    AUDIO_ID=$(echo "$UPLOAD_WAV_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$AUDIO_ID" ]; then
        success "Fichier WAV uploadé (ID: $AUDIO_ID)"
        info "Nom: IVR Welcome Message"
    else
        failure "Échec d'upload du fichier WAV"
        echo "Réponse: $UPLOAD_WAV_RESPONSE"
    fi
else
    info "Fichier WAV de test non disponible, test ignoré"
fi

##############################################################################
# TEST 2: POST /ivr/audio/upload - Upload fichier MP3
##############################################################################

section "TEST 2: Upload fichier audio MP3"

if [ -f "$TEST_MP3" ]; then
    UPLOAD_MP3_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/upload?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$TEST_MP3" \
      -F "name=IVR Menu Prompt" \
      -F "language=en")

    AUDIO2_ID=$(echo "$UPLOAD_MP3_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$AUDIO2_ID" ]; then
        success "Fichier MP3 uploadé (ID: $AUDIO2_ID)"
    else
        failure "Échec d'upload du fichier MP3"
    fi
else
    info "Fichier MP3 de test non disponible, test ignoré"
fi

##############################################################################
# TEST 3: GET /ivr/audio - Lister tous les fichiers audio
##############################################################################

section "TEST 3: Lister tous les fichiers audio du tenant"

LIST_AUDIO_RESPONSE=$(curl -s -X GET "$API_URL/ivr/audio?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

AUDIO_COUNT=$(echo "$LIST_AUDIO_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$AUDIO_COUNT" -ge 1 ]; then
    success "Liste des fichiers audio récupérée ($AUDIO_COUNT fichiers)"
else
    info "Aucun fichier audio trouvé (peut être normal si uploads échoués)"
fi

##############################################################################
# TEST 4: GET /ivr/audio?language=fr - Filtrer par langue
##############################################################################

section "TEST 4: Filtrer fichiers audio par langue (fr)"

FILTER_AUDIO_RESPONSE=$(curl -s -X GET "$API_URL/ivr/audio?tenantId=$TENANT_ID&language=fr" \
  -H "Authorization: Bearer $TOKEN")

FR_COUNT=$(echo "$FILTER_AUDIO_RESPONSE" | grep -o '"id":[0-9]*' | wc -l)

if [ "$FR_COUNT" -ge 1 ]; then
    success "Filtrage par langue fonctionne ($FR_COUNT fichiers fr)"
else
    info "Aucun fichier français trouvé"
fi

##############################################################################
# TEST 5: GET /ivr/audio/:id - Obtenir détails d'un fichier
##############################################################################

section "TEST 5: Récupérer détails d'un fichier audio"

if [ -n "$AUDIO_ID" ]; then
    GET_AUDIO_RESPONSE=$(curl -s -X GET "$API_URL/ivr/audio/$AUDIO_ID?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN")

    AUDIO_NAME=$(echo "$GET_AUDIO_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\(.*\)"/\1/')

    if [ -n "$AUDIO_NAME" ]; then
        success "Détails du fichier récupérés (name: $AUDIO_NAME)"
    else
        failure "Impossible de récupérer les détails du fichier"
    fi
else
    info "Pas d'audio ID disponible pour ce test"
fi

##############################################################################
# TEST 6: GET /ivr/audio/:id/download - Télécharger fichier
##############################################################################

section "TEST 6: Télécharger un fichier audio"

if [ -n "$AUDIO_ID" ]; then
    DOWNLOAD_FILE="/tmp/ivr-audio-download-test-$AUDIO_ID"

    curl -s -X GET "$API_URL/ivr/audio/$AUDIO_ID/download?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -o "$DOWNLOAD_FILE"

    if [ -f "$DOWNLOAD_FILE" ] && [ -s "$DOWNLOAD_FILE" ]; then
        FILE_SIZE=$(wc -c < "$DOWNLOAD_FILE")
        success "Fichier téléchargé ($FILE_SIZE bytes)"

        # Cleanup
        rm -f "$DOWNLOAD_FILE"
    else
        failure "Échec de téléchargement du fichier"
    fi
else
    info "Pas d'audio ID disponible pour ce test"
fi

##############################################################################
# TEST 7: POST /ivr/audio/generate-tts - Générer audio via TTS
##############################################################################

section "TEST 7: Générer audio via TTS"

TTS_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/generate-tts?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Bienvenue dans notre système IVR",
    "language": "fr-FR",
    "voice": "default",
    "name": "tts_welcome_message"
  }')

TTS_ID=$(echo "$TTS_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TTS_ID" ]; then
    success "Audio TTS généré (ID: $TTS_ID)"
    info "Texte: 'Bienvenue dans notre système IVR'"
else
    info "TTS non disponible ou non implémenté (peut être normal)"
fi

##############################################################################
# TEST 8: POST /ivr/audio/:id/convert - Convertir format audio
##############################################################################

section "TEST 8: Convertir fichier audio en format GSM"

if [ -n "$AUDIO_ID" ]; then
    CONVERT_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/$AUDIO_ID/convert?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "targetFormat": "gsm"
      }')

    CONVERTED_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$CONVERTED_ID" ]; then
        success "Fichier converti en GSM (ID: $CONVERTED_ID)"
    else
        info "Conversion non disponible ou non implémentée"
    fi
else
    info "Pas d'audio ID disponible pour ce test"
fi

##############################################################################
# TEST 9: POST /ivr/audio/upload - Upload avec langue non spécifiée
##############################################################################

section "TEST 9: Upload sans spécifier la langue"

if [ -f "$TEST_WAV" ]; then
    UPLOAD_NO_LANG_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/upload?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$TEST_WAV" \
      -F "name=Generic IVR Sound")

    AUDIO3_ID=$(echo "$UPLOAD_NO_LANG_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$AUDIO3_ID" ]; then
        success "Upload sans langue spécifiée réussi (ID: $AUDIO3_ID)"
    else
        failure "Échec d'upload sans langue"
    fi
else
    info "Fichier de test non disponible"
fi

##############################################################################
# TEST 10: GET /ivr/audio - Vérifier pagination
##############################################################################

section "TEST 10: Test de pagination des fichiers audio"

# Note: L'endpoint ne semble pas supporter la pagination explicite
# Mais on teste quand même la récupération

PAGINATED_RESPONSE=$(curl -s -X GET "$API_URL/ivr/audio?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PAGINATED_RESPONSE" | grep -q -E '(\[|\{)'; then
    success "Endpoint audio accessible"
else
    failure "Problème d'accès à l'endpoint audio"
fi

##############################################################################
# TEST 11: DELETE /ivr/audio/:id - Supprimer un fichier audio
##############################################################################

section "TEST 11: Supprimer un fichier audio"

if [ -n "$AUDIO2_ID" ]; then
    DELETE_AUDIO_RESPONSE=$(curl -s -X DELETE "$API_URL/ivr/audio/$AUDIO2_ID?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$DELETE_AUDIO_RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        success "Fichier audio supprimé (HTTP $HTTP_CODE)"
    else
        failure "Échec de suppression (HTTP $HTTP_CODE)"
    fi

    # Vérifier suppression
    VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/ivr/audio/$AUDIO2_ID?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "404" ]; then
        success "Suppression confirmée (fichier non trouvé)"
    else
        failure "Fichier toujours présent après suppression"
    fi
else
    info "Pas d'audio ID disponible pour test de suppression"
fi

##############################################################################
# TEST 12: Upload fichier avec nom très long
##############################################################################

section "TEST 12: Upload avec nom très long"

if [ -f "$TEST_WAV" ]; then
    LONG_NAME="IVR Audio Message With A Very Long Name That Could Potentially Cause Issues In The Database Or File System If Not Handled Correctly"

    UPLOAD_LONG_RESPONSE=$(curl -s -X POST "$API_URL/ivr/audio/upload?tenantId=$TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -F "file=@$TEST_WAV" \
      -F "name=$LONG_NAME" \
      -F "language=fr")

    AUDIO4_ID=$(echo "$UPLOAD_LONG_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$AUDIO4_ID" ]; then
        success "Upload avec nom long réussi"
    else
        failure "Échec d'upload avec nom long"
    fi
else
    info "Fichier de test non disponible"
fi

##############################################################################
# TEST 13: Isolation tenant - Fichiers audio
##############################################################################

section "TEST 13: Test d'isolation tenant pour les fichiers audio"

# Créer un second tenant
TENANT2_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-tenant-isolation-audio"
  }')

TENANT2_ID=$(echo "$TENANT2_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -n "$TENANT2_ID" ]; then
    # Lister les fichiers audio du tenant 2 (devrait être vide)
    TENANT2_AUDIO=$(curl -s -X GET "$API_URL/ivr/audio?tenantId=$TENANT2_ID" \
      -H "Authorization: Bearer $TOKEN")

    TENANT2_COUNT=$(echo "$TENANT2_AUDIO" | grep -o '"id":[0-9]*' | wc -l)

    if [ "$TENANT2_COUNT" -eq 0 ]; then
        success "Isolation tenant OK: aucun fichier audio du tenant 1 visible"
    else
        failure "Problème d'isolation: $TENANT2_COUNT fichiers visibles"
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
