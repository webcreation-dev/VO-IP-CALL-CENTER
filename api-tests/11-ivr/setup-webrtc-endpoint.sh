#!/bin/bash

##############################################################################
# Script de création d'endpoint WebRTC pour test IVR
# Usage: ./setup-webrtc-endpoint.sh "YOUR_JWT_TOKEN" TENANT_ID [ENDPOINT_NUMBER]
# Crée un endpoint PJSIP avec transport WebSocket (WSS)
##############################################################################

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Vérifier les paramètres
if [ -z "$1" ] || [ -z "$2" ]; then
    failure "Paramètres requis manquants" "Usage: ./setup-webrtc-endpoint.sh \"TOKEN\" TENANT_ID [ENDPOINT_NUMBER]"
fi

TOKEN="$1"
TENANT_ID="$2"
ENDPOINT_NUMBER="${3:-200}"  # Par défaut: 200

# Générer un mot de passe sécurisé
PASSWORD="webrtc${ENDPOINT_NUMBER}"

section "🌐 Création Endpoint WebRTC - $(date)"

##############################################################################
# ÉTAPE 1: Vérifier que le transport WSS existe
##############################################################################
info "Vérification du transport WebSocket (WSS)..."
echo -e "${CYAN}Note: Le transport 'transport-wss' doit être configuré dans Asterisk${NC}"
echo -e "${CYAN}Pour vérifier: docker exec -it asterisk asterisk -rx \"pjsip show transports\"${NC}"
echo ""

##############################################################################
# ÉTAPE 2: Créer l'endpoint WebRTC
##############################################################################
section "1️⃣  Création de l'endpoint PJSIP"

info "Création de l'endpoint $ENDPOINT_NUMBER avec transport WSS..."
ENDPOINT_RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"password\": \"$PASSWORD\",
    \"displayName\": \"WebRTC Test $ENDPOINT_NUMBER\",
    \"transport\": \"transport-wss\",
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID,
    \"codecs\": \"opus,ulaw,alaw\"
  }")

# Extraire l'ID de l'endpoint
ENDPOINT_ID=$(echo "$ENDPOINT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$ENDPOINT_ID" ]; then
    failure "Impossible de créer l'endpoint" "$ENDPOINT_RESPONSE"
fi

success "Endpoint créé avec ID: $ENDPOINT_ID"

##############################################################################
# ÉTAPE 3: Afficher les informations de connexion
##############################################################################
section "2️⃣  Informations de connexion WebRTC"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ENDPOINT WEBRTC CRÉÉ AVEC SUCCÈS             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Paramètres de connexion pour votre softphone:"
echo ""
echo "   • Username (SIP URI):  $ENDPOINT_NUMBER"
echo "   • Password:            $PASSWORD"
echo "   • Display Name:        WebRTC Test $ENDPOINT_NUMBER"
echo "   • Domain/Server:       [VOTRE_IP_VPS]"
echo "   • WebSocket URL:       wss://[VOTRE_IP_VPS]:8089/ws"
echo "   • Transport:           WSS (WebSocket Secure)"
echo "   • Tenant ID:           $TENANT_ID"
echo ""

##############################################################################
# ÉTAPE 4: Configuration pour différents softphones
##############################################################################
section "3️⃣  Configuration par softphone"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📱 JSSIP (Web Browser)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Configuration JavaScript:"
echo ""
cat <<'EOF'
const socket = new JsSIP.WebSocketInterface('wss://VOTRE_IP:8089/ws');
const configuration = {
  sockets: [socket],
  uri: 'sip:200@VOTRE_IP',
  password: 'webrtc200',
  display_name: 'WebRTC Test 200'
};
const ua = new JsSIP.UA(configuration);
ua.start();
EOF
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📱 MicroSIP (Windows)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   1. Account > Add Account"
echo "   2. SIP Server: VOTRE_IP:8089"
echo "   3. SIP Proxy: wss://VOTRE_IP:8089/ws"
echo "   4. Username: $ENDPOINT_NUMBER"
echo "   5. Password: $PASSWORD"
echo "   6. Transport: WSS"
echo "   7. Cocher 'Enable WebRTC'"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📱 Zoiper 5 (Multi-platform)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   1. Settings > Accounts > Add Account"
echo "   2. Type: SIP"
echo "   3. Username: $ENDPOINT_NUMBER"
echo "   4. Password: $PASSWORD"
echo "   5. Domain: VOTRE_IP"
echo "   6. Advanced > Transport: WSS"
echo "   7. Advanced > WebSocket Server: wss://VOTRE_IP:8089/ws"
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📱 Linphone (Mobile/Desktop)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "   1. Préférences > Comptes > Ajouter"
echo "   2. Nom d'utilisateur: $ENDPOINT_NUMBER"
echo "   3. Mot de passe: $PASSWORD"
echo "   4. Domaine: VOTRE_IP"
echo "   5. Transport: WSS"
echo "   6. Proxy: wss://VOTRE_IP:8089/ws"
echo ""

##############################################################################
# ÉTAPE 5: Vérification dans Asterisk
##############################################################################
section "4️⃣  Vérification dans Asterisk"

echo -e "${YELLOW}Après avoir enregistré votre softphone, vérifiez:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show endpoints\"${NC}"
echo ""
echo "   → L'endpoint '$ENDPOINT_NUMBER' doit apparaître avec Status: Available"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show endpoint $ENDPOINT_NUMBER\"${NC}"
echo ""
echo "   → Détails de l'endpoint (transport, contacts, etc.)"
echo ""

##############################################################################
# ÉTAPE 6: Test de l'IVR
##############################################################################
section "5️⃣  Test de l'IVR"

echo -e "${YELLOW}Pour tester l'IVR:${NC}"
echo ""
echo "1. Enregistrez votre softphone avec les credentials ci-dessus"
echo ""
echo "2. Vérifiez l'enregistrement:"
echo -e "   ${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show contacts\"${NC}"
echo ""
echo "3. Appelez le DID configuré: ${GREEN}+33123456789${NC}"
echo ""
echo "4. Vous devriez entendre le message d'accueil IVR"
echo ""
echo "5. Appuyez sur 1 pour être transféré à la queue 'sales'"
echo ""
echo "6. Surveillez les logs:"
echo -e "   ${GREEN}docker logs -f asterisk-api-v2 | grep IVR${NC}"
echo ""

##############################################################################
# ÉTAPE 7: Créer un deuxième endpoint pour répondre
##############################################################################
section "6️⃣  Créer un agent pour répondre (optionnel)"

echo -e "${CYAN}Pour tester complètement, créez un 2ème endpoint:${NC}"
echo ""
echo -e "${GREEN}./setup-webrtc-endpoint.sh \"$TOKEN\" $TENANT_ID 201${NC}"
echo ""
echo "Ensuite, ajoutez l'endpoint 201 comme membre de la queue:"
echo ""
echo -e "${GREEN}curl -X POST \"$API_URL/queue-members\" \\
  -H \"Authorization: Bearer $TOKEN\" \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"queue_name\": \"sales\",
    \"interface\": \"PJSIP/201\",
    \"penalty\": 0,
    \"tenantId\": $TENANT_ID
  }'${NC}"
echo ""

##############################################################################
# ÉTAPE 8: Dépannage
##############################################################################
section "7️⃣  Dépannage WebRTC"

echo -e "${RED}❌ Si l'enregistrement échoue:${NC}"
echo ""
echo "1. Vérifiez que le transport WSS est actif:"
echo -e "   ${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show transports\"${NC}"
echo ""
echo "2. Vérifiez les logs Asterisk:"
echo -e "   ${GREEN}docker logs asterisk | grep -i webrtc${NC}"
echo ""
echo "3. Vérifiez les certificats DTLS:"
echo -e "   ${GREEN}docker exec -it asterisk ls -lh /etc/asterisk/keys/${NC}"
echo ""
echo "4. Vérifiez les ports ouverts sur le VPS:"
echo "   • Port 8089 (WSS) doit être ouvert"
echo "   • Ports RTP 10000-20000 (UDP) doivent être ouverts"
echo ""
echo "5. Si vous utilisez un firewall (ufw, iptables):"
echo -e "   ${GREEN}sudo ufw allow 8089/tcp${NC}"
echo -e "   ${GREEN}sudo ufw allow 10000:20000/udp${NC}"
echo ""

##############################################################################
# RÉSUMÉ FINAL
##############################################################################
section "✅ ENDPOINT WEBRTC CRÉÉ"

echo ""
echo "📋 Résumé:"
echo "   • Endpoint ID:    $ENDPOINT_ID"
echo "   • Username:       $ENDPOINT_NUMBER"
echo "   • Password:       $PASSWORD"
echo "   • Transport:      transport-wss"
echo "   • Tenant ID:      $TENANT_ID"
echo ""
echo "🎯 Prochaines étapes:"
echo "   1. Configurez votre softphone WebRTC"
echo "   2. Vérifiez l'enregistrement dans Asterisk"
echo "   3. Appelez le DID: +33123456789"
echo "   4. Testez les options IVR (appuyer sur 1 ou 2)"
echo ""
echo -e "${GREEN}Bon test! 🚀${NC}"
echo ""
