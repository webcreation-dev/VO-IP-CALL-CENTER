#!/bin/bash

##############################################################################
# Script d'authentification JWT
# Obtient un token d'accès pour l'API Asterisk
##############################################################################

# Configuration
API_URL="${API_URL:-http://localhost:3001/api/v1}"
EMAIL="${EMAIL:-admin@asterisk.local}"
PASSWORD="${PASSWORD:-Admin123!}"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un message d'erreur
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher un message d'information
info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

##############################################################################
# AUTHENTIFICATION
##############################################################################

echo "=========================================="
echo "    AUTHENTIFICATION JWT"
echo "=========================================="
echo ""

info "API URL: $API_URL"
info "Email: $EMAIL"
echo ""

# Appel à l'endpoint de login
RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

# Vérifier si la requête a réussi
if [ $? -ne 0 ]; then
    error "Échec de la connexion à l'API"
    exit 1
fi

# Extraire le token (essayer accessToken puis access_token)
TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')
if [ -z "$TOKEN" ]; then
    TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"\(.*\)"/\1/')
fi

if [ -z "$TOKEN" ]; then
    error "Échec de l'authentification"
    echo "Réponse de l'API:"
    echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

success "Authentification réussie"
echo ""
echo "Token JWT:"
echo "$TOKEN"
echo ""

# Exporter le token pour qu'il soit disponible dans le shell parent
export TOKEN
echo "export TOKEN=\"$TOKEN\"" > /tmp/asterisk-api-token.sh

success "Token exporté dans la variable \$TOKEN"
info "Pour l'utiliser dans un autre script: source /tmp/asterisk-api-token.sh"
echo ""

exit 0
