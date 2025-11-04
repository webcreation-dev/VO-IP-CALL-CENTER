# 🚀 Guide de démarrage rapide

## ✅ Le frontend est prêt !

Tout est configuré et fonctionnel. Suivez simplement ces étapes :

## 📋 Étapes de démarrage

### 1. Démarrer le backend (si ce n'est pas déjà fait)

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/asterisk-api-v2
npm run start:dev
# Backend disponible sur http://localhost:3001
```

### 2. Démarrer le frontend

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/call-center-admin
npm run dev
# Frontend disponible sur http://localhost:5173
```

### 3. Se connecter

Ouvrez votre navigateur sur **http://localhost:5173**

**Identifiants par défaut :**
```
Email: admin@example.com
Mot de passe: admin123
```

## 🎨 Ce qui est disponible

### ✅ Modules fonctionnels (MVP)

- **Login** - Authentification JWT complète
- **Dashboard** - Vue d'ensemble avec statistiques
- **Navigation** - Sidebar + Header responsive
- **Protected Routes** - Sécurité par rôles

### 🚧 Modules avec placeholders

Tous les autres modules ont des routes configurées et affichent un placeholder "En cours de développement" :

- Tenants
- Users
- Contexts
- Endpoints SIP
- Queues
- IVR
- Extensions
- Channels
- CDR
- Recordings
- Monitoring
- Statistics

## 🔧 Configuration

Les variables d'environnement sont dans `.env` :

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_API_PREFIX=/api/v1
VITE_WS_URL=ws://localhost:3001
```

## 🏗️ Architecture

```
Frontend (React) → http://localhost:5173
    ↓
Backend (NestJS) → http://localhost:3001
    ↓
PostgreSQL → localhost:5432
    ↓
Asterisk → AMI (5038) + ARI (8088)
```

## 📦 Technologies utilisées

- **React 18** + **TypeScript**
- **Vite** (build ultra-rapide)
- **TailwindCSS v4** (styling moderne)
- **React Router** (navigation)
- **TanStack Query** (cache & synchronisation)
- **Axios** (HTTP client avec intercepteurs)
- **Lucide React** (icônes)

## 🎯 Prochaines étapes

1. **Tester l'authentification** - Login/Logout
2. **Explorer le Dashboard** - Voir les stats
3. **Tester la navigation** - Sidebar responsive
4. **Implémenter les modules** - Commencer par Endpoints ou Queues

## 🐛 Debugging

- **React Query Devtools** : En bas à gauche (mode dev)
- **Console Browser** : F12 pour voir les logs
- **Network Tab** : Voir les requêtes API

## 💡 Tips

- Le token JWT est stocké dans `localStorage`
- Les rôles sont vérifiés côté frontend ET backend
- Les routes sont protégées automatiquement
- Hot-reload activé (modifications en temps réel)

## 📞 Support

Si vous avez des questions ou besoin d'aide pour implémenter un module spécifique, demandez !

---

✨ **Le projet est prêt à être utilisé et développé !**
