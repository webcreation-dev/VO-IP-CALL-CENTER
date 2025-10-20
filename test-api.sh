#!/bin/bash

###############################################################################
# Script de test complet de l'API Asterisk
# Usage: ./test-api.sh
###############################################################################

# set -e  # Désactiver pour continuer même en cas d'erreur

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

# Fonction pour afficher un test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}TEST:${NC} $description"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Method: ${method}"
    echo -e "Endpoint: ${endpoint}"
    
    if [ -n "$data" ]; then
        echo -e "Data: $data"
        response=$(curl -s -X $method "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "${API_URL}${endpoint}")
    fi
    
    # Vérifier si la réponse contient "success": true
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo "$response" | jq '.'
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    fi
}

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       TEST COMPLET DE L'API ASTERISK - TOUTES LES PHASES     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ========================================
# PHASE 0 : HEALTH CHECK
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 0 : HEALTH CHECK${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/" "" "Route principale"
test_endpoint "GET" "/api/health" "" "Health check"

# ========================================
# PHASE 2 : TENANTS
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 2 : GESTION DES TENANTS${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/tenants" "" "Liste des tenants"
test_endpoint "GET" "/api/tenants/1" "" "Détails du tenant 1"
test_endpoint "GET" "/api/tenants/1/stats" "" "Statistiques du tenant 1"

# Créer un tenant de test
test_endpoint "POST" "/api/tenants" '{"name":"Tenant Test API"}' "Créer un tenant de test"

# ========================================
# PHASE 3 : ENDPOINTS SIP
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 3 : GESTION DES ENDPOINTS SIP${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/endpoints" "" "Liste des endpoints"
test_endpoint "GET" "/api/endpoints?tenant_id=1" "" "Endpoints du tenant 1"
test_endpoint "GET" "/api/endpoints/101" "" "Détails de l'endpoint 101"
test_endpoint "GET" "/api/endpoints/101/status" "" "Statut de l'endpoint 101"

# ========================================
# PHASE 4 : QUEUES
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 4 : GESTION DES QUEUES${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/queues" "" "Liste des queues"
test_endpoint "GET" "/api/queues/support_queue" "" "Détails de la queue support_queue"
test_endpoint "GET" "/api/queues/support_queue/stats" "" "Statistiques de la queue"
test_endpoint "GET" "/api/queues/support_queue/members" "" "Membres de la queue"

# ========================================
# PHASE 6 : CDR ET ENREGISTREMENTS
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 6 : CDR ET ENREGISTREMENTS${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/cdr?limit=5" "" "Liste des 5 derniers CDR"
test_endpoint "GET" "/api/cdr?tenant_id=1&limit=5" "" "CDR du tenant 1"
test_endpoint "GET" "/api/cdr/stats/global" "" "Statistiques globales des appels"
test_endpoint "GET" "/api/cdr/stats/tenant/1" "" "Statistiques du tenant 1"
test_endpoint "GET" "/api/cdr/stats/queues" "" "Statistiques des queues"

test_endpoint "GET" "/api/recordings?limit=5" "" "Liste des 5 derniers enregistrements"
test_endpoint "GET" "/api/recordings/stats" "" "Statistiques des enregistrements"

# ========================================
# PHASE 7 : STATISTIQUES AVANCÉES
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 7 : STATISTIQUES AVANCÉES${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/statistics/summary" "" "Résumé des statistiques"
test_endpoint "GET" "/api/statistics/dashboard" "" "Dashboard complet"
test_endpoint "GET" "/api/statistics/calls" "" "Statistiques des appels"
test_endpoint "GET" "/api/statistics/queues" "" "Statistiques des queues"
test_endpoint "GET" "/api/statistics/endpoints" "" "Statistiques des endpoints"
test_endpoint "GET" "/api/statistics/recordings" "" "Statistiques des enregistrements"
test_endpoint "GET" "/api/statistics/top-callers?limit=5" "" "Top 5 appelants"
test_endpoint "GET" "/api/statistics/top-called?limit=5" "" "Top 5 appelés"
test_endpoint "GET" "/api/statistics/trend?group_by=day" "" "Évolution par jour"

# ========================================
# PHASE 8 : ADMINISTRATION ASTERISK (AMI)
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 8 : ADMINISTRATION ASTERISK (AMI)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

test_endpoint "GET" "/api/asterisk/status" "" "Statut du serveur Asterisk"
test_endpoint "GET" "/api/asterisk/uptime" "" "Uptime d'Asterisk"
test_endpoint "GET" "/api/asterisk/stats" "" "Statistiques globales Asterisk"
test_endpoint "GET" "/api/asterisk/channels" "" "Canaux actifs"
test_endpoint "GET" "/api/asterisk/modules" "" "Modules chargés"
test_endpoint "GET" "/api/asterisk/peers" "" "Liste des peers PJSIP"

# ========================================
# RÉSUMÉ FINAL
# ========================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}RÉSUMÉ DES TESTS${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Phases testées :${NC}"
echo "  ✓ Phase 0 : Health Check"
echo "  ✓ Phase 2 : Gestion des Tenants"
echo "  ✓ Phase 3 : Gestion des Endpoints SIP"
echo "  ✓ Phase 4 : Gestion des Queues"
echo "  ✓ Phase 6 : CDR et Enregistrements"
echo "  ✓ Phase 7 : Statistiques Avancées"
echo "  ✓ Phase 8 : Administration Asterisk (AMI)"

echo -e "\n${YELLOW}Note:${NC} Les tests AMI (Phase 8) peuvent échouer si Asterisk n'est pas démarré."
echo -e "${YELLOW}Note:${NC} Pour des tests complets, assurez-vous que Docker Compose est lancé."

echo -e "\n${GREEN}Tests terminés !${NC}\n"

