# Call Center Admin - Frontend

Interface d'administration React pour le système de centre d'appels Asterisk multi-tenant.

## 🚀 Stack Technique

- **React 18** + **TypeScript**
- **Vite** - Build tool ultra-rapide
- **React Router v6** - Routing
- **Redux Toolkit** - State management
- **TanStack Query** - Data fetching/caching
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Sonner** - Notifications
- **Lucide React** - Icônes

## 🔧 Démarrage Rapide

```bash
npm install
npm run dev
```

Frontend : **http://localhost:5173/**
Backend API : **http://localhost:3001/api/v1**

## ✅ Implémenté (Sprint 1 - Partie 1)

### Authentification
- ✅ Page login avec validation
- ✅ JWT storage + Redux
- ✅ Routes protégées par rôle
- ✅ Notifications toast

### Infrastructure
- ✅ Config Vite + TypeScript + Tailwind
- ✅ Axios avec intercepteurs JWT
- ✅ Redux Toolkit + React Query
- ✅ Structure dossiers complète
- ✅ Types TypeScript (User, Tenant, Queue, etc.)

## 📁 Structure

```
src/
├── api/           # Clients API (auth, tenants)
├── features/      # Pages (auth, dashboard, tenants...)
├── components/    # Composants réutilisables
├── store/         # Redux (authSlice)
├── routes/        # ProtectedRoute, RoleBasedRoute
├── hooks/         # useAuth
├── types/         # Types TypeScript
└── utils/         # Constants, formatters
```

## 🎯 Prochaines Étapes

- [ ] DashboardLayout avec sidebar
- [ ] Dashboard temps réel (KPIs)
- [ ] Gestion Tenants (CRUD)
- [ ] Gestion Endpoints SIP
- [ ] Gestion Queues
- [ ] Softphone intégré

## 🔐 Login

```
Email: admin@asterisk.local
Password: [à configurer dans le backend]
```

**Status** : 🟢 Phase 1 complétée | **Next** : Dashboard + Tenants
