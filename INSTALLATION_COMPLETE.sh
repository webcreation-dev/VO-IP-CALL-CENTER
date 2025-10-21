#!/bin/bash
# ========================================
# SCRIPT D'INSTALLATION AUTOMATIQUE
# ========================================
# Ce script configure TOUT automatiquement
# Plus besoin de touches à la base de données !
# ========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================"
echo "🚀 INSTALLATION AUTOMATIQUE ASTERISK"
echo "   Plateforme Multi-Tenant WebRTC"
echo "========================================"
echo -e "${NC}"

# ========================================
# 1. Vérification prérequis
# ========================================
echo -e "${YELLOW}📋 Étape 1/6 : Vérification des prérequis${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installé${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installé${NC}"

# ========================================
# 2. Récupérer l'IP publique
# ========================================
echo ""
echo -e "${YELLOW}📡 Étape 2/6 : Configuration IP publique${NC}"

PUBLIC_IP=$(curl -s ifconfig.me || echo "161.97.106.134")
echo -e "${BLUE}IP publique détectée : ${PUBLIC_IP}${NC}"

read -p "Est-ce correct ? (o/n) [o]: " confirm
confirm=${confirm:-o}

if [ "$confirm" != "o" ]; then
    read -p "Entrez votre IP publique : " PUBLIC_IP
fi

echo -e "${GREEN}✓ IP configurée : ${PUBLIC_IP}${NC}"

# ========================================
# 3. Mise à jour du fichier INIT_TOUT_EN_UN.sql
# ========================================
echo ""
echo -e "${YELLOW}🔧 Étape 3/6 : Configuration des fichiers${NC}"

cd "$(dirname "$0")/asterisk-pgsql"

# Backup
cp INIT_TOUT_EN_UN.sql INIT_TOUT_EN_UN.sql.backup

# Remplacer l'IP dans le fichier SQL
sed -i.bak "s/161\.97\.106\.134/${PUBLIC_IP}/g" INIT_TOUT_EN_UN.sql
echo -e "${GREEN}✓ Fichier INIT_TOUT_EN_UN.sql mis à jour${NC}"

# ========================================
# 4. Génération certificats SSL
# ========================================
echo ""
echo -e "${YELLOW}🔐 Étape 4/6 : Génération certificats SSL${NC}"

if [ ! -f /etc/asterisk/keys/privkey.pem ] || [ ! -f /etc/asterisk/keys/fullchain.pem ]; then
    echo "Génération des certificats SSL auto-signés..."
    sudo ./generate-ssl-certs.sh
    echo -e "${GREEN}✓ Certificats SSL générés${NC}"
else
    echo -e "${GREEN}✓ Certificats SSL déjà présents${NC}"
fi

# ========================================
# 5. Arrêt et nettoyage
# ========================================
echo ""
echo -e "${YELLOW}🧹 Étape 5/6 : Nettoyage environnement${NC}"

echo "Arrêt des conteneurs existants..."
docker-compose down -v 2>/dev/null || true

echo "Suppression des anciennes données PostgreSQL..."
sudo rm -rf .pgdata/*
mkdir -p .pgdata

echo -e "${GREEN}✓ Environnement nettoyé${NC}"

# ========================================
# 6. Démarrage
# ========================================
echo ""
echo -e "${YELLOW}🚀 Étape 6/6 : Démarrage des services${NC}"

echo "Démarrage de Docker Compose..."
docker-compose up -d

echo ""
echo "Attente du démarrage des services (30 secondes)..."
sleep 30

# ========================================
# 7. Vérification
# ========================================
echo ""
echo -e "${BLUE}🔍 Vérification de l'installation...${NC}"
echo ""

# Vérifier conteneurs
RUNNING=$(docker-compose ps | grep -c "Up" || echo "0")
if [ "$RUNNING" -ge 3 ]; then
    echo -e "${GREEN}✓ 3 conteneurs démarrés${NC}"
else
    echo -e "${RED}⚠ Seulement ${RUNNING} conteneurs démarrés${NC}"
fi

# Vérifier PostgreSQL
sleep 5
ODBC_STATUS=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "odbc show all" 2>/dev/null | grep -c "Connected" || echo "0")
if [ "$ODBC_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL connecté${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL non connecté (peut prendre quelques secondes)${NC}"
fi

# Vérifier endpoints
ENDPOINTS=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM ps_endpoints" 2>/dev/null | xargs || echo "0")
if [ "$ENDPOINTS" -ge 4 ]; then
    echo -e "${GREEN}✓ ${ENDPOINTS} endpoints configurés${NC}"
else
    echo -e "${YELLOW}⚠ Seulement ${ENDPOINTS} endpoints trouvés${NC}"
fi

# Vérifier queues
QUEUES=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM queues" 2>/dev/null | xargs || echo "0")
if [ "$QUEUES" -ge 2 ]; then
    echo -e "${GREEN}✓ ${QUEUES} files d'attente configurées${NC}"
else
    echo -e "${YELLOW}⚠ Seulement ${QUEUES} queues trouvées${NC}"
fi

# ========================================
# RÉSULTAT
# ========================================
echo ""
echo -e "${GREEN}"
echo "========================================"
echo "✅ INSTALLATION TERMINÉE !"
echo "========================================"
echo -e "${NC}"

echo ""
echo -e "${BLUE}📞 Informations de connexion :${NC}"
echo ""
echo "🌐 WebRTC Client : web_phone.html"
echo "   • Extension 101 : password101"
echo "   • Extension 102 : password102"
echo "   • WebSocket URI : wss://${PUBLIC_IP}:8089/ws"
echo ""
echo "📞 SIP Trunk :"
echo "   • Numéro DID : +22954150000"
echo "   • Server : 197.234.218.195:25060"
echo ""
echo "🔢 Codes spéciaux :"
echo "   • 800  → File d'attente support"
echo "   • 801  → File d'attente ventes"
echo "   • *65  → Messagerie vocale"
echo "   • *66  → Pause agent"
echo "   • *67  → Reprise service"
echo "   • *68  → Statistiques queue"
echo ""
echo "🔧 API REST : http://${PUBLIC_IP}:3000"
echo "   • Health : http://${PUBLIC_IP}:3000/api/health"
echo "   • Tenants : http://${PUBLIC_IP}:3000/api/tenants"
echo ""
echo -e "${YELLOW}🧪 Tests à effectuer :${NC}"
echo ""
echo "1. Ouvrir web_phone.html dans Chrome/Firefox"
echo "2. Configurer :"
echo "   - URI: wss://${PUBLIC_IP}:8089/ws"
echo "   - SIP: sip:101@${PUBLIC_IP}"
echo "   - Password: password101"
echo "3. S'enregistrer (bouton Register)"
echo "4. Ouvrir une 2ème fenêtre avec 102"
echo "5. Appeler 101 → 102 (ça doit marcher !)"
echo "6. Appeler 800 → entre dans la queue support"
echo ""
echo -e "${BLUE}📊 Commandes utiles :${NC}"
echo ""
echo "# Vérifier logs Asterisk"
echo "docker logs -f asterisk-pgsql_asterisk_1"
echo ""
echo "# Accéder au CLI Asterisk"
echo "docker exec -it asterisk-pgsql_asterisk_1 asterisk -rvvv"
echo ""
echo "# Vérifier endpoints"
echo "docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx 'pjsip show endpoints'"
echo ""
echo "# Vérifier queues"
echo "docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx 'queue show'"
echo ""
echo "# Lancer script de vérification"
echo "cd .. && ./verify-install.sh"
echo ""
echo -e "${GREEN}🎉 Tout est prêt ! Bon appels !${NC}"
echo ""
