# 📚 Documentation API - Asterisk Call Center Backend

Ce dossier contient toute la documentation de l'API backend pour tester dans Postman.

---

## 📋 Fichiers Disponibles

### 🎯 Documentation Principale

#### **COMPLETE_API_DOCUMENTATION.md**
**👉 FICHIER PRINCIPAL - TOUT EST LÀ !**
- Documentation exhaustive de **TOUS les endpoints** (136 endpoints)
- 18 modules documentés avec exemples
- Descriptions complètes de chaque endpoint
- Body JSON, paramètres, query strings
- Contrôles d'accès et rôles
- Scénarios de test recommandés

---

### 📝 Fichiers de Test Postman (curl format)

Ces fichiers contiennent des requêtes HTTP prêtes à être copiées dans Postman:

#### **01-auth.txt**
- Module: Authentification
- Endpoints: 3
  - POST /auth/login
  - GET /auth/me
  - POST /auth/refresh

#### **02-tenants.txt**
- Module: Gestion des Tenants
- Endpoints: 7
  - GET /tenants (liste)
  - POST /tenants (créer)
  - GET /tenants/me (mon tenant)
  - GET /tenants/:id (par ID)
  - PATCH /tenants/:id (modifier)
  - DELETE /tenants/:id (supprimer)
  - PATCH /tenants/:id/restore (restaurer)

#### **04-endpoints.txt**
- Module: Endpoints SIP (PJSIP)
- Endpoints: 9
  - GET /endpoints (liste)
  - GET /endpoints/enriched/all (avec AMI)
  - GET /tenants/:tenantId/endpoints (par tenant)
  - POST /endpoints (créer)
  - GET /endpoints/:username (détails)
  - GET /endpoints/:username/status (statut AMI)
  - GET /endpoints/:username/details (détails complets)
  - PATCH /endpoints/:username (modifier)
  - POST /endpoints/:username/disconnect (déconnecter)
  - DELETE /endpoints/:username (supprimer)

#### **05-queues.txt**
- Module: Files d'Attente
- Endpoints: 11
  - GET /queues (liste)
  - GET /queues/enriched (avec stats AMI)
  - GET /queues/stats/global (stats globales)
  - GET /tenants/:tenantId/queues (par tenant)
  - POST /queues (créer)
  - GET /queues/:name (par nom)
  - GET /queues/:name/stats (stats temps réel)
  - GET /queues/:name/details (détails complets)
  - GET /queues/:name/calls (appels en attente)
  - PATCH /queues/:name (modifier)
  - POST /queues/:name/reload (recharger)
  - DELETE /queues/:name (supprimer)

#### **API_DOCUMENTATION.md** (ancienne version partielle)
⚠️ **OBSOLÈTE** - Utilisez `COMPLETE_API_DOCUMENTATION.md` à la place
- Version incomplète avec seulement 5 modules
- Gardée pour référence historique

---

## 🚀 Comment Utiliser

### Étape 1: S'Authentifier

```bash
POST http://localhost:3001/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@asterisk.local",
  "password": "Admin123!"
}
```

**Copier le `accessToken` de la réponse**

### Étape 2: Utiliser le Token

Pour toutes les autres requêtes, ajouter le header:
```
Authorization: Bearer <LE_TOKEN_COPIÉ>
```

### Étape 3: Tester les Modules

Utilisez les fichiers `.txt` correspondants et copiez-collez les requêtes dans Postman.

---

## 📊 Vue d'Ensemble des Modules

### Modules Core (Base)
1. **Auth** - Authentification JWT
2. **Tenants** - Organisations multi-tenant
3. **Endpoints** - Extensions SIP (PJSIP)
4. **Queues** - Files d'attente ACD
5. **Queue Members** - Membres des queues
6. **Extensions** - Dialplan Asterisk

### Modules Avancés
7. **Statistics** - Statistiques et analytics
8. **Recordings** - Enregistrements d'appels
9. **CDR** - Historique détaillé des appels
10. **Channels** - Gestion canaux actifs
11. **Monitoring** - Surveillance temps réel

### Modules IVR
12. **IVR Menus** - Menus interactifs
13. **IVR Options** - Options de menu
14. **IVR Conditions** - Routage conditionnel
15. **IVR DID Mappings** - Mapping numéros → menus
16. **IVR Audio** - Fichiers audio et TTS

### Modules Système
17. **Asterisk** - Contrôle serveur Asterisk
18. **Metadata** - Énumérations et métadonnées

---

## 🎯 Scénarios de Test Recommandés

### 1️⃣ Setup Initial
```
1. Login admin
2. Créer Tenant 1 (company1)
3. Créer Tenant 2 (company2)
4. Vérifier isolation
```

### 2️⃣ Configuration Endpoints
```
1. Créer endpoint t1_101 (Tenant 1)
2. Créer endpoint t1_102 (Tenant 1)
3. Créer endpoint t2_101 (Tenant 2)
4. Vérifier avec /endpoints/enriched/all
```

### 3️⃣ Queues et Membres
```
1. Créer queue "support" (Tenant 1)
2. Ajouter membres 101, 102 à la queue
3. GET /queues/support/details (voir stats)
4. Pause membre 101
5. Unpause membre 101
```

### 4️⃣ IVR Complet
```
1. Upload fichiers audio
2. Créer menu IVR principal
3. Ajouter options (1-5)
4. Ajouter conditions time-based
5. Mapper DID → Menu
6. Valider configuration
7. Tester avec /test
```

---

## 🔑 Authentification et Rôles

### Rôles Disponibles
- **admin** - Accès total système
- **tenant_admin** - Admin du tenant
- **supervisor** - Superviseur (pause, monitoring)
- **agent** - Agent basique

### Utilisateur par Défaut
```
Email: admin@asterisk.local
Password: Admin123!
Role: admin
```

---

## 🛠️ Architecture Technique

### Multi-Tenant
- Pattern de nommage: `t{tenantId}_{name}`
- Isolation automatique des données
- Context par tenant: `{tenantName}_context`

### Intégration Asterisk
- **AMI** (port 5038): Stats temps réel, contrôle
- **ARI** (port 8088): Gestion canaux, originate
- **Realtime ODBC**: Configuration via PostgreSQL

### Base de Données PostgreSQL
**Tables principales**:
- `app_users` - Utilisateurs application
- `tenants` - Organisations
- `tenant_contexts` - Contextes Asterisk
- `ps_endpoints` - Endpoints PJSIP
- `ps_auths` - Auth SIP
- `ps_aors` - AoR SIP
- `queues` - Files d'attente
- `queue_members` - Membres des queues
- `extensions` - Dialplan
- `cdr` - Call Detail Records
- `recordings` - Enregistrements
- `ivr_menus`, `ivr_options`, etc. - IVR

---

## 📌 Notes Importantes

1. **Token Requis**: Toutes les routes (sauf /login) requièrent Bearer token
2. **Tenant Isolation**: Les données sont automatiquement filtrées par tenant
3. **AMI Connection**: Les endpoints "enriched" nécessitent Asterisk connecté
4. **Realtime**: Les modifications PJSIP sont instantanées (pas de reload)
5. **Queues**: Utilisez `/reload` après modification pour appliquer
6. **IVR Testing**: Auth désactivée pour IVR (utiliser ?tenantId=1 en query)

---

## 📈 Statistiques

- **Total Modules**: 18
- **Total Endpoints**: 136+
- **Méthodes HTTP**: GET (70), POST (35), PATCH/PUT (20), DELETE (15)
- **Endpoints Publics**: 1 (login)
- **Endpoints Protégés**: 135

---

## 🔗 Liens Utiles

**Base URL**: `http://localhost:3001/api/v1`

**Swagger/OpenAPI**: `http://localhost:3001/api` (si disponible)

**Ports Asterisk**:
- AMI: 5038
- ARI: 8088
- PJSIP: 5060-5061

**PostgreSQL**:
- Host: localhost
- Port: 5432
- DB: asterisk_api

**Redis**:
- Host: localhost
- Port: 6379

---

## ✅ Checklist de Validation

Avant de commencer les tests, vérifier:
- [ ] Backend running (port 3001)
- [ ] PostgreSQL running (port 5432)
- [ ] Redis running (port 6379)
- [ ] Asterisk running (AMI 5038, ARI 8088)
- [ ] Token JWT obtenu via /login
- [ ] Postman configuré avec Bearer Token

---

**Dernière mise à jour**: 2025-11-04
**Version API**: 2.0
**Auteur**: Documentation générée par analyse complète du code source
