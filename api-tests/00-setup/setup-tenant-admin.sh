#!/bin/bash

##############################################################################
# Script d'initialisation - Création d'un utilisateur TENANT_ADMIN
# Crée un tenant et un utilisateur TENANT_ADMIN pour les tests
# Exporte le token JWT de cet utilisateur dans /tmp/tenant-admin-token.sh
##############################################################################

API_URL="${API_URL:-http://localhost:3001/api/v1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

failure() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "=========================================="
echo "    SETUP TENANT ADMIN"
echo "=========================================="
echo ""

# 1. Obtenir le token SUPER_ADMIN
if [ -f "/tmp/asterisk-api-token.sh" ]; then
    source /tmp/asterisk-api-token.sh
    info "Token SUPER_ADMIN récupéré"
else
    info "Obtention du token SUPER_ADMIN..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    bash "$SCRIPT_DIR/get-token.sh" > /dev/null 2>&1
    source /tmp/asterisk-api-token.sh
fi

if [ -z "$TOKEN" ]; then
    failure "Impossible d'obtenir le token SUPER_ADMIN"
    exit 1
fi

# 2. Créer un tenant de test
info "Création du tenant de test..."

TIMESTAMP=$(date +%s)

TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"test-tenant-admin-$TIMESTAMP\"
  }")

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant de test"
    echo "Réponse: $TENANT_RESPONSE"
    exit 1
fi

success "Tenant créé avec ID: $TENANT_ID"

# 3. Créer un utilisateur TENANT_ADMIN
info "Création de l'utilisateur TENANT_ADMIN..."

RANDOM_ID=$(date +%s)
TENANT_ADMIN_EMAIL="tenant-admin-$RANDOM_ID@asterisk.local"
TENANT_ADMIN_PASSWORD="TenantAdmin123!"

USER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"$TENANT_ADMIN_EMAIL\",
    \"password\": \"$TENANT_ADMIN_PASSWORD\",
    \"firstName\": \"Tenant\",
    \"lastName\": \"Admin\",
    \"role\": \"tenant_admin\",
    \"tenantId\": $TENANT_ID
  }")

USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$USER_ID" ]; then
    failure "Impossible de créer l'utilisateur TENANT_ADMIN"
    echo "Réponse: $USER_RESPONSE"
    exit 1
fi

success "Utilisateur TENANT_ADMIN créé (ID: $USER_ID)"
info "Email: $TENANT_ADMIN_EMAIL"

# 4. Se connecter avec le TENANT_ADMIN
info "Connexion avec le TENANT_ADMIN..."

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TENANT_ADMIN_EMAIL\",
    \"password\": \"$TENANT_ADMIN_PASSWORD\"
  }")

TENANT_ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -z "$TENANT_ADMIN_TOKEN" ]; then
    failure "Impossible de se connecter avec le TENANT_ADMIN"
    echo "Réponse: $LOGIN_RESPONSE"
    exit 1
fi

success "Connexion réussie"

# 5. Exporter les informations dans un fichier
cat > /tmp/tenant-admin-token.sh << EOF
# Tenant Admin credentials for testing
export TENANT_ADMIN_TOKEN="$TENANT_ADMIN_TOKEN"
export TENANT_ADMIN_EMAIL="$TENANT_ADMIN_EMAIL"
export TENANT_ADMIN_PASSWORD="$TENANT_ADMIN_PASSWORD"
export TEST_TENANT_ID=$TENANT_ID
export TEST_USER_ID=$USER_ID
EOF

success "Token TENANT_ADMIN exporté dans /tmp/tenant-admin-token.sh"

echo ""
echo "Token JWT TENANT_ADMIN:"
echo "$TENANT_ADMIN_TOKEN"
echo ""

success "Setup terminé!"
info "Pour utiliser dans un script: source /tmp/tenant-admin-token.sh"
echo ""

exit 0
