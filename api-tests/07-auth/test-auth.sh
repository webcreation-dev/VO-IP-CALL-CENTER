#!/bin/bash

##############################################################################
# Script de test - Module Auth
# Teste tous les endpoints d'authentification de l'API
# Inclut login, register et récupération du profil utilisateur
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3001/api/v1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

failure() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

##############################################################################
# TEST 1: POST /auth/login - Connexion utilisateur
##############################################################################

section "TEST 1: Connexion avec admin@asterisk.local"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@asterisk.local",
    "password": "Admin123!"
  }')

# Vérifier que le token est présent
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -n "$TOKEN" ]; then
    success "Login réussi, token JWT obtenu"
    info "Token: ${TOKEN:0:50}..."
else
    failure "Échec du login, aucun token reçu"
    echo "Réponse: $LOGIN_RESPONSE"
fi

# Vérifier les données utilisateur dans la réponse
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | grep -o '"email":"[^"]*"' | head -1 | sed 's/"email":"\(.*\)"/\1/')
USER_ROLE=$(echo "$LOGIN_RESPONSE" | grep -o '"role":"[^"]*"' | sed 's/"role":"\(.*\)"/\1/')

if [ "$USER_EMAIL" = "admin@asterisk.local" ]; then
    success "Email utilisateur correct dans la réponse"
else
    failure "Email utilisateur incorrect"
fi

if [ -n "$USER_ROLE" ]; then
    success "Rôle utilisateur présent: $USER_ROLE"
else
    failure "Rôle utilisateur manquant"
fi

##############################################################################
# TEST 2: POST /auth/login - Connexion avec mauvais credentials
##############################################################################

section "TEST 2: Tentative de connexion avec mauvais mot de passe"

BAD_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" \
  -d '{
    "email": "admin@asterisk.local",
    "password": "WrongPassword123!"
  }')

HTTP_CODE=$(echo "$BAD_LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$BAD_LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
    success "Refus correct avec HTTP 401 pour mauvais credentials"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 401)"
fi

# Vérifier qu'aucun token n'est retourné
if ! echo "$BODY" | grep -q "accessToken"; then
    success "Aucun token retourné pour mauvais credentials"
else
    failure "Un token a été retourné malgré les mauvais credentials"
fi

##############################################################################
# TEST 3: GET /auth/me - Récupération du profil utilisateur
##############################################################################

section "TEST 3: Récupération du profil utilisateur"

ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

# Vérifier que les données du profil sont présentes
PROFILE_EMAIL=$(echo "$ME_RESPONSE" | grep -o '"email":"[^"]*"' | sed 's/"email":"\(.*\)"/\1/')
PROFILE_ROLE=$(echo "$ME_RESPONSE" | grep -o '"role":"[^"]*"' | sed 's/"role":"\(.*\)"/\1/')
PROFILE_SUB=$(echo "$ME_RESPONSE" | grep -o '"sub":[0-9]*' | grep -o '[0-9]*')

if [ "$PROFILE_EMAIL" = "admin@asterisk.local" ]; then
    success "Email du profil correct"
else
    failure "Email du profil incorrect: $PROFILE_EMAIL"
fi

if [ -n "$PROFILE_ROLE" ]; then
    success "Rôle du profil présent: $PROFILE_ROLE"
else
    failure "Rôle du profil manquant"
fi

if [ -n "$PROFILE_SUB" ]; then
    success "User ID (sub) présent: $PROFILE_SUB"
else
    failure "User ID (sub) manquant"
fi

##############################################################################
# TEST 4: GET /auth/me - Sans token JWT (doit échouer)
##############################################################################

section "TEST 4: Tentative d'accès au profil sans token"

NO_AUTH_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$NO_AUTH_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "401" ]; then
    success "Refus correct avec HTTP 401 sans token"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 401)"
fi

##############################################################################
# TEST 5: POST /auth/register - Création d'un nouvel utilisateur (admin)
##############################################################################

section "TEST 5: Création d'un nouvel utilisateur"

# Créer un tenant pour l'utilisateur (requis pour les non-super-admin)
TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-auth-tenant"
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    failure "Impossible de créer le tenant pour le test"
fi

# Générer un email unique
RANDOM_ID=$(date +%s)
NEW_USER_EMAIL="test-user-$RANDOM_ID@asterisk.local"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"email\": \"$NEW_USER_EMAIL\",
    \"password\": \"TestUser123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"role\": \"agent\",
    \"tenantId\": $TENANT_ID
  }")

CREATED_EMAIL=$(echo "$REGISTER_RESPONSE" | grep -o '"email":"[^"]*"' | sed 's/"email":"\(.*\)"/\1/')
CREATED_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

if [ "$CREATED_EMAIL" = "$NEW_USER_EMAIL" ]; then
    success "Utilisateur créé avec succès (ID: $CREATED_ID)"
else
    failure "Échec de création de l'utilisateur"
    echo "Réponse: $REGISTER_RESPONSE"
fi

# Vérifier que le mot de passe n'est pas retourné
if ! echo "$REGISTER_RESPONSE" | grep -q '"password"'; then
    success "Mot de passe non retourné dans la réponse (sécurité OK)"
else
    failure "SÉCURITÉ: Le mot de passe est retourné dans la réponse"
fi

##############################################################################
# TEST 6: POST /auth/register - Email en double (doit échouer)
##############################################################################

section "TEST 6: Tentative de création avec email existant"

DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n%{http_code}" \
  -d "{
    \"email\": \"$NEW_USER_EMAIL\",
    \"password\": \"AnotherPassword123!\",
    \"firstName\": \"Duplicate\",
    \"lastName\": \"User\",
    \"role\": \"agent\",
    \"tenantId\": $TENANT_ID
  }")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    success "Refus correct de l'email en double (HTTP $HTTP_CODE)"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 409 ou 400)"
fi

##############################################################################
# TEST 7: POST /auth/login - Connexion avec le nouvel utilisateur
##############################################################################

section "TEST 7: Connexion avec le nouvel utilisateur créé"

NEW_USER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$NEW_USER_EMAIL\",
    \"password\": \"TestUser123!\"
  }")

NEW_USER_TOKEN=$(echo "$NEW_USER_LOGIN" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -n "$NEW_USER_TOKEN" ]; then
    success "Connexion réussie avec le nouvel utilisateur"
    info "Token: ${NEW_USER_TOKEN:0:50}..."
else
    failure "Échec de connexion avec le nouvel utilisateur"
fi

##############################################################################
# TEST 8: POST /auth/register - Sans authentification (doit échouer)
##############################################################################

section "TEST 8: Tentative de création d'utilisateur sans être admin"

UNAUTH_REGISTER=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -w "\n%{http_code}" \
  -d '{
    "email": "hacker@example.com",
    "password": "HackAttempt123!",
    "firstName": "Hacker",
    "lastName": "User",
    "role": "admin"
  }')

HTTP_CODE=$(echo "$UNAUTH_REGISTER" | tail -1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    success "Refus correct sans authentification admin (HTTP $HTTP_CODE)"
else
    failure "Code HTTP incorrect: $HTTP_CODE (attendu: 401 ou 403)"
fi

##############################################################################
# RÉSUMÉ
##############################################################################

section "RÉSUMÉ DES TESTS"

TOTAL=$((PASSED + FAILED))

echo "Tests réussis:  $PASSED / $TOTAL"
echo "Tests échoués:  $FAILED / $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés${NC}"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC}"
    exit 1
fi
