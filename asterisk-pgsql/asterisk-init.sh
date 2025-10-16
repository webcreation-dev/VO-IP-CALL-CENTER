#!/bin/bash
# Script d'initialisation automatique pour Asterisk
# Exécuté au démarrage du conteneur

echo "🚀 Initialisation Asterisk - Configuration automatique"

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p /var/lib/asterisk/moh
mkdir -p /var/lib/asterisk/sounds/custom
mkdir -p /var/spool/asterisk/monitor

# Définir les permissions
echo "🔒 Configuration des permissions..."
chown -R asterisk:asterisk /var/lib/asterisk/moh
chown -R asterisk:asterisk /var/lib/asterisk/sounds/custom
chown -R asterisk:asterisk /var/spool/asterisk/monitor
chmod 755 /var/lib/asterisk/moh
chmod 755 /var/lib/asterisk/sounds/custom
chmod 755 /var/spool/asterisk/monitor

echo "✅ Initialisation terminée avec succès"

# Lancer Asterisk normalement
exec "$@"

