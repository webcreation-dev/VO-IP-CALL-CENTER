#!/bin/bash

# Script de déploiement de l'API NestJS v2 sur le serveur
# Usage: ./deploy.sh [server_user@server_ip]

set -e  # Arrêter en cas d'erreur

# Configuration
SERVER=${1:-"root@161.97.106.134"}
REMOTE_API_DIR="/opt/asterisk/asterisk-api-v2"
REMOTE_COMPOSE_DIR="/opt/asterisk/asterisk-pgsql"
LOCAL_DIR="$(pwd)"
LOCAL_COMPOSE_DIR="$(dirname "$LOCAL_DIR")/asterisk-pgsql"

echo "🚀 Déploiement de l'API NestJS v2 sur $SERVER"

# 1. Créer les répertoires distants si nécessaire
echo "📁 Création des répertoires distants..."
ssh $SERVER "mkdir -p $REMOTE_API_DIR && mkdir -p $REMOTE_COMPOSE_DIR"

# 2. Copier les fichiers de l'API (exclure node_modules et dist)
echo "📦 Copie des fichiers de l'API..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'coverage' \
  --exclude '.nyc_output' \
  --exclude '*.log' \
  $LOCAL_DIR/ $SERVER:$REMOTE_API_DIR/

# 3. Copier le docker-compose.yml mis à jour
echo "📋 Copie du docker-compose.yml..."
rsync -avz $LOCAL_COMPOSE_DIR/docker-compose.yml $SERVER:$REMOTE_COMPOSE_DIR/

# 4. Construire et démarrer uniquement le service api-v2
echo "🐳 Construction et démarrage du conteneur api-v2..."
ssh $SERVER "cd $REMOTE_COMPOSE_DIR && docker-compose up -d --build api-v2"

# 5. Attendre que le conteneur démarre
echo "⏳ Attente du démarrage (15 secondes)..."
sleep 15

# 6. Vérifier les logs
echo "📋 Logs du conteneur api-v2:"
ssh $SERVER "cd $REMOTE_COMPOSE_DIR && docker-compose logs --tail=100 api-v2"

# 7. Vérifier que l'API répond
echo ""
echo "✅ Test de l'API..."
ssh $SERVER "curl -s http://localhost:3001/api/v1/health | head -20" || echo "⚠️  L'API ne répond pas encore (normal si première fois)"

echo ""
echo "✨ Déploiement terminé!"
echo "📍 API v2 accessible sur: http://161.97.106.134:3001/api/v1"
echo "📍 API v1 (ancienne) toujours sur: http://161.97.106.134:3000"
echo "📊 Swagger v2: http://161.97.106.134:3001/api/v1/docs"
echo ""
echo "🔧 Commandes utiles:"
echo "  - Voir les logs: ssh $SERVER 'cd $REMOTE_COMPOSE_DIR && docker-compose logs -f api-v2'"
echo "  - Redémarrer: ssh $SERVER 'cd $REMOTE_COMPOSE_DIR && docker-compose restart api-v2'"
echo "  - Arrêter: ssh $SERVER 'cd $REMOTE_COMPOSE_DIR && docker-compose stop api-v2'"
echo "  - Statut: ssh $SERVER 'cd $REMOTE_COMPOSE_DIR && docker-compose ps'"
