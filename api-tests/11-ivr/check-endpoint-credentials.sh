#!/bin/bash

##############################################################################
# Script pour récupérer les credentials de l'endpoint WebRTC
##############################################################################

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TENANT_ID=${1:-12}

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     CREDENTIALS ENDPOINT WEBRTC - TENANT $TENANT_ID        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}Endpoints pour tenant $TENANT_ID:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -t -A -F $'\t' << EOSQL
SELECT 
    id,
    username,
    context,
    display_name,
    transport
FROM ps_endpoints
WHERE tenant_id = $TENANT_ID
ORDER BY id;
EOSQL

echo ""
echo -e "${BLUE}Authentification (password) pour tenant $TENANT_ID:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -t -A -F $'\t' << EOSQL
SELECT 
    pe.id as endpoint_id,
    pe.username,
    pa.username as auth_username,
    pa.password
FROM ps_endpoints pe
JOIN ps_auths pa ON pa.endpoint = pe.username
WHERE pe.tenant_id = $TENANT_ID
ORDER BY pe.id;
EOSQL

echo ""
echo -e "${CYAN}Pour vous connecter, utilisez:${NC}"
echo ""

CREDENTIALS=$(PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -t -A -F '|' << EOSQL
SELECT 
    pe.username,
    pa.password,
    pe.display_name
FROM ps_endpoints pe
JOIN ps_auths pa ON pa.endpoint = pe.username
WHERE pe.tenant_id = $TENANT_ID
LIMIT 1;
EOSQL
)

if [ ! -z "$CREDENTIALS" ]; then
    USERNAME=$(echo "$CREDENTIALS" | cut -d'|' -f1 | xargs)
    PASSWORD=$(echo "$CREDENTIALS" | cut -d'|' -f2 | xargs)
    DISPLAY=$(echo "$CREDENTIALS" | cut -d'|' -f3 | xargs)
    
    echo "   Username:     $USERNAME"
    echo "   Password:     $PASSWORD"
    echo "   Display Name: $DISPLAY"
    echo "   Server:       pishon.kabou.bj"
    echo "   WebSocket:    wss://pishon.kabou.bj:8089/ws"
    echo ""
fi

echo ""
