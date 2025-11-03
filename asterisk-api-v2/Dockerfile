# Dockerfile pour l'API NestJS v2
# Stage 1: Build
FROM node:18-alpine AS builder

# Installer les dépendances système nécessaires pour bcrypt et le build
RUN apk add --no-cache python3 make g++

# Créer le répertoire de l'application
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (y compris devDependencies pour le build)
RUN npm install

# Copier les fichiers de configuration TypeScript
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY ormconfig.ts ./

# Copier le code source
COPY src ./src

# Compiler TypeScript - Le build produit dist/src/main.js
RUN npm run build && \
    ls -la dist/ && \
    ls -la dist/src/ && \
    test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found after build!" && exit 1)

# Stage 2: Production
FROM node:18-alpine

# Installer les dépendances système nécessaires pour bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copier package.json pour installer les dépendances de production
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm install --omit=dev && npm cache clean --force

# Rebuild bcrypt pour l'architecture du conteneur
RUN npm rebuild bcrypt --build-from-source

# Copier les fichiers compilés depuis le stage builder
COPY --from=builder /app/dist ./dist

# Copier ormconfig pour TypeORM (migrations, etc.)
COPY ormconfig.ts ./

# Vérifier que main.js existe dans l'image finale
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found in final image!" && exit 1)

# Exposer le port
EXPOSE 3001

# Variable d'environnement par défaut
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "dist/src/main.js"]