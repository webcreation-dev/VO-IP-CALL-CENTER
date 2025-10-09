#!/bin/bash
set -e

echo "🚀 Démarrage d'Asterisk..."

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."
until pg_isready -h db -p 5432 -U asterisk; do
  echo "PostgreSQL n'est pas encore prêt - attente..."
  sleep 2
done

echo "✅ PostgreSQL est prêt!"

# Vérifier les fichiers de configuration
if [ ! -f /etc/asterisk/asterisk.conf ]; then
    echo "❌ Erreur: asterisk.conf non trouvé!"
    exit 1
fi

echo "📝 Configuration d'Asterisk chargée depuis /etc/asterisk"

# Créer les répertoires si nécessaire
mkdir -p /var/run/asterisk /var/log/asterisk /var/lib/asterisk /var/spool/asterisk

# Donner les permissions
chown -R asterisk:asterisk /var/run/asterisk /var/log/asterisk /var/lib/asterisk /var/spool/asterisk 2>/dev/null || true

# Tester la connexion PostgreSQL
echo "🔍 Test de connexion PostgreSQL..."
export PGPASSWORD=asterisk
if psql -h db -U asterisk -d asterisk -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connexion PostgreSQL OK"
else
    echo "⚠️  Avertissement: Impossible de se connecter à PostgreSQL"
fi

echo "🎯 Lancement d'Asterisk..."
exec "$@"