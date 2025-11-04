#!/bin/bash

###############################################################################
# SCRIPT DE DÉMARRAGE COMPLET - SYSTÈME MULTI-TENANT ASTERISK
###############################################################################
# Ce script démarre le système avec une base de données fraîche
# Usage: ./start-fresh.sh
###############################################################################

set -e  # Exit on error

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher avec couleur
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}\n"
}

###############################################################################
# VÉRIFICATIONS PRÉLIMINAIRES
###############################################################################

print_header "VÉRIFICATIONS PRÉLIMINAIRES"

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi
print_success "Docker installé"

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé."
    exit 1
fi
print_success "Docker Compose installé"

# Vérifier le fichier docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    print_error "Fichier docker-compose.yml introuvable. Êtes-vous dans le bon répertoire ?"
    exit 1
fi
print_success "Fichier docker-compose.yml trouvé"

# Vérifier le script d'init
if [ ! -f "init-api-db.sql" ]; then
    print_error "Fichier init-api-db.sql introuvable !"
    exit 1
fi
print_success "Script d'initialisation trouvé"

###############################################################################
# CONFIRMATION UTILISATEUR
###############################################################################

print_header "ATTENTION - DONNÉES EXISTANTES"

if [ -d "./api-pgdata" ]; then
    print_warning "Un volume de données existe déjà (./api-pgdata)"
    echo ""
    echo "Options:"
    echo "  1) Supprimer et repartir à zéro (PERTE DE DONNÉES)"
    echo "  2) Sauvegarder puis repartir à zéro"
    echo "  3) Annuler"
    echo ""
    read -p "Votre choix (1/2/3): " choice

    case $choice in
        1)
            print_warning "Suppression du volume existant..."
            sudo rm -rf ./api-pgdata
            print_success "Volume supprimé"
            ;;
        2)
            backup_name="api-pgdata.backup.$(date +%Y%m%d_%H%M%S)"
            print_info "Sauvegarde vers: $backup_name"
            mv ./api-pgdata ./$backup_name
            print_success "Sauvegarde créée: $backup_name"
            ;;
        3)
            print_info "Opération annulée"
            exit 0
            ;;
        *)
            print_error "Choix invalide"
            exit 1
            ;;
    esac
else
    print_info "Aucun volume existant - Démarrage frais"
fi

###############################################################################
# ARRÊT DES SERVICES EXISTANTS
###############################################################################

print_header "ARRÊT DES SERVICES EXISTANTS"

print_info "Arrêt de tous les conteneurs..."
docker-compose down 2>/dev/null || true
print_success "Services arrêtés"

# Nettoyer les volumes orphelins
print_info "Nettoyage des volumes orphelins..."
docker volume prune -f 2>/dev/null || true

###############################################################################
# DÉMARRAGE DES SERVICES
###############################################################################

print_header "DÉMARRAGE DES SERVICES"

print_info "Démarrage de la base de données api-db..."
docker-compose up -d api-db

# Attendre que la DB soit prête
print_info "Attente que PostgreSQL soit prêt..."
sleep 5

# Vérifier que la DB est prête
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker exec asterisk-api-postgres pg_isready -U api_user -d asterisk_api &> /dev/null; then
        print_success "PostgreSQL est prêt !"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 1
done
echo ""

if [ $attempt -eq $max_attempts ]; then
    print_error "PostgreSQL n'a pas démarré dans les temps"
    print_info "Vérifiez les logs: docker-compose logs api-db"
    exit 1
fi

print_info "Démarrage de Redis..."
docker-compose up -d redis
sleep 2
print_success "Redis démarré"

print_info "Démarrage d'Asterisk..."
docker-compose up -d asterisk
sleep 5
print_success "Asterisk démarré"

# print_info "Démarrage du backend NestJS..."
# docker-compose up -d backend
# sleep 5
# print_success "Backend démarré"

# ###############################################################################
# # VÉRIFICATIONS POST-DÉMARRAGE
# ###############################################################################

# print_header "VÉRIFICATIONS POST-DÉMARRAGE"

# # Vérifier api-db
# print_info "Vérification de la base de données..."
# if docker exec asterisk-api-postgres psql -U api_user -d asterisk_api -c "\dt" &> /dev/null; then
#     print_success "Base de données opérationnelle"

#     # Compter les tables
#     table_count=$(docker exec asterisk-api-postgres psql -U api_user -d asterisk_api -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
#     print_info "Nombre de tables créées: $table_count"
# else
#     print_error "Problème avec la base de données"
# fi

# # Vérifier Asterisk ODBC
# print_info "Vérification de la connexion ODBC d'Asterisk..."
# sleep 3
# if docker exec asterisk asterisk -rx "odbc show" | grep -q "Connected: yes"; then
#     print_success "Asterisk connecté à ODBC"
# else
#     print_warning "Asterisk pas encore connecté à ODBC (peut prendre quelques secondes)"
# fi

# # Vérifier le backend
# print_info "Vérification du backend NestJS..."
# sleep 5
# if curl -s http://localhost:3001/api/v1/health > /dev/null 2>&1; then
#     print_success "Backend NestJS opérationnel"
# else
#     print_warning "Backend pas encore prêt (démarrage en cours...)"
# fi

# ###############################################################################
# # AFFICHAGE DES INFORMATIONS
# ###############################################################################

# print_header "🎉 DÉMARRAGE TERMINÉ !"

# echo ""
# echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
# echo -e "${GREEN}║         SYSTÈME MULTI-TENANT ASTERISK DÉMARRÉ          ║${NC}"
# echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
# echo ""
# echo -e "${BLUE}📊 SERVICES DISPONIBLES:${NC}"
# echo ""
# echo "  🗄️  Base de données PostgreSQL"
# echo "      Host: localhost"
# echo "      Port: 5432"
# echo "      Database: asterisk_api"
# echo "      User: api_user"
# echo "      Password: ApiSecurePass2025!"
# echo ""
# echo "  📡 Asterisk PBX"
# echo "      AMI: localhost:5038"
# echo "      ARI: localhost:8088"
# echo "      SIP/UDP: localhost:5060"
# echo "      WSS: localhost:8089"
# echo ""
# echo "  🚀 Backend NestJS API"
# echo "      URL: http://localhost:3001/api/v1"
# echo "      Swagger: http://localhost:3001/api/v1/docs"
# echo "      Health: http://localhost:3001/api/v1/health"
# echo ""
# echo "  💾 Redis Cache"
# echo "      Host: localhost"
# echo "      Port: 6379"
# echo ""
# echo -e "${BLUE}👤 CREDENTIALS PAR DÉFAUT:${NC}"
# echo ""
# echo "  Admin API:"
# echo "      Username: admin"
# echo "      Email: admin@asterisk.local"
# echo "      Password: Admin123!"
# echo "      Role: SUPER_ADMIN"
# echo ""
# echo "  Asterisk AMI:"
# echo "      Username: admin"
# echo "      Password: Sp33Dd14L"
# echo ""
# echo "  Asterisk ARI:"
# echo "      Username: callcenter-ivr"
# echo "      Password: Secret123!"
# echo ""
# echo -e "${BLUE}📝 COMMANDES UTILES:${NC}"
# echo ""
# echo "  Voir les logs:"
# echo "    docker-compose logs -f [service]"
# echo ""
# echo "  Se connecter à PostgreSQL:"
# echo "    docker exec -it asterisk-api-postgres psql -U api_user -d asterisk_api"
# echo ""
# echo "  Se connecter au CLI Asterisk:"
# echo "    docker exec -it asterisk asterisk -rx 'core show version'"
# echo ""
# echo "  Arrêter tout:"
# echo "    docker-compose down"
# echo ""
# echo "  Redémarrer un service:"
# echo "    docker-compose restart [service]"
# echo ""
# echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
# echo "  - Changez le mot de passe admin après votre première connexion"
# echo "  - Consultez le fichier MIGRATION_GUIDE.md pour plus d'informations"
# echo "  - Vérifiez que tous les services sont bien démarrés avec: docker-compose ps"
# echo ""
# print_success "Le système est prêt à l'emploi !"
# echo ""
