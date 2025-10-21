#!/bin/bash
# ========================================
# Génération de certificats SSL auto-signés pour WebRTC
# ========================================
# Ce script génère des certificats pour le développement.
# En PRODUCTION, utilisez Let's Encrypt ou des certificats CA valides.
# ========================================

set -e

KEYS_DIR="/etc/asterisk/keys"
DOMAIN="asterisk.local"

echo "========================================="
echo "Génération des certificats SSL pour WebRTC"
echo "========================================="

# Créer le répertoire s'il n'existe pas
mkdir -p "${KEYS_DIR}"

# Générer une clé privée et un certificat auto-signé
openssl req -x509 -newkey rsa:4096 \
  -keyout "${KEYS_DIR}/privkey.pem" \
  -out "${KEYS_DIR}/fullchain.pem" \
  -days 365 -nodes \
  -subj "/C=BJ/ST=Littoral/L=Cotonou/O=VoIP Platform/OU=Asterisk/CN=${DOMAIN}"

# Définir les permissions appropriées
chmod 600 "${KEYS_DIR}/privkey.pem"
chmod 644 "${KEYS_DIR}/fullchain.pem"

echo "========================================="
echo "✓ Certificats générés avec succès dans ${KEYS_DIR}"
echo "  - ${KEYS_DIR}/privkey.pem"
echo "  - ${KEYS_DIR}/fullchain.pem"
echo "========================================="
echo ""
echo "ATTENTION: Ces certificats sont auto-signés (développement uniquement)"
echo "Pour la production, utilisez Let's Encrypt ou un CA reconnu"
echo ""
echo "Validité: 365 jours"
echo "Domaine: ${DOMAIN}"
echo "========================================="
