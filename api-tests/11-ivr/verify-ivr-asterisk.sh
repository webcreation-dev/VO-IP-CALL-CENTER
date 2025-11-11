#!/bin/bash

##############################################################################
# Script de vérification Asterisk pour IVR
# Usage: ./verify-ivr-asterisk.sh [TENANT_ID]
# Affiche les commandes à exécuter dans Asterisk CLI pour vérifier la config
##############################################################################

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TENANT_ID=${1:-1}

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     VÉRIFICATION ASTERISK - CONFIGURATION IVR         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

##############################################################################
# SECTION 1: Vérification des Queues
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}1️⃣  VÉRIFICATION DES QUEUES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande dans Asterisk CLI:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"queue show\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • sales (0 calls) - stratégie: ringall"
echo "   • support (0 calls) - stratégie: ringall"
echo ""
echo -e "${YELLOW}Si les queues n'apparaissent pas:${NC}"
echo "   → Les queues ne sont peut-être pas chargées dans Asterisk"
echo "   → Vérifiez les logs: docker logs asterisk | grep queue"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 2: Vérification Stasis Application
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}2️⃣  VÉRIFICATION STASIS APP (IVR)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"stasis show apps\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • App: ivr-app"
echo "   • Debug: No"
echo "   • Subscription count: 0 (normal si pas d'appels actifs)"
echo ""
echo -e "${YELLOW}Si 'ivr-app' n'apparaît pas:${NC}"
echo "   → L'API n'est pas connectée à ARI"
echo "   → Vérifiez: docker logs asterisk-api-v2 | grep ARI"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 3: Vérification des Contextes
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}3️⃣  VÉRIFICATION DES CONTEXTES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"dialplan show t${TENANT_ID}_default\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • Context 't${TENANT_ID}_default' avec des extensions"
echo "   • Exten: _X. ou similaire"
echo ""
echo -e "${YELLOW}Si le contexte n'existe pas:${NC}"
echo "   → Le tenant n'a pas de contexte configuré"
echo "   → Vérifiez la création du tenant dans l'API"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 4: Vérification ARI Connection
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}4️⃣  VÉRIFICATION CONNEXION ARI${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"http show status\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • HTTP Server Status: Enabled"
echo "   • Prefix: (vide ou /)"
echo "   • Server Enabled and Bound to 0.0.0.0:8088"
echo ""
echo -e "${YELLOW}Alternative - vérifier les connexions WebSocket:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"ari show users\"${NC}"
echo ""
echo "   → Devrait afficher les users ARI (asterisk/asterisk)"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 5: Vérification des Fichiers Audio
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}5️⃣  VÉRIFICATION FICHIERS AUDIO${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk ls -lh /var/lib/asterisk/sounds/ivr/${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • welcome_*.wav (fichier audio d'accueil)"
echo "   • invalid_*.wav (message option invalide)"
echo "   • timeout_*.wav (message timeout)"
echo ""
echo -e "${YELLOW}Si les fichiers n'existent pas:${NC}"
echo "   → Le TTS n'a pas fonctionné"
echo "   → Vérifiez les logs API: docker logs asterisk-api-v2 | grep TTS"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 6: Vérification Endpoints PJSIP
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}6️⃣  VÉRIFICATION ENDPOINTS PJSIP${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show endpoints\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • Liste des endpoints configurés"
echo "   • Status: Unavailable (si non enregistré) ou Available"
echo ""
echo -e "${YELLOW}Pour voir un endpoint spécifique:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show endpoint <ENDPOINT_ID>\"${NC}"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 7: Vérification Transports (WebRTC)
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}7️⃣  VÉRIFICATION TRANSPORTS WEBSOCKET${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Tapez cette commande:${NC}"
echo ""
echo -e "${GREEN}docker exec -it asterisk asterisk -rx \"pjsip show transports\"${NC}"
echo ""
echo -e "${YELLOW}Ce que vous devriez voir:${NC}"
echo "   • transport-udp: UDP (0.0.0.0:5060)"
echo "   • transport-tcp: TCP (0.0.0.0:5060)"
echo "   • transport-wss: WSS (0.0.0.0:8089) ← Important pour WebRTC!"
echo ""
echo -e "${YELLOW}Si transport-wss est absent:${NC}"
echo "   → WebRTC ne fonctionnera pas"
echo "   → Vérifiez la config PJSIP: /etc/asterisk/pjsip.conf"
echo ""
read -p "Appuyez sur Entrée pour continuer..."
echo ""

##############################################################################
# SECTION 8: Test Logs en Temps Réel
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}8️⃣  SURVEILLANCE LOGS TEMPS RÉEL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Pour surveiller les logs Asterisk en temps réel:${NC}"
echo ""
echo -e "${GREEN}docker logs -f asterisk${NC}"
echo ""
echo -e "${CYAN}Pour surveiller les logs de l'API (IVR Orchestrator):${NC}"
echo ""
echo -e "${GREEN}docker logs -f asterisk-api-v2${NC}"
echo ""
echo -e "${CYAN}Pour voir uniquement les logs IVR:${NC}"
echo ""
echo -e "${GREEN}docker logs -f asterisk-api-v2 | grep IVR${NC}"
echo ""
echo ""

##############################################################################
# SECTION 9: Commandes de Diagnostic Avancées
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}9️⃣  COMMANDES DIAGNOSTIC AVANCÉES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Vérifier la base de données PostgreSQL:${NC}"
echo ""
echo -e "${GREEN}PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -c \"SELECT id, name FROM ivr_menus WHERE tenant_id = $TENANT_ID;\"${NC}"
echo ""
echo -e "${YELLOW}Vérifier les options IVR:${NC}"
echo ""
echo -e "${GREEN}PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -c \"SELECT digit, description, action FROM ivr_options WHERE tenant_id = $TENANT_ID;\"${NC}"
echo ""
echo -e "${YELLOW}Vérifier le DID mapping:${NC}"
echo ""
echo -e "${GREEN}PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -c \"SELECT did, menu_id, is_active FROM ivr_did_mappings WHERE tenant_id = $TENANT_ID;\"${NC}"
echo ""
echo ""

##############################################################################
# RÉSUMÉ CHECKLIST
##############################################################################
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✅ CHECKLIST DE VÉRIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Cochez mentalement chaque point:"
echo ""
echo "  [ ] Les queues 'sales' et 'support' apparaissent dans 'queue show'"
echo "  [ ] L'app 'ivr-app' apparaît dans 'stasis show apps'"
echo "  [ ] Le contexte t${TENANT_ID}_default existe"
echo "  [ ] ARI est actif sur le port 8088"
echo "  [ ] Les fichiers audio existent dans /var/lib/asterisk/sounds/ivr/"
echo "  [ ] Le transport WSS est actif (pour WebRTC)"
echo "  [ ] Les données sont dans PostgreSQL (menu, options, DID)"
echo ""
echo -e "${GREEN}Si tous les points sont ✅, vous êtes prêt pour le test d'appel!${NC}"
echo ""
echo -e "${YELLOW}Prochaine étape:${NC}"
echo "  → Créez un endpoint WebRTC: ./setup-webrtc-endpoint.sh \"TOKEN\" $TENANT_ID"
echo "  → Enregistrez votre softphone WebRTC"
echo "  → Appelez le DID configuré (+33123456789)"
echo ""
