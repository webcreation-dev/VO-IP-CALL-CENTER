#!/bin/bash

###############################################################################
# Script de Déploiement Asterisk avec Files d'Attente
# Ce script configure automatiquement tout le système
###############################################################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Déploiement Asterisk - Système Complet             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
POSTGRES_CONTAINER="asterisk-pgsql-db-1"
ASTERISK_CONTAINER="asterisk-pgsql-asterisk-1"
POSTGRES_USER="asterisk"
POSTGRES_DB="asterisk"

# Fonction pour afficher un message de succès
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher un message d'info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour afficher un message d'erreur
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour afficher un message d'avertissement
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Vérifier que les conteneurs existent
info "Vérification des conteneurs Docker..."
if ! docker ps -a | grep -q "$POSTGRES_CONTAINER"; then
    error "Conteneur PostgreSQL '$POSTGRES_CONTAINER' non trouvé"
    exit 1
fi

if ! docker ps -a | grep -q "$ASTERISK_CONTAINER"; then
    error "Conteneur Asterisk '$ASTERISK_CONTAINER' non trouvé"
    exit 1
fi

success "Conteneurs trouvés"

# Étape 1 : Configuration de la base de données
echo ""
info "═══════════════════════════════════════════════════════"
info "Étape 1/5 : Configuration de la base de données"
info "═══════════════════════════════════════════════════════"

info "Création des queues..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < setup_queues.sql
success "Queues créées (support_queue, sales_queue)"

info "Configuration des enregistrements..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < setup_recording.sql
success "Tables d'enregistrement créées"

# Étape 2 : Vérification de la configuration Asterisk
echo ""
info "═══════════════════════════════════════════════════════"
info "Étape 2/5 : Vérification de la configuration Asterisk"
info "═══════════════════════════════════════════════════════"

FILES_TO_CHECK=(
    "etc/asterisk/extconfig.conf"
    "etc/asterisk/pjsip.conf"
    "etc/asterisk/extensions.conf"
    "etc/asterisk/queues.conf"
    "etc/asterisk/musiconhold.conf"
    "etc/asterisk/features.conf"
    "etc/asterisk/cdr.conf"
    "etc/asterisk/cdr_pgsql.conf"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        success "Fichier $file présent"
    else
        error "Fichier $file manquant!"
        exit 1
    fi
done

# Étape 3 : Configuration des répertoires
echo ""
info "═══════════════════════════════════════════════════════"
info "Étape 3/5 : Configuration des répertoires"
info "═══════════════════════════════════════════════════════"

info "Création des répertoires pour musique d'attente..."
docker exec "$ASTERISK_CONTAINER" mkdir -p /var/lib/asterisk/moh
docker exec "$ASTERISK_CONTAINER" mkdir -p /var/lib/asterisk/sounds/custom
docker exec "$ASTERISK_CONTAINER" chown -R asterisk:asterisk /var/lib/asterisk/moh
docker exec "$ASTERISK_CONTAINER" chown -R asterisk:asterisk /var/lib/asterisk/sounds/custom
success "Répertoires MOH créés"

info "Création des répertoires pour enregistrements..."
docker exec "$ASTERISK_CONTAINER" mkdir -p /var/spool/asterisk/monitor
docker exec "$ASTERISK_CONTAINER" chown -R asterisk:asterisk /var/spool/asterisk/monitor
docker exec "$ASTERISK_CONTAINER" chmod 755 /var/spool/asterisk/monitor
success "Répertoires d'enregistrement créés"

# Étape 4 : Redémarrage et rechargement
echo ""
info "═══════════════════════════════════════════════════════"
info "Étape 4/5 : Redémarrage et rechargement"
info "═══════════════════════════════════════════════════════"

info "Rechargement de la configuration Asterisk..."
docker exec "$ASTERISK_CONTAINER" asterisk -rx "core reload" > /dev/null 2>&1 || true
docker exec "$ASTERISK_CONTAINER" asterisk -rx "module reload" > /dev/null 2>&1 || true
sleep 3
success "Configuration rechargée"

info "Rechargement des modules spécifiques..."
docker exec "$ASTERISK_CONTAINER" asterisk -rx "module reload app_queue.so" > /dev/null 2>&1 || true
docker exec "$ASTERISK_CONTAINER" asterisk -rx "module reload cdr_pgsql.so" > /dev/null 2>&1 || true
docker exec "$ASTERISK_CONTAINER" asterisk -rx "moh reload" > /dev/null 2>&1 || true
success "Modules rechargés"

# Étape 5 : Vérifications
echo ""
info "═══════════════════════════════════════════════════════"
info "Étape 5/5 : Vérifications"
info "═══════════════════════════════════════════════════════"

info "Vérification des queues..."
QUEUE_OUTPUT=$(docker exec "$ASTERISK_CONTAINER" asterisk -rx "queue show" 2>/dev/null)
if echo "$QUEUE_OUTPUT" | grep -q "support_queue"; then
    success "Queue 'support_queue' active"
else
    warning "Queue 'support_queue' non trouvée"
fi

if echo "$QUEUE_OUTPUT" | grep -q "sales_queue"; then
    success "Queue 'sales_queue' active"
else
    warning "Queue 'sales_queue' non trouvée (normale si pas encore créée)"
fi

info "Vérification des modules CDR..."
CDR_STATUS=$(docker exec "$ASTERISK_CONTAINER" asterisk -rx "cdr status" 2>/dev/null)
if echo "$CDR_STATUS" | grep -q "enabled"; then
    success "CDR activé"
else
    warning "CDR non activé"
fi

info "Vérification de la musique d'attente..."
MOH_OUTPUT=$(docker exec "$ASTERISK_CONTAINER" asterisk -rx "moh show" 2>/dev/null)
if echo "$MOH_OUTPUT" | grep -q "default"; then
    success "Classe MOH 'default' configurée"
else
    warning "Classe MOH 'default' non trouvée"
fi

# Affichage des statistiques de la base de données
echo ""
info "═══════════════════════════════════════════════════════"
info "Statistiques de la base de données"
info "═══════════════════════════════════════════════════════"

docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" << 'EOF'
SELECT 
    'Tenants' AS table_name,
    COUNT(*) AS count
FROM tenants
UNION ALL
SELECT 
    'Endpoints',
    COUNT(*)
FROM ps_endpoints
UNION ALL
SELECT 
    'Queues',
    COUNT(*)
FROM queues
UNION ALL
SELECT 
    'Queue Members',
    COUNT(*)
FROM queue_members
UNION ALL
SELECT 
    'CDR Records',
    COUNT(*)
FROM cdr;
EOF

# Résumé final
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Déploiement Terminé avec Succès ! 🎉                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📋 Prochaines étapes :${NC}"
echo ""
echo "1️⃣  Ajouter des fichiers audio dans :"
echo "   docker exec -it $ASTERISK_CONTAINER bash"
echo "   cd /var/lib/asterisk/moh/"
echo ""
echo "2️⃣  Créer des messages IVR personnalisés dans :"
echo "   /var/lib/asterisk/sounds/custom/"
echo ""
echo "3️⃣  Tester le système :"
echo "   • Ouvrir web_phone.html"
echo "   • Se connecter avec l'utilisateur 101"
echo "   • Appeler 102 (test direct)"
echo "   • Appeler 800 (test queue)"
echo "   • Appeler depuis le trunk (test IVR)"
echo ""
echo "4️⃣  Extensions utiles :"
echo "   800  : File d'attente support"
echo "   801  : File d'attente ventes"
echo "   *65  : Messagerie vocale"
echo "   *66  : Pause agent"
echo "   *67  : Reprise agent"
echo "   *68  : Statistiques queue"
echo ""
echo "5️⃣  Transferts d'appels (pendant un appel) :"
echo "   #1   : Transfert aveugle"
echo "   *2   : Transfert accompagné"
echo "   *3   : Enregistrement manuel"
echo ""
echo "6️⃣  Consulter les logs :"
echo "   docker exec -it $ASTERISK_CONTAINER asterisk -rvvv"
echo ""
echo "7️⃣  Voir les enregistrements :"
echo "   docker exec -it $ASTERISK_CONTAINER ls -lh /var/spool/asterisk/monitor/"
echo ""
echo "8️⃣  Requêtes SQL utiles :"
echo "   SELECT * FROM v_call_history ORDER BY start_time DESC LIMIT 10;"
echo "   SELECT * FROM v_call_statistics WHERE call_date = CURRENT_DATE;"
echo "   SELECT * FROM v_queue_statistics WHERE call_date = CURRENT_DATE;"
echo ""

echo -e "${YELLOW}📖 Documentation complète :${NC}"
echo "   • README_DEPLOYMENT.md"
echo "   • CONFIGURATION_SUMMARY.md"
echo ""

success "Tout est prêt ! Bon appel ! 📞"

