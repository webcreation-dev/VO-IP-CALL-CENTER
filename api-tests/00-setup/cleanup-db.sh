#!/bin/bash

##############################################################################
# Script de nettoyage de la base de données
# Vide toutes les tables sauf 'users' pour préserver l'authentification
##############################################################################

# Configuration PostgreSQL
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-asterisk_api}"
PGUSER="${PGUSER:-api_user}"
PGPASSWORD="${PGPASSWORD:-ApiSecurePass2025!}"

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
# NETTOYAGE DE LA BASE DE DONNÉES
##############################################################################

echo "=========================================="
echo "    NETTOYAGE BASE DE DONNÉES"
echo "=========================================="
echo ""

info "Database: $PGDATABASE"
info "Host: $PGHOST:$PGPORT"
info "User: $PGUSER"
echo ""

# Export password for psql
export PGPASSWORD

# Vérifier la connexion
info "Vérification de la connexion..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    error "Impossible de se connecter à la base de données"
    error "Vérifiez que le conteneur PostgreSQL est démarré"
    exit 1
fi

success "Connexion réussie"
echo ""

# Liste des tables à vider (toutes sauf users)
# Les tables sont vidées dans un ordre qui respecte les contraintes de clés étrangères
info "Nettoyage des tables..."
echo ""

# Compter les enregistrements avant nettoyage
BEFORE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "
SELECT
    SUM(n_tup_ins - n_tup_del)
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname != 'users' AND relname != 'migrations';
" | tr -d ' ')

info "Total enregistrements (hors users/migrations): $BEFORE_COUNT"
echo ""

# Nettoyage sélectif en préservant les super admins
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" <<EOF
-- Désactiver les triggers pour éviter les problèmes de contraintes
SET session_replication_role = 'replica';

-- IMPORTANT: Supprimer seulement les app_users liés à un tenant
-- Les super admins (tenant_id IS NULL) sont préservés
DELETE FROM app_users WHERE tenant_id IS NOT NULL;

-- Vider les tables dans l'ordre inverse des dépendances
-- Tables dépendantes d'abord

-- 1. Queue members
TRUNCATE TABLE queue_members;

-- 2. Extensions
TRUNCATE TABLE extensions;

-- 3. Queues
TRUNCATE TABLE queues;

-- 4. Sound files
TRUNCATE TABLE sound_files;

-- 5. MoH classes
TRUNCATE TABLE moh_classes;

-- 6. SIP Trunks / Registrations
TRUNCATE TABLE sip_trunks;

-- 7. PJSIP Endpoints (FIX: nom correct de la table)
DELETE FROM ps_endpoints WHERE tenant_id IS NOT NULL;
TRUNCATE TABLE ps_auths;
TRUNCATE TABLE ps_aors;

-- 8. Tenant Contexts
TRUNCATE TABLE tenant_contexts;

-- 9. Tenants (PAS de CASCADE pour ne pas supprimer app_users)
TRUNCATE TABLE tenants;

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- Afficher le statut
SELECT
    tablename,
    n_tup_ins - n_tup_del as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND relname NOT IN ('users', 'migrations')
ORDER BY tablename;
EOF

if [ $? -ne 0 ]; then
    error "Erreur lors du nettoyage de la base de données"
    exit 1
fi

# Compter les enregistrements après nettoyage
AFTER_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "
SELECT
    SUM(n_tup_ins - n_tup_del)
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND relname != 'users' AND relname != 'migrations';
" | tr -d ' ')

echo ""
success "Base de données nettoyée avec succès"
info "Enregistrements supprimés: $BEFORE_COUNT"
info "Enregistrements restants (hors users/migrations): $AFTER_COUNT"
echo ""

# Vérifier que les super admins existent toujours
ADMIN_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "
SELECT COUNT(*) FROM app_users WHERE tenant_id IS NULL;
" | tr -d ' ')

if [ "$ADMIN_COUNT" -gt 0 ]; then
    success "Super admins préservés: $ADMIN_COUNT utilisateur(s)"
else
    error "ATTENTION: Aucun super admin - l'authentification ne fonctionnera pas"
fi

echo ""
success "Nettoyage terminé - La base de données est prête pour les tests"
echo ""

exit 0
