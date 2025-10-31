# Dockerfile pour l'API NestJS v2
FROM node:18-alpine

# Installer les dépendances système nécessaires pour bcrypt
RUN apk add --no-cache python3 make g++

# Créer le répertoire de l'application
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm install && npm cache clean --force

# Copier le code source
COPY . .

# Rebuild bcrypt pour l'architecture du conteneur
RUN npm rebuild bcrypt --build-from-source

# Compiler TypeScript
RUN npm run build

# Supprimer les devDependencies après le build
RUN npm prune --omit=dev

# Exposer le port
EXPOSE 3001

# Variable d'environnement par défaut
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "dist/main.js"]
