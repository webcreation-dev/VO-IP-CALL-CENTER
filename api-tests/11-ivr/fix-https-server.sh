#!/bin/bash

##############################################################################
# Script pour corriger le serveur HTTPS Asterisk (port 8089)
##############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║       CORRECTION SERVEUR HTTPS ASTERISK (8089)        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

##############################################################################
# ÉTAPE 1: Vérifier les certificats
##############################################################################
echo -e "${BLUE}1️⃣  Vérification des certificats SSL/TLS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Certificats dans /etc/asterisk/keys:"
docker exec asterisk ls -lh /etc/asterisk/keys/

echo ""
echo "Vérification validité fullchain.pem:"
FULLCHAIN_CHECK=$(docker exec asterisk openssl x509 -in /etc/asterisk/keys/fullchain.pem -noout -dates 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ fullchain.pem est valide${NC}"
    echo "$FULLCHAIN_CHECK"
else
    echo -e "${RED}❌ fullchain.pem invalide${NC}"
    echo "$FULLCHAIN_CHECK"
fi

echo ""
echo "Vérification validité privkey.pem:"
PRIVKEY_CHECK=$(docker exec asterisk openssl rsa -in /etc/asterisk/keys/privkey.pem -check -noout 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ privkey.pem est valide${NC}"
else
    echo -e "${RED}❌ privkey.pem invalide ou protégé par mot de passe${NC}"
    echo "$PRIVKEY_CHECK"
fi

echo ""

##############################################################################
# ÉTAPE 2: Vérifier http.conf
##############################################################################
echo -e "${BLUE}2️⃣  Vérification configuration http.conf${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Configuration TLS dans http.conf:"
docker exec asterisk grep -E "^(tlsenable|tlsbindaddr|tlscertfile|tlsprivatekey)" /etc/asterisk/http.conf

echo ""

##############################################################################
# ÉTAPE 3: Vérifier les logs Asterisk pour erreurs TLS
##############################################################################
echo -e "${BLUE}3️⃣  Recherche d'erreurs TLS dans les logs${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Logs récents contenant 'TLS' ou 'SSL' ou '8089':"
docker logs asterisk 2>&1 | grep -i -E "(tls|ssl|8089)" | tail -20

echo ""

##############################################################################
# ÉTAPE 4: Tester rechargement module HTTP
##############################################################################
echo -e "${BLUE}4️⃣  Rechargement du module HTTP Asterisk${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Rechargement du module http..."
docker exec asterisk asterisk -rx "module reload res_http_websocket.so"
docker exec asterisk asterisk -rx "module reload res_pjsip_transport_websocket.so"

echo ""
echo "Attendez 2 secondes..."
sleep 2

echo ""
echo "Vérification après rechargement:"
docker exec asterisk asterisk -rx "http show status"

echo ""

##############################################################################
# ÉTAPE 5: Si toujours pas actif, redémarrer Asterisk
##############################################################################
echo -e "${BLUE}5️⃣  Test: Le serveur HTTPS est-il maintenant actif?${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HTTPS_STATUS=$(docker exec asterisk asterisk -rx "http show status" | grep "8089")

if echo "$HTTPS_STATUS" | grep -q "8089"; then
    echo -e "${GREEN}✅ HTTPS Server actif sur 8089!${NC}"
    echo "$HTTPS_STATUS"
    echo ""
    echo -e "${GREEN}🎉 Problème résolu! Testez maintenant votre client WebRTC.${NC}"
else
    echo -e "${RED}❌ HTTPS Server toujours inactif${NC}"
    echo ""
    echo -e "${YELLOW}Solution: Redémarrer le container Asterisk${NC}"
    echo ""
    read -p "Voulez-vous redémarrer Asterisk maintenant? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Redémarrage d'Asterisk..."
        docker restart asterisk
        echo ""
        echo "Attendez 10 secondes pour le démarrage..."
        sleep 10
        echo ""
        echo "Vérification après redémarrage:"
        docker exec asterisk asterisk -rx "http show status"
        echo ""
        echo "Transport WSS:"
        docker exec asterisk asterisk -rx "pjsip show transports" | grep -A 2 "transport-wss"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                      TERMINÉ                          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
