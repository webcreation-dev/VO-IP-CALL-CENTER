#!/bin/bash

##############################################################################
# Script de configuration automatique IVR pour test
# Usage: ./setup-ivr-test.sh "YOUR_JWT_TOKEN"
# Crée: tenant, queue, audio TTS, menu IVR, options, DID mapping
##############################################################################

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un message d'échec
failure() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
    echo -e "${RED}   Détails: $2${NC}"
    exit 1
}

# Fonction pour afficher un message d'information
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher un titre de section
section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

# Vérifier le token
if [ -z "$1" ]; then
    failure "Token JWT requis" "Usage: ./setup-ivr-test.sh \"YOUR_JWT_TOKEN\""
fi

TOKEN="$1"

# Timestamp pour rendre les noms uniques
TIMESTAMP=$(date +%s)

# Fichier de sauvegarde de la configuration
CONFIG_FILE="$SCRIPT_DIR/ivr-test-config-$TIMESTAMP.json"

section "🚀 Configuration IVR automatique - $(date)"

##############################################################################
# ÉTAPE 1: Créer un tenant de test
##############################################################################
section "1️⃣  Création du tenant"

info "Création du tenant 'ivr-test-tenant-$TIMESTAMP'..."
TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"ivr-test-tenant-$TIMESTAMP\"}")

# Extraire l'ID du tenant
TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant" "$TENANT_RESPONSE"
fi

success "Tenant créé avec ID: $TENANT_ID"

##############################################################################
# ÉTAPE 2: Créer une queue "sales"
##############################################################################
section "2️⃣  Création de la queue"

info "Création de la queue 'sales'..."
QUEUE_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"sales\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"retry\": 5,
    \"weight\": 0,
    \"max_len\": 0,
    \"announce_frequency\": 0,
    \"announce_holdtime\": \"no\",
    \"announce_position\": \"yes\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_NAME=$(echo "$QUEUE_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$QUEUE_NAME" ]; then
    failure "Impossible de créer la queue" "$QUEUE_RESPONSE"
fi

success "Queue créée: $QUEUE_NAME"

##############################################################################
# ÉTAPE 3: Générer les fichiers audio via TTS
##############################################################################
section "3️⃣  Génération des fichiers audio (TTS)"

# Audio 1: Welcome
info "Génération audio 'welcome'..."
WELCOME_AUDIO=$(curl -s -X POST "$API_URL/ivr/audio/generate-tts?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bienvenue dans notre système I V R. Appuyez sur 1 pour le service commercial, ou appuyez sur 2 pour le support technique.",
    "name": "welcome",
    "language": "fr-FR",
    "voice": "fr-FR-Standard-A"
  }')

WELCOME_ID=$(echo "$WELCOME_AUDIO" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$WELCOME_ID" ]; then
    failure "Impossible de générer l'audio welcome" "$WELCOME_AUDIO"
fi

success "Audio 'welcome' généré (ID: $WELCOME_ID)"

# Audio 2: Invalid
info "Génération audio 'invalid'..."
INVALID_AUDIO=$(curl -s -X POST "$API_URL/ivr/audio/generate-tts?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Option invalide. Veuillez réessayer.",
    "name": "invalid",
    "language": "fr-FR",
    "voice": "fr-FR-Standard-A"
  }')

INVALID_ID=$(echo "$INVALID_AUDIO" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$INVALID_ID" ]; then
    failure "Impossible de générer l'audio invalid" "$INVALID_AUDIO"
fi

success "Audio 'invalid' généré (ID: $INVALID_ID)"

# Audio 3: Timeout
info "Génération audio 'timeout'..."
TIMEOUT_AUDIO=$(curl -s -X POST "$API_URL/ivr/audio/generate-tts?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Nous n avons pas reçu votre choix. Veuillez réessayer.",
    "name": "timeout",
    "language": "fr-FR",
    "voice": "fr-FR-Standard-A"
  }')

TIMEOUT_ID=$(echo "$TIMEOUT_AUDIO" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$TIMEOUT_ID" ]; then
    failure "Impossible de générer l'audio timeout" "$TIMEOUT_AUDIO"
fi

success "Audio 'timeout' généré (ID: $TIMEOUT_ID)"

##############################################################################
# ÉTAPE 4: Créer le menu IVR
##############################################################################
section "4️⃣  Création du menu IVR"

info "Création du menu 'main_menu'..."
MENU_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"main_menu\",
    \"description\": \"Menu principal IVR test\",
    \"welcome_sound\": \"welcome\",
    \"invalid_sound\": \"invalid\",
    \"timeout_sound\": \"timeout\",
    \"timeout\": 5,
    \"max_retries\": 3,
    \"max_digits\": 1,
    \"timeout_action\": {
      \"type\": \"playback\",
      \"sounds\": [\"timeout\"],
      \"then\": {\"type\": \"repeat\"}
    },
    \"invalid_action\": {
      \"type\": \"playback\",
      \"sounds\": [\"invalid\"],
      \"then\": {\"type\": \"repeat\"}
    }
  }")

MENU_ID=$(echo "$MENU_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$MENU_ID" ]; then
    failure "Impossible de créer le menu IVR" "$MENU_RESPONSE"
fi

success "Menu IVR créé avec ID: $MENU_ID"

##############################################################################
# ÉTAPE 5: Ajouter les options au menu
##############################################################################
section "5️⃣  Ajout des options au menu"

# Option 1: Queue Sales
info "Ajout option '1' → Queue Sales..."
OPTION1_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/options?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"digit\": \"1\",
    \"description\": \"Service commercial\",
    \"action\": {
      \"type\": \"queue\",
      \"target\": \"sales\"
    },
    \"priority\": 1,
    \"is_active\": true
  }")

OPTION1_ID=$(echo "$OPTION1_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$OPTION1_ID" ]; then
    failure "Impossible d'ajouter l'option 1" "$OPTION1_RESPONSE"
fi

success "Option '1' ajoutée (ID: $OPTION1_ID)"

# Option 2: Queue Support (optionnel - on la crée aussi)
info "Création queue 'support' pour option 2..."
SUPPORT_QUEUE=$(curl -s -X POST "$API_URL/queues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"support\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"tenantId\": $TENANT_ID
  }")

info "Ajout option '2' → Queue Support..."
OPTION2_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/options?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"digit\": \"2\",
    \"description\": \"Support technique\",
    \"action\": {
      \"type\": \"queue\",
      \"target\": \"support\"
    },
    \"priority\": 2,
    \"is_active\": true
  }")

OPTION2_ID=$(echo "$OPTION2_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$OPTION2_ID" ]; then
    echo -e "${YELLOW}⚠️  Option '2' non créée (non bloquant)${NC}"
else
    success "Option '2' ajoutée (ID: $OPTION2_ID)"
fi

##############################################################################
# ÉTAPE 6: Mapper un DID au menu
##############################################################################
section "6️⃣  Mapping DID → Menu IVR"

DID_NUMBER="+33123456789"
info "Mapping DID $DID_NUMBER → Menu $MENU_ID..."

DID_MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"did\": \"$DID_NUMBER\",
    \"menu_id\": $MENU_ID,
    \"is_active\": true,
    \"description\": \"Test IVR - DID principal\"
  }")

DID_MAPPING_ID=$(echo "$DID_MAPPING_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$DID_MAPPING_ID" ]; then
    failure "Impossible de mapper le DID" "$DID_MAPPING_RESPONSE"
fi

success "DID mappé: $DID_NUMBER → Menu $MENU_ID"

##############################################################################
# ÉTAPE 7: Valider la configuration
##############################################################################
section "7️⃣  Validation de la configuration"

info "Validation du menu IVR..."
VALIDATION_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$MENU_ID/validate?tenantId=$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$VALIDATION_RESPONSE" | grep -q '"valid":true'; then
    success "Configuration IVR valide ✓"
else
    echo -e "${YELLOW}⚠️  Avertissements de validation:${NC}"
    echo "$VALIDATION_RESPONSE"
fi

##############################################################################
# ÉTAPE 8: Sauvegarder la configuration
##############################################################################
section "8️⃣  Sauvegarde de la configuration"

cat > "$CONFIG_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "tenant_id": $TENANT_ID,
  "tenant_name": "ivr-test-tenant-$TIMESTAMP",
  "queue_sales": "sales",
  "queue_support": "support",
  "menu_id": $MENU_ID,
  "menu_name": "main_menu",
  "did": "$DID_NUMBER",
  "did_mapping_id": $DID_MAPPING_ID,
  "audio_files": {
    "welcome": $WELCOME_ID,
    "invalid": $INVALID_ID,
    "timeout": $TIMEOUT_ID
  },
  "options": {
    "option_1": $OPTION1_ID,
    "option_2": $OPTION2_ID
  },
  "api_url": "$API_URL"
}
EOF

success "Configuration sauvegardée dans: $CONFIG_FILE"

##############################################################################
# RÉSUMÉ FINAL
##############################################################################
section "✅ CONFIGURATION TERMINÉE"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║        CONFIGURATION IVR CRÉÉE AVEC SUCCÈS            ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Détails de la configuration:"
echo "   • TENANT_ID:      $TENANT_ID"
echo "   • TENANT_NAME:    ivr-test-tenant-$TIMESTAMP"
echo "   • MENU_ID:        $MENU_ID"
echo "   • DID:            $DID_NUMBER"
echo "   • QUEUE SALES:    sales"
echo "   • QUEUE SUPPORT:  support"
echo ""
echo "🎵 Fichiers audio générés:"
echo "   • welcome (ID: $WELCOME_ID)"
echo "   • invalid (ID: $INVALID_ID)"
echo "   • timeout (ID: $TIMEOUT_ID)"
echo ""
echo "🔢 Options IVR:"
echo "   • Touche 1 → Queue 'sales'"
echo "   • Touche 2 → Queue 'support'"
echo ""
echo "📁 Configuration sauvegardée:"
echo "   $CONFIG_FILE"
echo ""
echo "🔍 Prochaines étapes:"
echo "   1. Exécutez: ./verify-ivr-asterisk.sh $TENANT_ID"
echo "   2. Vérifiez la config dans Asterisk"
echo "   3. Créez un endpoint WebRTC: ./setup-webrtc-endpoint.sh \"$TOKEN\" $TENANT_ID"
echo "   4. Testez en appelant le DID: $DID_NUMBER"
echo ""
