#!/bin/bash

##############################################################################
# Script de diagnostic connectivité WebRTC
# Usage: ./diagnose-webrtc-connectivity.sh
# À exécuter SUR LE VPS (pas en local)
##############################################################################

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     DIAGNOSTIC CONNECTIVITÉ WEBRTC - PORT 8089        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

##############################################################################
# CHECK 1: Vérifier que Docker Asterisk écoute sur 8089
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  Vérification: Asterisk écoute-t-il sur port 8089?${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ASTERISK_HTTP_STATUS=$(docker exec asterisk asterisk -rx "http show status" 2>/dev/null | grep "8089")

if echo "$ASTERISK_HTTP_STATUS" | grep -q "8089"; then
    echo -e "${GREEN}✅ Asterisk écoute bien sur port 8089${NC}"
    echo "$ASTERISK_HTTP_STATUS"
else
    echo -e "${RED}❌ Asterisk n'écoute PAS sur port 8089${NC}"
    echo "Sortie complète:"
    docker exec asterisk asterisk -rx "http show status"
fi

echo ""

##############################################################################
# CHECK 2: Vérifier que le port est exposé au niveau Docker
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  Vérification: Docker expose-t-il le port 8089?${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DOCKER_PORTS=$(docker ps --filter name=asterisk --format "{{.Ports}}" | grep "8089")

if [ ! -z "$DOCKER_PORTS" ]; then
    echo -e "${GREEN}✅ Docker expose le port 8089${NC}"
    echo "$DOCKER_PORTS"
else
    echo -e "${RED}❌ Docker N'expose PAS le port 8089${NC}"
    echo "Ports actuels:"
    docker ps --filter name=asterisk --format "{{.Ports}}"
fi

echo ""

##############################################################################
# CHECK 3: Vérifier que le port écoute sur l'hôte
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  Vérification: Port 8089 écoute sur l'hôte VPS?${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v netstat &> /dev/null; then
    NETSTAT_RESULT=$(netstat -tuln | grep 8089)
    if [ ! -z "$NETSTAT_RESULT" ]; then
        echo -e "${GREEN}✅ Port 8089 écoute sur l'hôte${NC}"
        echo "$NETSTAT_RESULT"
    else
        echo -e "${RED}❌ Port 8089 N'écoute PAS sur l'hôte${NC}"
    fi
elif command -v ss &> /dev/null; then
    SS_RESULT=$(ss -tuln | grep 8089)
    if [ ! -z "$SS_RESULT" ]; then
        echo -e "${GREEN}✅ Port 8089 écoute sur l'hôte${NC}"
        echo "$SS_RESULT"
    else
        echo -e "${RED}❌ Port 8089 N'écoute PAS sur l'hôte${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Ni netstat ni ss disponibles${NC}"
fi

echo ""

##############################################################################
# CHECK 4: Test de connexion locale (depuis le VPS lui-même)
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  Test: Connexion locale au port 8089 (depuis VPS)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test avec curl
CURL_TEST=$(curl -k -s -o /dev/null -w "%{http_code}" https://localhost:8089/ws 2>&1)

if [ "$CURL_TEST" = "426" ] || [ "$CURL_TEST" = "400" ] || [ "$CURL_TEST" = "101" ]; then
    echo -e "${GREEN}✅ Le serveur répond sur localhost:8089 (HTTP $CURL_TEST)${NC}"
    echo "   Note: 426 = 'Upgrade Required' → Normal pour WebSocket"
else
    echo -e "${YELLOW}⚠️  Réponse inattendue: HTTP $CURL_TEST${NC}"
fi

# Test avec telnet (timeout 2 secondes)
if command -v timeout &> /dev/null; then
    TELNET_TEST=$(timeout 2 bash -c 'echo -e "GET / HTTP/1.1\r\n\r\n" | nc localhost 8089 2>&1' | head -1)
    if [ ! -z "$TELNET_TEST" ]; then
        echo -e "${GREEN}✅ Port 8089 répond en TCP${NC}"
        echo "   Première ligne: $TELNET_TEST"
    else
        echo -e "${RED}❌ Pas de réponse TCP sur localhost:8089${NC}"
    fi
fi

echo ""

##############################################################################
# CHECK 5: Vérifier les règles iptables
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  Vérification: Règles iptables pour port 8089${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v iptables &> /dev/null; then
    # Essayer sans sudo d'abord
    IPTABLES_RESULT=$(iptables -L -n 2>&1 | grep -i "8089")

    if echo "$IPTABLES_RESULT" | grep -q "Permission denied"; then
        echo -e "${YELLOW}⚠️  Besoin de sudo pour voir les règles iptables${NC}"
        echo ""
        echo "Exécutez manuellement:"
        echo -e "${GREEN}sudo iptables -L -n | grep 8089${NC}"
        echo -e "${GREEN}sudo iptables -L -n -t nat | grep 8089${NC}"
    elif [ ! -z "$IPTABLES_RESULT" ]; then
        echo -e "${GREEN}✅ Règles iptables trouvées pour 8089:${NC}"
        echo "$IPTABLES_RESULT"
    else
        echo -e "${YELLOW}⚠️  Aucune règle iptables spécifique pour 8089${NC}"
        echo "   (peut être normal si aucun filtrage)"
    fi
else
    echo -e "${YELLOW}⚠️  iptables non disponible${NC}"
fi

echo ""

##############################################################################
# CHECK 6: Vérifier ufw (Ubuntu Firewall)
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6️⃣  Vérification: Firewall UFW${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status 2>&1)
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo -e "${YELLOW}⚠️  UFW est ACTIF${NC}"
        echo "$UFW_STATUS" | grep "8089"
        if ! echo "$UFW_STATUS" | grep -q "8089"; then
            echo -e "${RED}❌ Port 8089 NON autorisé dans UFW${NC}"
            echo ""
            echo "Pour autoriser le port 8089:"
            echo -e "${GREEN}sudo ufw allow 8089/tcp${NC}"
        else
            echo -e "${GREEN}✅ Port 8089 autorisé dans UFW${NC}"
        fi
    else
        echo -e "${GREEN}✅ UFW désactivé${NC}"
    fi
else
    echo -e "${GREEN}✅ UFW non installé${NC}"
fi

echo ""

##############################################################################
# CHECK 7: Vérifier les certificats SSL/TLS
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7️⃣  Vérification: Certificats SSL/TLS pour WSS${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

CERTS=$(docker exec asterisk ls -lh /etc/asterisk/keys/ 2>/dev/null)

if [ ! -z "$CERTS" ]; then
    echo -e "${GREEN}✅ Certificats trouvés:${NC}"
    echo "$CERTS"
else
    echo -e "${RED}❌ Aucun certificat trouvé dans /etc/asterisk/keys/${NC}"
    echo ""
    echo "WebRTC nécessite des certificats DTLS. Vérifiez:"
    echo -e "${GREEN}docker exec asterisk ls -lh /etc/asterisk/keys/${NC}"
fi

echo ""

##############################################################################
# CHECK 8: Test de connexion EXTERNE (depuis Internet)
##############################################################################
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8️⃣  Test: Connexion EXTERNE au port 8089${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

echo "IP publique du VPS: $PUBLIC_IP"
echo ""
echo "Testez depuis votre machine locale:"
echo -e "${GREEN}telnet $PUBLIC_IP 8089${NC}"
echo -e "${GREEN}curl -k https://$PUBLIC_IP:8089/ws${NC}"
echo ""

# Test avec curl depuis le VPS lui-même vers l'IP publique
EXTERNAL_CURL=$(curl -k -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://$PUBLIC_IP:8089/ws 2>&1)

if [ "$EXTERNAL_CURL" = "426" ] || [ "$EXTERNAL_CURL" = "400" ] || [ "$EXTERNAL_CURL" = "101" ]; then
    echo -e "${GREEN}✅ Port 8089 accessible depuis l'extérieur (HTTP $EXTERNAL_CURL)${NC}"
else
    echo -e "${RED}❌ Port 8089 NON accessible depuis l'extérieur${NC}"
    echo "   Code HTTP: $EXTERNAL_CURL"
    echo ""
    echo -e "${YELLOW}⚠️  PROBLÈME PROBABLE:${NC}"
    echo "   • Firewall du fournisseur VPS (Contabo Cloud Panel)"
    echo "   • iptables bloque le port"
    echo "   • Configuration réseau Docker incorrecte"
fi

echo ""

##############################################################################
# RÉSUMÉ ET RECOMMANDATIONS
##############################################################################
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    RÉSUMÉ DIAGNOSTIC                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo -e "${YELLOW}📋 Actions à vérifier:${NC}"
echo ""
echo "1️⃣  Si iptables bloque le port:"
echo -e "   ${GREEN}sudo iptables -I INPUT -p tcp --dport 8089 -j ACCEPT${NC}"
echo -e "   ${GREEN}sudo iptables-save > /etc/iptables/rules.v4${NC}"
echo ""
echo "2️⃣  Si UFW bloque le port:"
echo -e "   ${GREEN}sudo ufw allow 8089/tcp${NC}"
echo ""
echo "3️⃣  Vérifier le firewall Contabo:"
echo "   • Connectez-vous au Cloud Panel Contabo"
echo "   • Firewall → Add Rule"
echo "   • Port: 8089, Protocol: TCP, Action: Allow"
echo ""
echo "4️⃣  Vérifier les ports RTP (pour l'audio):"
echo -e "   ${GREEN}sudo ufw allow 10000:10200/udp${NC}"
echo ""
echo "5️⃣  Redémarrer Docker après changements:"
echo -e "   ${GREEN}docker-compose restart asterisk${NC}"
echo ""

echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""
