#!/bin/bash

##############################################################################
# Script pour créer un endpoint WebRTC avec username simple
##############################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001/api/v1}"
TOKEN="$1"
TENANT_ID="${2:-12}"
ENDPOINT_NUMBER="${3:-200}"
PASSWORD="${4:-webrtc200}"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Token requis${NC}"
    echo "Usage: ./create-simple-webrtc-endpoint.sh \"TOKEN\" [TENANT_ID] [ENDPOINT_NUMBER] [PASSWORD]"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║       CRÉATION ENDPOINT WEBRTC SIMPLE                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}Configuration:${NC}"
echo "  Tenant ID:    $TENANT_ID"
echo "  Number:       $ENDPOINT_NUMBER"
echo "  Password:     $PASSWORD"
echo ""

# Créer l'endpoint avec username simple
RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$ENDPOINT_NUMBER\",
    \"password\": \"$PASSWORD\",
    \"displayName\": \"WebRTC $ENDPOINT_NUMBER\",
    \"transport\": \"transport-wss\",
    \"context\": \"t${TENANT_ID}_default\",
    \"tenantId\": $TENANT_ID,
    \"codecs\": \"opus,ulaw,alaw\"
  }")

ENDPOINT_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$ENDPOINT_ID" ]; then
    echo -e "${RED}❌ Échec création endpoint${NC}"
    echo "$RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Endpoint créé (ID: $ENDPOINT_ID)${NC}"
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          CREDENTIALS WEBRTC                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "   Username:     $ENDPOINT_NUMBER"
echo "   Password:     $PASSWORD"
echo "   Server:       pishon.kabou.bj"
echo "   WebSocket:    wss://pishon.kabou.bj:8089/ws"
echo ""
echo "Configuration JsSIP:"
echo ""
cat << EOJS
const socket = new JsSIP.WebSocketInterface('wss://pishon.kabou.bj:8089/ws');
const configuration = {
  sockets: [socket],
  uri: 'sip:$ENDPOINT_NUMBER@pishon.kabou.bj',
  password: '$PASSWORD',
  display_name: 'WebRTC $ENDPOINT_NUMBER'
};
const ua = new JsSIP.UA(configuration);
ua.start();
EOJS
echo ""
