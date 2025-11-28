#!/bin/bash

##############################################################################
# SCRIPT DE SETUP DEMO - Call Center Complet
#
# Ce script crée un environnement de test complet avec :
# - 1 Tenant "demo_callcenter"
# - 4 Endpoints WebRTC (agents 1001-1004)
# - 2 Queues (support + ventes)
# - 1 SIP Trunk configuré pour 197.234.218.195
# - 1 IVR Menu avec routing vers les queues
# - Extensions dialplan pour tests internes
#
# Usage: ./setup-demo.sh
##############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="${API_URL:-http://localhost:3001/api/v1}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Compteurs
STEPS_OK=0
STEPS_FAILED=0

success() { echo -e "${GREEN}✅ $1${NC}"; ((STEPS_OK++)); }
failure() { echo -e "${RED}❌ $1${NC}"; ((STEPS_FAILED++)); }
info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
step() { echo -e "${BLUE}▶ $1${NC}"; }

header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}$1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Fichier de sortie des credentials
OUTPUT_FILE="$SCRIPT_DIR/demo-credentials.txt"

##############################################################################
# ÉTAPE 0: Vérifications préliminaires
##############################################################################

header "SETUP DEMO CALLCENTER"

echo "Ce script va créer un environnement de démo complet."
echo ""

# Vérifier que l'API est accessible
step "Vérification de l'API..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null)
# 200, 401, ou 404 signifient que l'API répond
if [ "$HEALTH_CHECK" != "200" ] && [ "$HEALTH_CHECK" != "401" ] && [ "$HEALTH_CHECK" != "404" ]; then
    failure "API non accessible sur $API_URL (HTTP $HEALTH_CHECK)"
    info "Assurez-vous que l'API est démarrée avec: npm run start:dev"
    exit 1
fi
success "API accessible (HTTP $HEALTH_CHECK)"

##############################################################################
# ÉTAPE 1: Authentification
##############################################################################

header "ÉTAPE 1: Authentification"

step "Obtention du token JWT..."

# Utiliser le token existant ou en obtenir un nouveau
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
    # Tentative de login direct
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
# ÉTAPE 1b: Vérifier si le tenant existe et le supprimer (IDEMPOTENT)
##############################################################################

header "ÉTAPE 1b: Nettoyage tenant existant (si présent)"

step "Recherche du tenant demo_callcenter existant..."

TENANTS_LIST=$(curl -s -X GET "$API_URL/tenants" \
  -H "Authorization: Bearer $TOKEN")

EXISTING_TENANT_ID=$(echo "$TENANTS_LIST" | grep -o '"name":"demo_callcenter"[^}]*"id":[0-9]*' | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
if [ -z "$EXISTING_TENANT_ID" ]; then
    EXISTING_TENANT_ID=$(echo "$TENANTS_LIST" | grep -o '"id":[0-9]*[^}]*"name":"demo_callcenter"' | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
fi

if [ -n "$EXISTING_TENANT_ID" ]; then
    info "Tenant existant trouvé (ID: $EXISTING_TENANT_ID)"
    step "Suppression des ressources IVR..."

    # Supprimer les DID mappings
    DID_MAPPINGS=$(curl -s "$API_URL/ivr/did-mappings?tenantId=$EXISTING_TENANT_ID" -H "Authorization: Bearer $TOKEN")
    echo "$DID_MAPPINGS" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | while read did_id; do
        curl -s -X DELETE "$API_URL/ivr/did-mappings/$did_id?tenantId=$EXISTING_TENANT_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
    done

    # Supprimer les IVR menus
    IVR_MENUS=$(curl -s "$API_URL/ivr/menus?tenantId=$EXISTING_TENANT_ID" -H "Authorization: Bearer $TOKEN")
    echo "$IVR_MENUS" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -5 | while read menu_id; do
        curl -s -X DELETE "$API_URL/ivr/menus/$menu_id?tenantId=$EXISTING_TENANT_ID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
    done

    step "Suppression du tenant..."
    DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/tenants/$EXISTING_TENANT_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -w "\n%{http_code}")

    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        success "Ancien tenant supprimé"
    else
        info "Suppression du tenant: code $HTTP_CODE (peut-être déjà supprimé)"
    fi

    # Attendre un peu pour que la suppression soit propagée
    sleep 2
else
    info "Aucun tenant demo_callcenter existant"
fi

##############################################################################
# ÉTAPE 2: Créer le Tenant
##############################################################################

header "ÉTAPE 2: Création du Tenant"

step "Création du tenant demo_callcenter..."

TENANT_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "demo_callcenter",
    "companyName": "Demo Call Center",
    "contactEmail": "demo@callcenter.local",
    "maxEndpoints": 10,
    "maxQueues": 5
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$TENANT_ID" ]; then
    # Peut-être que le tenant existe déjà
    info "Tentative de récupération du tenant existant..."
    TENANTS_LIST=$(curl -s -X GET "$API_URL/tenants" \
      -H "Authorization: Bearer $TOKEN")
    TENANT_ID=$(echo "$TENANTS_LIST" | grep -o '"name":"demo_callcenter"[^}]*"id":[0-9]*' | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -z "$TENANT_ID" ]; then
        failure "Impossible de créer ou récupérer le tenant"
        echo "Réponse: $TENANT_RESPONSE"
        exit 1
    fi
    info "Tenant existant récupéré (ID: $TENANT_ID)"
else
    success "Tenant créé avec ID: $TENANT_ID"
fi

# Attendre la création du context par défaut
sleep 2

##############################################################################
# ÉTAPE 3: Créer le Context
##############################################################################

header "ÉTAPE 3: Création du Context"

step "Création du context demo_context..."

CONTEXT_RESPONSE=$(curl -s -X POST "$API_URL/contexts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"demo_context\",
    \"description\": \"Context principal pour demo callcenter\",
    \"tenantId\": $TENANT_ID
  }")

CONTEXT_NAME=$(echo "$CONTEXT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONTEXT_NAME" ]; then
    # Utiliser le context par défaut
    CONTEXT_NAME="t${TENANT_ID}_default"
    info "Utilisation du context par défaut: $CONTEXT_NAME"
else
    success "Context créé: $CONTEXT_NAME"
fi

##############################################################################
# ÉTAPE 4: Créer les Endpoints WebRTC
##############################################################################

header "ÉTAPE 4: Création des 4 Endpoints WebRTC"

# Stockage des IDs d'endpoints (tableau simple, compatible bash/zsh)
ENDPOINT_IDS=()

create_endpoint() {
    local num=$1
    local name=$2
    local password="demo$num"

    step "Création endpoint $num ($name)..."

    RESPONSE=$(curl -s -X POST "$API_URL/endpoints" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"displayName\": \"$name\",
        \"password\": \"$password\",
        \"transport\": \"transport-wss\",
        \"context\": \"$CONTEXT_NAME\",
        \"tenantId\": $TENANT_ID
      }")

    ENDPOINT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$ENDPOINT_ID" ]; then
        success "Endpoint $ENDPOINT_ID créé (password: $password)"
        ENDPOINT_IDS+=("$ENDPOINT_ID")
    else
        failure "Échec création endpoint $num"
        echo "Réponse: $RESPONSE"
    fi
}

create_endpoint "1001" "Agent Support Senior"
create_endpoint "1002" "Agent Support Junior"
create_endpoint "1003" "Commercial Senior"
create_endpoint "1004" "Commercial Junior"

##############################################################################
# ÉTAPE 5: Créer les Queues
##############################################################################

header "ÉTAPE 5: Création des Queues"

step "Création queue support (ringall)..."

QUEUE_SUPPORT_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"support\",
    \"strategy\": \"ringall\",
    \"timeout\": 30,
    \"retry\": 5,
    \"maxlen\": 10,
    \"context\": \"$CONTEXT_NAME\",
    \"musicclass\": \"default\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_SUPPORT=$(echo "$QUEUE_SUPPORT_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$QUEUE_SUPPORT" ]; then
    success "Queue support créée: $QUEUE_SUPPORT"
else
    failure "Échec création queue support"
fi

step "Création queue ventes (rrmemory)..."

QUEUE_VENTES_RESPONSE=$(curl -s -X POST "$API_URL/queues" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"ventes\",
    \"strategy\": \"rrmemory\",
    \"timeout\": 25,
    \"retry\": 5,
    \"maxlen\": 15,
    \"context\": \"$CONTEXT_NAME\",
    \"musicclass\": \"default\",
    \"tenantId\": $TENANT_ID
  }")

QUEUE_VENTES=$(echo "$QUEUE_VENTES_RESPONSE" | grep -o '"name":"t[0-9]*_[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$QUEUE_VENTES" ]; then
    success "Queue ventes créée: $QUEUE_VENTES"
else
    failure "Échec création queue ventes"
fi

##############################################################################
# ÉTAPE 6: Ajouter les agents aux queues
##############################################################################

header "ÉTAPE 6: Ajout des agents aux queues"

add_member() {
    local queue=$1
    local endpoint=$2
    local penalty=$3

    step "Ajout $endpoint à $queue (penalty: $penalty)..."

    RESPONSE=$(curl -s -X POST "$API_URL/queues/$queue/members" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"endpointName\": \"$endpoint\",
        \"penalty\": $penalty,
        \"paused\": false
      }")

    if echo "$RESPONSE" | grep -q '"interface"'; then
        success "Agent $endpoint ajouté à $queue"
    else
        failure "Échec ajout $endpoint à $queue"
    fi
}

# Queue Support: agents 1001, 1002
if [ -n "$QUEUE_SUPPORT" ]; then
    add_member "$QUEUE_SUPPORT" "${ENDPOINT_IDS[0]}" 0
    add_member "$QUEUE_SUPPORT" "${ENDPOINT_IDS[1]}" 1
fi

# Queue Ventes: agents 1003, 1004
if [ -n "$QUEUE_VENTES" ]; then
    add_member "$QUEUE_VENTES" "${ENDPOINT_IDS[2]}" 0
    add_member "$QUEUE_VENTES" "${ENDPOINT_IDS[3]}" 1
fi

##############################################################################
# ÉTAPE 7: Créer le SIP Trunk
##############################################################################

header "ÉTAPE 7: Création du SIP Trunk"

step "Création du trunk vers 197.234.218.195..."

TRUNK_RESPONSE=$(curl -s -X POST "$API_URL/registrations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"demo_operator\",
    \"remote_host\": \"197.234.218.195:25060\",
    \"username\": \"62908521\",
    \"password\": \"167d458f-8\",
    \"transport\": \"transport-udp\",
    \"context\": \"from-trunk\",
    \"sends_registrations\": true,
    \"sends_auth\": true,
    \"expiration\": 3600,
    \"retry_interval\": 60,
    \"max_retries\": 10,
    \"did_pattern\": \"+22954150000\"
  }")

# L'ID du trunk peut être un string (nom) ou un nombre
TRUNK_ID=$(echo "$TRUNK_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TRUNK_ID" ]; then
    TRUNK_ID=$(echo "$TRUNK_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
fi

# Vérifier si la création a réussi via success:true
if echo "$TRUNK_RESPONSE" | grep -q '"success":true'; then
    success "SIP Trunk créé (ID: $TRUNK_ID)"
    info "Host: 197.234.218.195:25060"
    info "DID: +22954150000"
elif echo "$TRUNK_RESPONSE" | grep -q 'already exists'; then
    # Le trunk existe déjà, c'est OK
    TRUNK_ID="demo_operator"
    success "SIP Trunk existant réutilisé (ID: $TRUNK_ID)"
    info "Host: 197.234.218.195:25060"
    info "DID: +22954150000"
elif [ -n "$TRUNK_ID" ]; then
    success "SIP Trunk créé (ID: $TRUNK_ID)"
    info "Host: 197.234.218.195:25060"
    info "DID: +22954150000"
else
    failure "Échec création SIP Trunk"
    echo "Réponse: $TRUNK_RESPONSE"
fi

##############################################################################
# ÉTAPE 8: Créer le Menu IVR
##############################################################################

header "ÉTAPE 8: Création du Menu IVR"

step "Création du menu principal..."

IVR_MENU_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus?tenantId=$TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "menu_principal",
    "description": "Menu principal Demo CallCenter",
    "welcome_sound": "demo-welcome",
    "invalid_sound": "invalid",
    "timeout_sound": "vm-goodbye",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": {"type": "repeat"},
    "invalid_action": {"type": "repeat"}
  }')

IVR_MENU_ID=$(echo "$IVR_MENU_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$IVR_MENU_ID" ]; then
    success "Menu IVR créé (ID: $IVR_MENU_ID)"
else
    failure "Échec création menu IVR"
fi

##############################################################################
# ÉTAPE 9: Ajouter les options IVR
##############################################################################

header "ÉTAPE 9: Configuration des options IVR"

if [ -n "$IVR_MENU_ID" ]; then
    step "Ajout option 1 → Queue Support..."

    OPTION1_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$IVR_MENU_ID/options?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"digit\": \"1\",
        \"description\": \"Service Support Technique\",
        \"action\": {
          \"type\": \"queue\",
          \"target\": \"$QUEUE_SUPPORT\"
        },
        \"priority\": 1,
        \"is_active\": true
      }")

    if echo "$OPTION1_RESPONSE" | grep -q '"id"'; then
        success "Option 1 configurée → Queue Support"
    else
        failure "Échec configuration option 1"
    fi

    step "Ajout option 2 → Queue Ventes..."

    OPTION2_RESPONSE=$(curl -s -X POST "$API_URL/ivr/menus/$IVR_MENU_ID/options?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"digit\": \"2\",
        \"description\": \"Service Commercial\",
        \"action\": {
          \"type\": \"queue\",
          \"target\": \"$QUEUE_VENTES\"
        },
        \"priority\": 2,
        \"is_active\": true
      }")

    if echo "$OPTION2_RESPONSE" | grep -q '"id"'; then
        success "Option 2 configurée → Queue Ventes"
    else
        failure "Échec configuration option 2"
    fi
fi

##############################################################################
# ÉTAPE 10: Mapper le DID vers l'IVR
##############################################################################

header "ÉTAPE 10: Mapping DID → IVR"

if [ -n "$IVR_MENU_ID" ]; then
    step "Création mapping +22954150000 → Menu IVR..."

    DID_MAPPING_RESPONSE=$(curl -s -X POST "$API_URL/ivr/did-mappings?tenantId=$TENANT_ID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"did\": \"+22954150000\",
        \"menu_id\": $IVR_MENU_ID,
        \"is_active\": true
      }")

    if echo "$DID_MAPPING_RESPONSE" | grep -q '"id"'; then
        success "DID +22954150000 mappé vers menu IVR"
    else
        failure "Échec mapping DID"
    fi
fi

##############################################################################
# ÉTAPE 11: Extensions dialplan pour les queues
# Création des extensions 5001 (Support) et 5002 (Ventes) directement en base
##############################################################################

header "ÉTAPE 11: Extensions dialplan pour queues"

step "Création des extensions 5001 (Support) et 5002 (Ventes)..."

# Déterminer l'hôte PostgreSQL (local ou docker)
if command -v psql &> /dev/null; then
    # psql disponible localement
    PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U asterisk_api -d asterisk_api_db -c "
    INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata, created_at, updated_at) VALUES
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 1, 'Answer', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 2, 'Queue', '${QUEUE_SUPPORT},t,,,60', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 3, 'Hangup', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 1, 'Answer', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 2, 'Queue', '${QUEUE_VENTES},t,,,60', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 3, 'Hangup', '', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    " 2>/dev/null && success "Extensions 5001/5002 créées" || info "Extensions peut-être déjà existantes"
elif docker ps | grep -q asterisk-api-postgres; then
    # Utiliser docker
    docker exec asterisk-api-postgres psql -U api_user -d asterisk_api -c "
    INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata, created_at, updated_at) VALUES
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 1, 'Answer', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 2, 'Queue', '${QUEUE_SUPPORT},t,,,60', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5001', 3, 'Hangup', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 1, 'Answer', '', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 2, 'Queue', '${QUEUE_VENTES},t,,,60', NOW(), NOW()),
    ($TENANT_ID, '$CONTEXT_NAME', '5002', 3, 'Hangup', '', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    " 2>/dev/null && success "Extensions 5001/5002 créées" || info "Extensions peut-être déjà existantes"
else
    info "Impossible de créer les extensions (psql/docker non disponible)"
    info "Créez-les manuellement avec:"
    info "  5001 → Queue(${QUEUE_SUPPORT})"
    info "  5002 → Queue(${QUEUE_VENTES})"
fi

info ""
info "Pour appeler la queue Support: composer 5001"
info "Pour appeler la queue Ventes: composer 5002"
info "Pour appeler un agent: composer son numéro (ex: 1000, 1001...)"
info "Pour tester l'IVR: appeler le DID +22954150000 (en prod)"

##############################################################################
# RAPPORT FINAL
##############################################################################

header "CONFIGURATION TERMINÉE"

# Écrire les credentials dans un fichier
cat > "$OUTPUT_FILE" << EOF
================================================================================
  DEMO CALLCENTER - CREDENTIALS
  Généré le: $(date)
================================================================================

TENANT
------
  ID: $TENANT_ID
  Nom: demo_callcenter
  Context: $CONTEXT_NAME

ENDPOINTS WEBRTC
----------------
  ┌──────────┬────────────┬─────────────────────────────┐
  │ Username │ Password   │ Rôle                        │
  ├──────────┼────────────┼─────────────────────────────┤
  │ ${ENDPOINT_IDS[0]:-1001}     │ demo1001   │ Agent Support Senior        │
  │ ${ENDPOINT_IDS[1]:-1002}     │ demo1002   │ Agent Support Junior        │
  │ ${ENDPOINT_IDS[2]:-1003}     │ demo1003   │ Commercial Senior           │
  │ ${ENDPOINT_IDS[3]:-1004}     │ demo1004   │ Commercial Junior           │
  └──────────┴────────────┴─────────────────────────────┘

  WebSocket URL: wss://localhost:8089/ws (local)
                 wss://161.97.106.134:8089/ws (prod VPS)

QUEUES
------
  - Support ($QUEUE_SUPPORT): Agents ${ENDPOINT_IDS[0]}, ${ENDPOINT_IDS[1]} - stratégie ringall
  - Ventes ($QUEUE_VENTES): Agents ${ENDPOINT_IDS[2]}, ${ENDPOINT_IDS[3]} - stratégie round-robin

SIP TRUNK
---------
  Host: 197.234.218.195:25060
  Username: 62908521
  Password: 167d458f-8
  DID: +22954150000

IVR MENU
--------
  Menu ID: $IVR_MENU_ID
  - Appuyez 1 → Queue Support
  - Appuyez 2 → Queue Ventes

TESTS POSSIBLES
---------------
  EN LOCAL:
  1. Connecter agent ${ENDPOINT_IDS[0]:-1001} via WebRTC (wss://localhost:8089/ws)
  2. Connecter agent ${ENDPOINT_IDS[1]:-1002} via WebRTC
  3. Agent ${ENDPOINT_IDS[0]:-1001} appelle ${ENDPOINT_IDS[1]:-1002} (appel direct entre agents)
  4. Tester la queue en ajoutant un appel via l'API ou WebRTC

  EN PROD (VPS 161.97.106.134):
  - Appel externe vers +22954150000 → IVR → Choix 1/2 → Queue
  - Agents WebRTC reçoivent l'appel

================================================================================
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}            ${BOLD}DEMO CALLCENTER CONFIGURÉ !${NC}                      "
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Étapes réussies: ${GREEN}$STEPS_OK${NC}"
echo -e "Étapes échouées: ${RED}$STEPS_FAILED${NC}"
echo ""
echo -e "Credentials sauvegardés dans: ${CYAN}$OUTPUT_FILE${NC}"
echo ""

# Afficher un résumé rapide
echo -e "${BOLD}ENDPOINTS WEBRTC:${NC}"
echo "  ${ENDPOINT_IDS[0]:-t${TENANT_ID}_1001} / demo1001 (Support)"
echo "  ${ENDPOINT_IDS[1]:-t${TENANT_ID}_1002} / demo1002 (Support)"
echo "  ${ENDPOINT_IDS[2]:-t${TENANT_ID}_1003} / demo1003 (Ventes)"
echo "  ${ENDPOINT_IDS[3]:-t${TENANT_ID}_1004} / demo1004 (Ventes)"
echo ""
echo -e "${BOLD}QUEUES:${NC}"
echo "  ${QUEUE_SUPPORT:-t${TENANT_ID}_support} (ringall)"
echo "  ${QUEUE_VENTES:-t${TENANT_ID}_ventes} (round-robin)"
echo ""

if [ $STEPS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Setup terminé avec succès !${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Setup terminé avec $STEPS_FAILED erreur(s)${NC}"
    exit 1
fi
