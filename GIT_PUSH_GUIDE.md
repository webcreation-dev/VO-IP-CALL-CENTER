# 📤 Guide pour pusher sur votre serveur Git

## ✅ Vérifications effectuées

Tous les `.gitignore` ont été vérifiés et complétés pour protéger :
- ✅ Fichiers `.env` (credentials et configurations sensibles)
- ✅ `node_modules/` (dépendances NPM)
- ✅ Volumes Docker PostgreSQL (`api-pgdata/`, `.pgdata/`)
- ✅ Logs (`*.log`, `log/`, `logs/`)
- ✅ Fichiers temporaires
- ✅ Fichiers IDE (`.vscode/`, `.idea/`)
- ✅ Clés Asterisk (`etc/asterisk/keys/`)

## 📁 Trois dossiers à pusher

1. **asterisk-api-v2** - Backend NestJS
2. **asterisk-pgsql** - Configuration Docker + Asterisk
3. **call-center-admin** - Frontend React

## 🚀 Commandes Git

### Option 1 : Push individuel de chaque dossier

```bash
# ================================================
# 1. Backend (asterisk-api-v2)
# ================================================
cd "/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk/asterisk-api-v2"

# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers (en respectant .gitignore)
git add .

# Vérifier ce qui sera commité
git status

# Créer le commit
git commit -m "feat: Backend NestJS Asterisk multi-tenant avec ~150 endpoints

- Authentification JWT complète
- Gestion tenants, endpoints, queues, IVR
- Intégration AMI/ARI
- PostgreSQL Realtime
- ~150 endpoints fonctionnels"

# Ajouter le remote (remplacez par votre URL)
git remote add origin YOUR_GIT_URL_BACKEND

# Push
git push -u origin main


# ================================================
# 2. Docker/Asterisk (asterisk-pgsql)
# ================================================
cd "/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk/asterisk-pgsql"

git init
git add .
git status

git commit -m "feat: Configuration Docker pour Asterisk + PostgreSQL

- Docker compose complet
- Configuration Asterisk (PJSIP, AMI, ARI)
- Scripts d'initialisation PostgreSQL
- Support multi-tenant"

git remote add origin YOUR_GIT_URL_DOCKER

git push -u origin main


# ================================================
# 3. Frontend (call-center-admin)
# ================================================
cd "/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk/call-center-admin"

git init
git add .
git status

git commit -m "feat: Frontend React customer service pour Call Center

- React 18 + TypeScript + Vite
- TailwindCSS v4
- Authentification JWT
- Dashboard avec statistiques
- Structure complète pour 13 modules
- Types TypeScript pour 150+ endpoints
- TanStack Query pour cache API"

git remote add origin YOUR_GIT_URL_FRONTEND

git push -u origin main
```

### Option 2 : Mono-repo (tous dans un seul repo)

```bash
# Créer un repo parent
cd "/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk"

git init

# Créer un .gitignore global
cat > .gitignore << 'EOF'
# Ignorer les fichiers sensibles globalement
**/.env
**/.env.local
**/node_modules/
**/dist/
**/*.log
**/.DS_Store

# Ignorer les volumes Docker
**/api-pgdata/
**/*-pgdata/
EOF

git add .
git status

git commit -m "feat: Projet complet Asterisk Multi-Tenant Call Center

Modules :
- asterisk-api-v2: Backend NestJS avec 150+ endpoints
- asterisk-pgsql: Configuration Docker + Asterisk
- call-center-admin: Frontend React moderne

Stack technique :
- Backend: NestJS, TypeScript, PostgreSQL, AMI/ARI
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Infrastructure: Docker, Asterisk PJSIP, PostgreSQL Realtime"

git remote add origin YOUR_GIT_URL

git push -u origin main
```

## ⚠️ IMPORTANT : Avant de pusher

### 1. Vérifiez que les .env ne seront PAS inclus

```bash
# Backend
cd asterisk-api-v2
git status | grep -i ".env"  # Ne devrait rien retourner

# Frontend
cd ../call-center-admin
git status | grep -i ".env"  # Ne devrait rien retourner

# Docker
cd ../asterisk-pgsql
git status | grep -i ".env"  # Ne devrait rien retourner
```

### 2. Vérifiez que node_modules est ignoré

```bash
cd asterisk-api-v2
git status | grep -i "node_modules"  # Ne devrait rien retourner

cd ../call-center-admin
git status | grep -i "node_modules"  # Ne devrait rien retourner
```

### 3. Vérifiez que les volumes Docker sont ignorés

```bash
cd ../asterisk-pgsql
git status | grep -i "pgdata"  # Ne devrait rien retourner
```

## 📊 Tailles approximatives (sans fichiers ignorés)

- **asterisk-api-v2** : ~5-10 MB (code source uniquement)
- **asterisk-pgsql** : ~2-5 MB (configs + scripts)
- **call-center-admin** : ~3-5 MB (code source uniquement)

**Total** : ~10-20 MB (très raisonnable)

## 🔐 Fichiers sensibles protégés

Les fichiers suivants NE SERONT PAS pushés (grâce aux .gitignore) :

- ✅ `.env` (tous les projets)
- ✅ `node_modules/` (50-200 MB par projet)
- ✅ `api-pgdata/` (données PostgreSQL, potentiellement Go)
- ✅ `*.log` (logs)
- ✅ `dist/` (build compilés)
- ✅ `etc/asterisk/keys/` (clés sensibles)

## 📝 Après le push

### Sur le serveur, pour cloner et démarrer

```bash
# Cloner les repos
git clone YOUR_GIT_URL_BACKEND asterisk-api-v2
git clone YOUR_GIT_URL_DOCKER asterisk-pgsql
git clone YOUR_GIT_URL_FRONTEND call-center-admin

# Backend
cd asterisk-api-v2
cp .env.example .env
# Éditer .env avec vos valeurs
npm install
npm run start:dev

# Frontend
cd ../call-center-admin
cp .env.example .env
# Éditer .env avec vos valeurs
npm install
npm run dev

# Docker
cd ../asterisk-pgsql
docker-compose up -d
```

## ✨ Vous êtes prêt !

Tous les fichiers sensibles sont protégés. Vous pouvez maintenant pusher en toute sécurité !
