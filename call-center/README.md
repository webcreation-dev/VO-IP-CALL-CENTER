# Call Center Admin - Interface d'administration

Interface d'administration moderne pour la gestion d'un centre d'appels basé sur Asterisk.

## 🚀 Caractéristiques

- **Dashboard temps réel** : Monitoring des appels, files d'attente et agents via WebSocket
- **Gestion des agents** : Création, modification et supervision des endpoints SIP
- **Files d'attente** : Configuration et monitoring des queues Asterisk
- **Multi-tenancy** : Support complet de l'architecture multi-tenant
- **Authentification JWT** : Système de rôles et permissions (ADMIN, SUPERVISOR, AGENT)
- **Interface moderne** : React + TypeScript + TailwindCSS

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Backend asterisk-api-v2 en cours d'exécution

## 🛠️ Installation

```bash
# Cloner le projet
git clone [repository-url]
cd call-center-admin

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet :

```env
# API Configuration
VITE_API_URL=http://161.97.106.134:3000/api/v1
VITE_WS_URL=http://161.97.106.134:3000

# Asterisk Configuration
VITE_AMI_HOST=161.97.106.134
VITE_ARI_HOST=161.97.106.134

# Application
VITE_APP_NAME=Call Center Admin
VITE_APP_VERSION=1.0.0
VITE_ENV=development
```

## 🚀 Démarrage

```bash
# Mode développement
npm run dev

# Build production
npm run build

# Prévisualiser le build
npm run preview
```

L'application sera accessible à : http://localhost:5173

## 📁 Structure du projet

```
call-center-admin/
├── src/
│   ├── api/              # Services API (axios, websocket)
│   │   ├── config.ts     # Configuration axios
│   │   ├── auth.ts       # Service authentification
│   │   ├── endpoints.ts  # Service endpoints SIP
│   │   ├── queues.ts     # Service files d'attente
│   │   └── websocket.ts  # Manager WebSocket
│   ├── components/       # Composants réutilisables
│   │   ├── ui/          # Composants UI (Button, Card, etc.)
│   │   └── auth/        # Composants d'authentification
│   ├── features/        # Modules métier (à développer)
│   │   ├── dashboard/
│   │   ├── agents/
│   │   ├── queues/
│   │   └── ivr/
│   ├── pages/           # Pages principales
│   │   ├── Login.tsx
│   │   └── Dashboard.tsx
│   ├── store/           # État global (Zustand)
│   │   ├── authStore.ts
│   │   ├── uiStore.ts
│   │   └── monitoringStore.ts
│   ├── lib/            # Utilitaires
│   └── App.tsx         # Composant racine
```

## 🔐 Authentification

L'application utilise JWT pour l'authentification. Les rôles disponibles sont :

- **SUPER_ADMIN** : Accès total au système
- **ADMIN** : Administration complète
- **TENANT_ADMIN** : Administration d'un tenant spécifique
- **SUPERVISOR** : Supervision des agents et files
- **AGENT** : Accès limité aux fonctions d'agent

## 🎨 Technologies utilisées

- **React 18** avec TypeScript
- **Vite** pour le build et le dev server
- **TailwindCSS** pour le styling
- **Zustand** pour la gestion d'état
- **React Query** pour le cache et la synchronisation
- **Socket.IO Client** pour le temps réel
- **React Router** pour le routing
- **React Hook Form + Zod** pour les formulaires
- **Axios** pour les appels API
- **Lucide React** pour les icônes

## 📊 Fonctionnalités principales

### Dashboard
- Statistiques en temps réel
- Monitoring des appels actifs
- État des files d'attente
- Performance des agents

### Gestion des Agents (À développer)
- Liste des endpoints avec statut temps réel
- Création/modification d'endpoints
- Actions : pause, déconnexion, etc.

### Files d'Attente (À développer)
- Configuration des stratégies
- Gestion des membres
- Statistiques détaillées
- Actions de supervision

### Système IVR (À développer)
- Designer visuel drag & drop
- Gestion des menus et options
- Upload de fichiers audio
- Test et validation

## 🔄 API Endpoints utilisés

Le backend expose les modules suivants :
- `/auth` - Authentification et gestion des utilisateurs
- `/tenants` - Gestion multi-tenant
- `/endpoints` - Endpoints SIP/PJSIP
- `/queues` - Files d'attente
- `/channels` - Appels actifs
- `/ivr` - Système IVR
- `/statistics` - Statistiques et rapports

## 🚧 Développement

### Prochaines étapes

1. **Pages Agents** : Interface complète de gestion des endpoints
2. **Pages Files** : Gestion avancée des queues
3. **Centre d'appels live** : Vue temps réel des appels
4. **Système IVR** : Designer visuel pour créer des menus
5. **Rapports** : Tableaux de bord analytiques
6. **CDR** : Historique des appels avec filtres

### Commandes utiles

```bash
# Linter
npm run lint

# Tests (à configurer)
npm test

# Build et analyse
npm run build
```

## 📝 Notes

- L'application se connecte automatiquement au WebSocket lors de la connexion
- Les données sont mises à jour en temps réel toutes les 5 secondes
- Le token JWT est stocké dans localStorage
- L'isolation des données par tenant est gérée automatiquement

## 🤝 Contribution

Pour contribuer au projet :

1. Fork le repository
2. Créez une branche pour votre feature
3. Committez vos changements
4. Pushez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

[À définir]

## 📞 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

Développé avec ❤️ pour la gestion de centres d'appels Asterisk