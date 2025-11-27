#!/bin/bash

##############################################################################
# SCRIPT DE TEARDOWN DEMO - Nettoyage complet
#
# Ce script supprime toutes les ressources créées par setup-demo.sh :
# - Le tenant demo_callcenter et toutes ses ressources associées
#
# Usage: ./teardown-demo.sh
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3001/api/v1}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
failure() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
step() { echo -e "▶ $1"; }

header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

##############################################################################
# AUTHENTIFICATION
##############################################################################

header "TEARDOWN DEMO CALLCENTER"

# Obtenir le token
if [ -f "/tmp/asterisk-api-token.sh" ]; then
    source /tmp/asterisk-api-token.sh
fi

if [ -z "$TOKEN" ]; then
    if [ -f "$SCRIPT_DIR/../00-setup/get-token.sh" ]; then
        cd "$SCRIPT_DIR/../00-setup"
        ./get-token.sh > /dev/null 2>&1
        source /tmp/asterisk-api-token.sh
        cd "$SCRIPT_DIR"
    fi
fi

if [ -z "$TOKEN" ]; then
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@asterisk.local","password":"Admin123!"}')
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')
fi

if [ -z "$TOKEN" ]; then
    failure "Impossible d'obtenir le token JWT"
    exit 1
fi

success "Token JWT obtenu"

##############################################################################
# TROUVER LE TENANT demo_callcenter
##############################################################################

header "Recherche du tenant demo_callcenter"

step "Recherche du tenant..."

TENANTS_LIST=$(curl -s -X GET "$API_URL/tenants" \
  -H "Authorization: Bearer $TOKEN")

# Chercher le tenant demo_callcenter
TENANT_ID=$(echo "$TENANTS_LIST" | grep -o '"id":[0-9]*[^}]*"name":"demo_callcenter"' | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    # Essayer l'autre format
    TENANT_ID=$(echo "$TENANTS_LIST" | grep -o '"name":"demo_callcenter"[^}]*"id":[0-9]*' | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

if [ -z "$TENANT_ID" ]; then
    info "Tenant demo_callcenter non trouvé - rien à supprimer"
    exit 0
fi

success "Tenant trouvé avec ID: $TENANT_ID"

##############################################################################
# CONFIRMATION
##############################################################################

echo ""
echo -e "${RED}${BOLD}ATTENTION !${NC}"
echo "Ceci va supprimer le tenant demo_callcenter (ID: $TENANT_ID) et toutes ses ressources :"
echo "  - Tous les endpoints"
echo "  - Toutes les queues et leurs membres"
echo "  - Tous les menus IVR"
echo "  - Tous les trunks SIP"
echo "  - Toutes les extensions"
echo ""
read -p "Êtes-vous sûr de vouloir continuer ? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    info "Opération annulée"
    exit 0
fi

##############################################################################
# SUPPRESSION
##############################################################################

header "Suppression des ressources"

# Supprimer le tenant (cascade delete)
step "Suppression du tenant demo_callcenter..."

DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/tenants/$TENANT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    success "Tenant demo_callcenter supprimé avec succès"
else
    failure "Échec de suppression du tenant"
    echo "Code HTTP: $HTTP_CODE"
    echo "Réponse: $DELETE_RESPONSE"
fi

# Supprimer le fichier de credentials
if [ -f "$SCRIPT_DIR/demo-credentials.txt" ]; then
    rm "$SCRIPT_DIR/demo-credentials.txt"
    success "Fichier demo-credentials.txt supprimé"
fi

##############################################################################
# FIN
##############################################################################

header "NETTOYAGE TERMINÉ"

echo -e "${GREEN}✅ Toutes les ressources demo ont été supprimées${NC}"
echo ""
echo "Pour recréer l'environnement de démo, exécutez:"
echo -e "  ${CYAN}./setup-demo.sh${NC}"
echo ""
