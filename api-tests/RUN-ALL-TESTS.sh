#!/bin/bash

##############################################################################
# Script principal d'exécution de TOUS les tests
# Lance tous les modules de test séquentiellement
##############################################################################

API_URL="${API_URL:-http://localhost:3001/api/v1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Compteurs globaux
TOTAL_MODULES=0
PASSED_MODULES=0
FAILED_MODULES=0

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

failure() {
    echo -e "${RED}❌ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

section() {
    echo ""
    echo "=========================================="
    echo "  $1"
    echo "=========================================="
    echo ""
}

run_module() {
    local module_name="$1"
    local script_path="$2"

    section "MODULE: $module_name"

    if [ ! -f "$script_path" ]; then
        failure "$module_name - Script non trouvé: $script_path"
        ((FAILED_MODULES++))
        ((TOTAL_MODULES++))
        return 1
    fi

    # Exécuter le script
    bash "$script_path"
    
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        success "$module_name - Tous les tests passés"
        ((PASSED_MODULES++))
    else
        failure "$module_name - Certains tests ont échoué"
        ((FAILED_MODULES++))
    fi

    ((TOTAL_MODULES++))
    echo ""
    return $exit_code
}

##############################################################################
# DÉBUT DE L'EXÉCUTION
##############################################################################

section "EXÉCUTION DE TOUS LES TESTS DE L'API"

echo -e "${CYAN}"
echo "  _____         _             ____        _ _       "
echo " |_   _|__  ___| |_ ___      / ___| _   _(_) |_ ___ "
echo "   | |/ _ \/ __| __/ __|     \___ \| | | | | __/ _ \ "
echo "   | |  __/\__ \ |_\__ \      ___) | |_| | | ||  __/"
echo "   |_|\___||___/\__|___/     |____/ \__,_|_|\__\___|"
echo ""
echo -e "${NC}"

info "API URL: $API_URL"
info "Début des tests: $(date)"
echo ""

# Liste des modules à tester
declare -a MODULES=(
    "00-setup:Authentification JWT:$SCRIPT_DIR/00-setup/get-token.sh"
    "01-tenants:Tenants:$SCRIPT_DIR/01-tenants/test-tenants.sh"
    "02-contexts:Contexts:$SCRIPT_DIR/02-contexts/test-contexts.sh"
    "03-endpoints:Endpoints:$SCRIPT_DIR/03-endpoints/test-endpoints.sh"
    "04-queues:Queues:$SCRIPT_DIR/04-queues/test-queues.sh"
)

# Modules à créer plus tard :
# "05-registrations:Registrations:$SCRIPT_DIR/05-registrations/test-registrations.sh"
# "06-ivr:IVR:$SCRIPT_DIR/06-ivr/test-ivr.sh"

##############################################################################
# CLEANUP GLOBAL - Supprimer toutes les données au début
##############################################################################

section "CLEANUP GLOBAL - Suppression des données existantes"

# S'assurer que le token est disponible
if [ -f "/tmp/asterisk-api-token.sh" ]; then
    source /tmp/asterisk-api-token.sh
fi

if [ -n "$TOKEN" ]; then
    # Récupérer tous les tenants et les supprimer
    TENANTS=$(curl -s -X GET "$API_URL/tenants" -H "Authorization: Bearer $TOKEN")
    TENANT_IDS=$(echo "$TENANTS" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')

    if [ -n "$TENANT_IDS" ]; then
        for TID in $TENANT_IDS; do
            curl -s -X DELETE "$API_URL/tenants/$TID" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
        done
        info "Données existantes supprimées ($( echo "$TENANT_IDS" | wc -w) tenants)"
    else
        info "Aucune donnée existante à supprimer"
    fi
else
    info "Token non disponible - cleanup ignoré"
fi

# Exécuter chaque module
for module in "${MODULES[@]}"; do
    IFS=: read -r module_id module_name script_path <<< "$module"

    # Ignorer l'authentification dans le compteur (c'est une dépendance, pas un test)
    if [ "$module_id" == "00-setup" ]; then
        section "AUTHENTIFICATION"
        bash "$script_path" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            success "Authentification réussie"
        else
            failure "Échec de l'authentification - Impossible de continuer"
            exit 1
        fi
        continue
    fi

    run_module "$module_name" "$script_path"
done

##############################################################################
# RAPPORT FINAL
##############################################################################

section "RAPPORT FINAL - TOUS LES MODULES"

echo "Modules testés      : $TOTAL_MODULES"
echo -e "Modules réussis     : ${GREEN}$PASSED_MODULES${NC}"
echo -e "Modules échoués     : ${RED}$FAILED_MODULES${NC}"
echo ""
echo "Fin des tests: $(date)"
echo ""

if [ $FAILED_MODULES -eq 0 ]; then
    echo -e "${GREEN}"
    echo "  ____  _   _  ____  ____  _____ ____ ____ "
    echo " / ___|| | | |/ ___|| ___|| ____|___ \\___ \ "
    echo " \___ \| | | | |    | |_   |  _|   __) |__) |"
    echo "  ___) | |_| | |___ | __| | |___ / __// __/ "
    echo " |____/ \___/ \____||_|   |_____|_____|_____|"
    echo ""
    echo "  ✅ TOUS LES TESTS SONT PASSÉS !"
    echo -e "${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}"
    echo "  _____ _    ___ _     _____ ____  "
    echo " |  ___/ \  |_ _| |   | ____|  _ \ "
    echo " | |_ / _ \  | || |   |  _| | | | |"
    echo " |  _/ ___ \ | || |___| |___| |_| |"
    echo " |_|/_/   \_\___|_____|_____|____/ "
    echo ""
    echo "  ❌ CERTAINS TESTS ONT ÉCHOUÉ"
    echo -e "${NC}"
    echo ""
    exit 1
fi
