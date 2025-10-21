#!/bin/bash
# ========================================
# Script de vérification post-installation
# ========================================
# Vérifie que tous les composants sont correctement configurés
# ========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "🔍 VÉRIFICATION DE L'INSTALLATION ASTERISK"
echo "========================================="
echo ""

# Fonction de vérification
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1"
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ========================================
# 1. Vérification Docker
# ========================================
echo "1️⃣  Vérification des conteneurs Docker"
echo "----------------------------------------"

docker-compose ps | grep -q "Up" && check "Docker Compose en cours d'exécution" || warn "Docker Compose ne semble pas démarré"

docker ps | grep -q "asterisk" && check "Conteneur Asterisk actif" || warn "Conteneur Asterisk non trouvé"
docker ps | grep -q "postgres" && check "Conteneur PostgreSQL actif" || warn "Conteneur PostgreSQL non trouvé"
docker ps | grep -q "api" && check "Conteneur API actif" || warn "Conteneur API non trouvé"

echo ""

# ========================================
# 2. Vérification Asterisk
# ========================================
echo "2️⃣  Vérification Asterisk"
echo "----------------------------------------"

# Connexion ODBC
ODBC_STATUS=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "odbc show all" 2>/dev/null | grep -c "Connected")
if [ "$ODBC_STATUS" -gt 0 ]; then
    check "Connexion ODBC à PostgreSQL établie"
else
    warn "ODBC non connecté à PostgreSQL"
fi

# Endpoints PJSIP
ENDPOINTS=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show endpoints" 2>/dev/null | grep -E "(101|102|trunk_operateur)" | wc -l)
if [ "$ENDPOINTS" -ge 3 ]; then
    check "Endpoints PJSIP chargés ($ENDPOINTS trouvés)"
else
    warn "Endpoints PJSIP manquants (attendu: 3+, trouvé: $ENDPOINTS)"
fi

# Transports
TRANSPORTS=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show transports" 2>/dev/null | grep -E "(udp|wss)" | wc -l)
if [ "$TRANSPORTS" -ge 2 ]; then
    check "Transports PJSIP configurés (UDP + WSS)"
else
    warn "Transports PJSIP incomplets (attendu: 2, trouvé: $TRANSPORTS)"
fi

# Registrations
REGISTRATIONS=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show registrations" 2>/dev/null | grep -c "trunk_operateur")
if [ "$REGISTRATIONS" -gt 0 ]; then
    check "Registration trunk configurée"
else
    warn "Registration trunk non trouvée"
fi

# Queues
QUEUES=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "queue show" 2>/dev/null | grep -E "(support_queue|sales_queue)" | wc -l)
if [ "$QUEUES" -ge 2 ]; then
    check "Files d'attente configurées"
else
    warn "Files d'attente manquantes (attendu: 2, trouvé: $QUEUES)"
fi

echo ""

# ========================================
# 3. Vérification PostgreSQL
# ========================================
echo "3️⃣  Vérification PostgreSQL"
echo "----------------------------------------"

# Connexion PostgreSQL
docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -c "SELECT 1" > /dev/null 2>&1 && check "Connexion PostgreSQL OK" || warn "Impossible de se connecter à PostgreSQL"

# Tables PJSIP
PJSIP_TABLES=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'ps_%'" 2>/dev/null | xargs)
if [ "$PJSIP_TABLES" -ge 10 ]; then
    check "Tables PJSIP présentes ($PJSIP_TABLES tables)"
else
    warn "Tables PJSIP incomplètes (attendu: 10+, trouvé: $PJSIP_TABLES)"
fi

# Endpoints dans la base
DB_ENDPOINTS=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM ps_endpoints" 2>/dev/null | xargs)
if [ "$DB_ENDPOINTS" -ge 3 ]; then
    check "Endpoints dans PostgreSQL ($DB_ENDPOINTS endpoints)"
else
    warn "Endpoints manquants dans PostgreSQL (attendu: 3+, trouvé: $DB_ENDPOINTS)"
fi

# Queues
DB_QUEUES=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM queues" 2>/dev/null | xargs)
if [ "$DB_QUEUES" -ge 2 ]; then
    check "Queues dans PostgreSQL ($DB_QUEUES queues)"
else
    warn "Queues manquantes dans PostgreSQL (attendu: 2, trouvé: $DB_QUEUES)"
fi

# Queue members
DB_MEMBERS=$(docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT COUNT(*) FROM queue_members" 2>/dev/null | xargs)
if [ "$DB_MEMBERS" -ge 2 ]; then
    check "Membres de queue configurés ($DB_MEMBERS membres)"
else
    warn "Membres de queue manquants (attendu: 2+, trouvé: $DB_MEMBERS)"
fi

echo ""

# ========================================
# 4. Vérification API
# ========================================
echo "4️⃣  Vérification API Node.js"
echo "----------------------------------------"

# Health check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    check "API Health endpoint accessible"
else
    warn "API Health endpoint inaccessible (HTTP $HTTP_STATUS)"
fi

# Tenants endpoint
TENANTS=$(curl -s http://localhost:3000/api/tenants 2>/dev/null | grep -c "Client" || echo "0")
if [ "$TENANTS" -ge 2 ]; then
    check "API Tenants fonctionnel ($TENANTS tenants)"
else
    warn "API Tenants non fonctionnel ou vide"
fi

echo ""

# ========================================
# 5. Vérification certificats SSL
# ========================================
echo "5️⃣  Vérification certificats SSL (WebRTC)"
echo "----------------------------------------"

docker exec asterisk-pgsql_asterisk_1 test -f /etc/asterisk/keys/privkey.pem && check "Clé privée SSL présente" || warn "Clé privée SSL manquante"
docker exec asterisk-pgsql_asterisk_1 test -f /etc/asterisk/keys/fullchain.pem && check "Certificat SSL présent" || warn "Certificat SSL manquant"

# HTTP/HTTPS status
HTTP_ENABLED=$(docker exec asterisk-pgsql_asterisk_1 asterisk -rx "http show status" 2>/dev/null | grep -c "Enabled")
if [ "$HTTP_ENABLED" -gt 0 ]; then
    check "HTTP/HTTPS activé pour WebRTC"
else
    warn "HTTP/HTTPS désactivé"
fi

echo ""

# ========================================
# 6. Vérification réseau
# ========================================
echo "6️⃣  Vérification réseau"
echo "----------------------------------------"

# Ports
netstat -tuln 2>/dev/null | grep -q ":5060" && check "Port 5060 (SIP) en écoute" || warn "Port 5060 non accessible"
netstat -tuln 2>/dev/null | grep -q ":8089" && check "Port 8089 (WSS) en écoute" || warn "Port 8089 non accessible"
netstat -tuln 2>/dev/null | grep -q ":3000" && check "Port 3000 (API) en écoute" || warn "Port 3000 non accessible"

echo ""

# ========================================
# RÉSUMÉ
# ========================================
echo "========================================="
echo "📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "========================================="
echo ""

# Liste des endpoints
echo "📱 Endpoints configurés :"
docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT id, context FROM ps_endpoints ORDER BY id" 2>/dev/null | sed 's/^/  • /'

echo ""
echo "📞 Queues configurées :"
docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT name, strategy FROM queues ORDER BY name" 2>/dev/null | sed 's/^/  • /'

echo ""
echo "👥 Membres de queues :"
docker exec asterisk-pgsql_db_1 psql -U asterisk -d asterisk -t -c "SELECT queue_name, interface, membername FROM queue_members ORDER BY queue_name" 2>/dev/null | sed 's/^/  • /'

echo ""
echo "========================================="
echo "✅ VÉRIFICATION TERMINÉE"
echo "========================================="
echo ""
echo "Pour tester les appels :"
echo "  1. Ouvrir web_phone.html"
echo "  2. Enregistrer 101 (password: password101)"
echo "  3. Enregistrer 102 (password: password102)"
echo "  4. Appeler 101 → 102"
echo "  5. Appeler 800 (support_queue)"
echo ""
echo "Logs en temps réel :"
echo "  docker logs -f asterisk-pgsql_asterisk_1"
echo ""
