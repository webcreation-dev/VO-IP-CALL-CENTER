# Call Center Admin - Frontend Customer Service

Interface d'administration pour le système Asterisk multi-tenant.

## 🚀 Stack Technique

- **React 18** + **TypeScript**
- **Vite** (Build ultra-rapide)
- **TailwindCSS** (Styling moderne)
- **React Router** (Navigation)
- **TanStack Query** (Gestion état serveur)
- **Axios** (Client HTTP)
- **Recharts** (Graphiques)
- **Lucide React** (Icônes)
- **SIP.js** (WebRTC Softphone)

## 📋 Prérequis

- **Node.js** >= 18
- **npm** ou **yarn**
- **Backend API** en cours d'exécution sur `http://localhost:3001`

## 🔧 Installation

```bash
# Installer les dépendances
npm install

# Vérifier les variables d'environnement
cat .env
```

## 🏃 Démarrage

```bash
# Mode développement (avec hot-reload)
npm run dev

# L'application sera accessible sur http://localhost:5173
```

## 🔑 Identifiants par défaut

```
Email: admin@example.com
Mot de passe: admin123
```

## 📁 Structure du Projet

```
src/
├── components/
│   ├── layout/          # Layout, Sidebar, Header
│   ├── ui/              # Composants UI réutilisables
│   ├── forms/           # Formulaires
│   ├── tables/          # Tables
│   ├── charts/          # Graphiques
│   └── softphone/       # Softphone WebRTC
├── pages/
│   ├── auth/            # Login
│   ├── dashboard/       # Dashboard
│   ├── tenants/         # Gestion tenants
│   ├── users/           # Gestion utilisateurs
│   ├── contexts/        # Contextes
│   ├── endpoints/       # Endpoints SIP
│   ├── queues/          # Files d'attente
│   ├── ivr/             # Configuration IVR
│   ├── extensions/      # Extensions/Dialplan
│   ├── channels/        # Canaux actifs
│   ├── cdr/             # Historique appels
│   ├── recordings/      # Enregistrements
│   ├── monitoring/      # Monitoring
│   └── statistics/      # Statistiques
├── hooks/
│   ├── useAuth.ts       # Hook authentification
│   └── useApi.ts        # Hook API
├── services/
│   ├── api.ts           # Client Axios
│   └── websocket.ts     # WebSocket client
├── types/
│   └── api.d.ts         # Types TypeScript
└── lib/
    └── utils.ts         # Utilitaires
```

## 🎨 Modules Disponibles

### ✅ Modules implémentés

- [x] **Authentification** - Login avec JWT
- [x] **Dashboard** - Vue d'ensemble avec statistiques
- [x] **Layout** - Sidebar + Header responsive

### 🚧 Modules en développement

- [ ] **Tenants** - Gestion des tenants (SUPER_ADMIN)
- [ ] **Users** - Gestion des utilisateurs
- [ ] **Contexts** - Gestion des contextes par tenant
- [ ] **Endpoints SIP** - CRUD endpoints + statut temps réel
- [ ] **Queues** - Files d'attente + membres + stats
- [ ] **IVR** - Configuration IVR complète
- [ ] **Extensions** - Dialplan avec templates
- [ ] **Channels** - Canaux actifs + actions
- [ ] **CDR** - Historique + export CSV
- [ ] **Recordings** - Enregistrements + lecture audio
- [ ] **Monitoring** - Temps réel WebSocket
- [ ] **Statistics** - Graphiques avancés
- [ ] **Softphone** - WebRTC SIP.js

## 📡 API Endpoints utilisés

L'application s'intègre avec les ~150 endpoints du backend :

- `POST /auth/login` - Connexion
- `GET /auth/me` - Profil utilisateur
- `GET /statistics/dashboard` - Stats dashboard
- `GET /tenants` - Liste tenants
- `GET /endpoints/enriched/all` - Endpoints avec AMI
- `GET /queues/enriched` - Queues avec stats
- `GET /ivr/menus` - Menus IVR
- `GET /channels` - Canaux actifs
- `GET /cdr` - Historique appels
- etc.

## 🔐 Authentification

- **JWT** stocké dans `localStorage`
- **Protected Routes** avec vérification de rôles
- **Interception Axios** pour ajout automatique du token
- **Redirection auto** vers login si token expiré

## 🛠️ Commandes Disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview build production
npm run preview

# Linter
npm run lint
```

## 📝 TODO

- [ ] Implémenter tous les modules (Tenants, Users, etc.)
- [ ] Ajouter formulaires de création/édition
- [ ] Intégrer WebSocket pour temps réel
- [ ] Ajouter tests unitaires (Vitest)
- [ ] Optimiser performances

## 📄 Licence

MIT
