#!/bin/bash

# Script d'installation des certificats SSL pour Asterisk WebRTC
# Usage: sudo ./install-certificates.sh

echo "🔐 Installation des certificats SSL pour Asterisk..."

# Créer le dossier si nécessaire
mkdir -p /etc/asterisk/certs

# Copier les certificats
cp /tmp/asterisk-certs/fullchain.pem /etc/asterisk/certs/fullchain.pem
cp /tmp/asterisk-certs/privkey.pem /etc/asterisk/certs/privkey.pem

# Définir les permissions
chmod 644 /etc/asterisk/certs/fullchain.pem
chmod 600 /etc/asterisk/certs/privkey.pem

echo "✅ Certificats installés avec succès dans /etc/asterisk/certs/"
echo ""
echo "📋 Fichiers créés:"
ls -la /etc/asterisk/certs/

echo ""
echo "🔄 Redémarre maintenant Asterisk avec:"
echo "   cd '/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk' && docker restart asterisk"
