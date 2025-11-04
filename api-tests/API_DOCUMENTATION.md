# API Documentation - Asterisk Call Center Backend

**Base URL**: `http://localhost:3001/api/v1`

---

## 📋 Table des matières

1. [Module Auth](#module-auth)
2. [Module Tenants](#module-tenants)
3. [Module Contexts](#module-contexts)
4. [Module Endpoints (SIP)](#module-endpoints-sip)
5. [Module Queues](#module-queues)

---

## 🔐 Module Auth

### POST `/auth/login`
**Description**: Authentification utilisateur et obtention du JWT token
**Auth**: Non requis
**Body**:
```json
{
  "email": "admin@asterisk.local",
  "password": "Admin123!"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "user": { ... }
  }
}
```

### GET `/auth/me`
**Description**: Récupérer le profil de l'utilisateur connecté
**Auth**: Bearer Token requis
**Response**: Informations de l'utilisateur

### POST `/auth/refresh`
**Description**: Rafraîchir le token JWT
**Auth**: Bearer Token requis
**Response**: Nouveau access token

---

## 🏢 Module Tenants

### GET `/tenants`
**Description**: Liste de tous les tenants
**Auth**: Bearer Token requis
**Response**: Array de tenants

### GET `/tenants/me`
**Description**: Récupérer mon tenant (basé sur l'utilisateur connecté)
**Auth**: Bearer Token requis
**Response**: Tenant object

### GET `/tenants/:id`
**Description**: Récupérer un tenant par ID
**Auth**: Bearer Token requis
**Params**: `id` - ID du tenant
**Response**: Tenant object

### POST `/tenants`
**Description**: Créer un nouveau tenant
**Auth**: Bearer Token requis
**Body**:
```json
{
  "name": "company1",
  "companyName": "Company One Ltd",
  "contactEmail": "contact@company1.com",
  "contactPhone": "+1234567890",
  "maxEndpoints": 200,
  "maxQueues": 100
}
```
**Note**: Un contexte primaire est créé automatiquement avec le pattern `{name}_context`

### PATCH `/tenants/:id`
**Description**: Modifier un tenant
**Auth**: Bearer Token requis
**Params**: `id` - ID du tenant
**Body**:
```json
{
  "companyName": "Company One Ltd - Updated",
  "maxEndpoints": 300
}
```

### DELETE `/tenants/:id`
**Description**: Supprimer un tenant (soft delete)
**Auth**: Bearer Token requis
**Params**: `id` - ID du tenant

### PATCH `/tenants/:id/restore`
**Description**: Restaurer un tenant supprimé
**Auth**: Bearer Token requis
**Params**: `id` - ID du tenant

---

## 📁 Module Contexts

**Note**: Les contextes sont créés automatiquement avec les tenants, mais vous pouvez en créer des additionnels (IVR, External, etc.)

### GET `/contexts`
**Description**: Liste de tous les contextes
**Auth**: Bearer Token requis
**Response**: Array de contextes

### GET `/tenants/:tenantId/contexts`
**Description**: Liste des contextes d'un tenant spécifique
**Auth**: Bearer Token requis
**Params**: `tenantId` - ID du tenant
**Response**: Array de contextes du tenant

### GET `/contexts/:id`
**Description**: Récupérer un contexte par ID
**Auth**: Bearer Token requis
**Params**: `id` - ID du contexte
**Response**: Context object

### POST `/contexts`
**Description**: Créer un contexte additionnel pour un tenant
**Auth**: Bearer Token requis
**Body**:
```json
{
  "tenantId": 1,
  "name": "company1_ivr",
  "description": "IVR Context for Company 1",
  "isPrimary": false
}
```
**Use cases**: IVR, External calls, Conference, etc.

### PATCH `/contexts/:id`
**Description**: Modifier un contexte
**Auth**: Bearer Token requis
**Params**: `id` - ID du contexte
**Body**:
```json
{
  "description": "Updated description"
}
```

### DELETE `/contexts/:id`
**Description**: Supprimer un contexte
**Auth**: Bearer Token requis
**Params**: `id` - ID du contexte
**Note**: Ne peut pas supprimer le contexte primaire

---

## 📞 Module Endpoints (SIP)

**Note**: Les endpoints sont créés avec le pattern `t{tenantId}_{username}` pour l'isolation multi-tenant

### GET `/endpoints`
**Description**: Liste de tous les endpoints
**Auth**: Bearer Token requis
**Response**: Array d'endpoints

### GET `/endpoints/enriched/all`
**Description**: Liste des endpoints enrichis avec leur statut AMI en temps réel
**Auth**: Bearer Token requis
**Response**: Array d'endpoints avec statut (Registered, Not in use, etc.)

### GET `/tenants/:tenantId/endpoints`
**Description**: Liste des endpoints d'un tenant spécifique
**Auth**: Bearer Token requis
**Params**: `tenantId` - ID du tenant
**Response**: Array d'endpoints du tenant

### GET `/endpoints/:username`
**Description**: Récupérer un endpoint par username
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Response**: Endpoint object

### GET `/endpoints/:username/status`
**Description**: Récupérer le statut temps réel d'un endpoint via AMI
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Response**: Statut AMI (Registered, contact, etc.)

### GET `/endpoints/:username/details`
**Description**: Récupérer les détails complets d'un endpoint (DB + AMI)
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Response**: Endpoint complet avec statut en temps réel

### POST `/endpoints`
**Description**: Créer un nouveau endpoint SIP
**Auth**: Bearer Token requis
**Body**:
```json
{
  "tenantId": 1,
  "username": "101",
  "password": "SecurePass101",
  "callerid": "John Doe <101>",
  "context": "company1_context",
  "transport": "transport-udp",
  "codecs": "ulaw,alaw,gsm"
}
```
**Note**:
- Crée automatiquement les entrées dans `ps_endpoints`, `ps_auths`, `ps_aors`
- Le nom technique est préfixé: `t{tenantId}_{username}`

### PATCH `/endpoints/:username`
**Description**: Modifier un endpoint
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Body**:
```json
{
  "callerid": "John Doe Updated <101>",
  "codecs": "ulaw,alaw,gsm,g729"
}
```

### POST `/endpoints/:username/disconnect`
**Description**: Déconnecter un endpoint via AMI
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Response**: Confirmation de déconnexion

### DELETE `/endpoints/:username`
**Description**: Supprimer un endpoint
**Auth**: Bearer Token requis
**Params**: `username` - Username de l'endpoint
**Note**: Supprime les entrées dans toutes les tables PJSIP

---

## 📋 Module Queues

**Note**: Les queues sont créées avec le pattern `t{tenantId}_{name}` pour l'isolation multi-tenant

### GET `/queues`
**Description**: Liste de toutes les queues
**Auth**: Bearer Token requis
**Response**: Array de queues

### GET `/queues/enriched`
**Description**: Liste des queues enrichies avec statistiques AMI en temps réel
**Auth**: Bearer Token requis
**Response**: Array de queues avec stats (calls, members, holdtime, etc.)

### GET `/queues/stats/global`
**Description**: Statistiques globales de toutes les queues
**Auth**: Bearer Token requis
**Response**: Stats agrégées (total calls, avg holdtime, etc.)

### GET `/tenants/:tenantId/queues`
**Description**: Liste des queues d'un tenant spécifique
**Auth**: Bearer Token requis
**Params**: `tenantId` - ID du tenant
**Response**: Array de queues du tenant

### GET `/queues/:name`
**Description**: Récupérer une queue par nom
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Response**: Queue object

### GET `/queues/:name/stats`
**Description**: Récupérer les statistiques temps réel d'une queue via AMI
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Response**: Stats AMI (calls, completed, abandoned, servicelevel, etc.)

### GET `/queues/:name/details`
**Description**: Récupérer les détails complets d'une queue (DB + AMI)
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Response**: Queue complète avec stats et membres en temps réel

### GET `/queues/:name/calls`
**Description**: Récupérer les appels en attente dans une queue
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Response**: Array d'appels (channel, position, wait time, etc.)

### POST `/queues`
**Description**: Créer une nouvelle queue
**Auth**: Bearer Token requis
**Body**:
```json
©
```
**Strategies disponibles**:
- `ringall` - Tous les agents sonnent en même temps
- `leastrecent` - Agent avec l'appel le moins récent
- `fewestcalls` - Agent avec le moins d'appels
- `random` - Ordre aléatoire
- `rrmemory` - Round robin avec mémoire

### PATCH `/queues/:name`
**Description**: Modifier une queue
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Body**:
```json
{
  "description": "Support client - Mis à jour",
  "timeout": 20,
  "maxlen": 25
}
```

### POST `/queues/:name/reload`
**Description**: Recharger la configuration d'une queue via AMI
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue
**Response**: Confirmation du reload

### DELETE `/queues/:name`
**Description**: Supprimer une queue
**Auth**: Bearer Token requis
**Params**: `name` - Nom de la queue


1. GET /tenants/:id/queues - Pour lister les queues d'un tenant
  2. POST /queues/:name/members - Pour ajouter un member/agent
  3. DELETE /queues/:name/members/:memberId - Pour retirer un member
  4. PATCH /queues/:name/members/:memberId - Pour pause/unpause

---

## 🔄 Architecture Multi-tenant

### Pattern de nommage

Tous les objets Asterisk suivent le pattern:
- **Endpoints**: `t{tenantId}_{username}` (ex: `t1_101`)
- **Queues**: `t{tenantId}_{name}` (ex: `t1_support`)
- **Contexts**: `{name}_context` (ex: `company1_context`)

### Isolation des données

- Chaque tenant a ses propres endpoints, queues et contextes
- Les endpoints ne peuvent appeler que dans leur contexte
- Les statistiques AMI sont filtrées par tenant
- Deux tenants peuvent avoir des objets avec le même nom sans conflit

### Tables PostgreSQL

**PJSIP (Asterisk Realtime)**:
- `ps_endpoints` - Configuration des endpoints SIP
- `ps_auths` - Authentification SIP
- `ps_aors` - Adresses of Record
- `queues` - Configuration des queues
- `queue_members` - Membres des queues

**Application**:
- `tenants` - Informations des tenants
- `tenant_contexts` - Contextes Asterisk
- `app_users` - Utilisateurs de l'application

---

## 📊 Intégration AMI (Asterisk Manager Interface)

### Endpoints enrichis

Les endpoints peuvent être enrichis avec leur statut en temps réel:
- **Registered**: Endpoint connecté
- **Not in use**: Endpoint libre
- **Unavailable**: Endpoint non connecté

### Queues enrichies

Les queues peuvent être enrichies avec statistiques en direct:
- Nombre d'appels en attente
- Nombre de membres disponibles
- Temps d'attente moyen
- Appels complétés
- Appels abandonnés
- Service level

### Commandes disponibles

- `QueueStatus` - Statut des queues
- `QueueSummary` - Résumé des queues
- `PJSIPShowEndpoints` - Statut des endpoints
- `PJSIPShowEndpoint` - Détails d'un endpoint
- `Reload` - Recharger configuration

---

## ✅ Tests recommandés

### Scénario 1: Multi-tenant basique
1. Créer Tenant 1 (company1)
2. Créer Tenant 2 (company2)
3. Créer endpoint 101 pour Tenant 1
4. Créer endpoint 101 pour Tenant 2
5. Vérifier que les deux endpoints existent avec noms: `t1_101` et `t2_101`

### Scénario 2: Contextes multiples
1. Créer Tenant 1
2. Créer contexte IVR pour Tenant 1
3. Créer contexte External pour Tenant 1
4. Vérifier que tous les contextes sont listés pour Tenant 1

### Scénario 3: Queues et isolation
1. Créer queue "support" pour Tenant 1
2. Créer queue "support" pour Tenant 2
3. Vérifier isolation via queues enrichies
4. Tester statistiques séparées

### Scénario 4: Synchronisation Asterisk
1. Créer endpoint via API
2. Vérifier dans Asterisk CLI: `pjsip show endpoints`
3. Vérifier dans PostgreSQL: `SELECT * FROM ps_endpoints`
4. Tester GET enriched pour vérifier statut AMI

---

## 🔧 Commandes Asterisk CLI utiles

```bash
# Vérifier les endpoints
pjsip show endpoints

# Vérifier un endpoint spécifique
pjsip show endpoint t1_101

# Vérifier les queues
queue show

# Vérifier une queue spécifique
queue show t1_support

# Recharger PJSIP
pjsip reload

# Recharger queues
module reload app_queue.so
```

---

## 🗄️ Requêtes PostgreSQL utiles

```sql
-- Vérifier les tenants
SELECT id, name, company_name, max_endpoints, max_queues FROM tenants;

-- Vérifier les contextes
SELECT id, tenant_id, name, description, is_primary FROM tenant_contexts;

-- Vérifier les endpoints PJSIP
SELECT id, endpoint_id, context, transport, allow FROM ps_endpoints;

-- Vérifier les auths
SELECT id, auth, username FROM ps_auths;

-- Vérifier les queues
SELECT name, tenant_id, strategy, timeout, maxlen FROM queues;

-- Vérifier les membres de queue
SELECT queue_name, interface, membername, penalty FROM queue_members;
```

---

## 📝 Notes importantes

1. **Token JWT**: Copier le token de la réponse `/auth/login` et l'utiliser dans le header `Authorization: Bearer <TOKEN>` pour toutes les requêtes
2. **Isolation**: Les objets sont automatiquement préfixés pour garantir l'isolation multi-tenant
3. **Asterisk Realtime**: Toutes les modifications sont immédiatement visibles dans Asterisk (pas besoin de reload)
4. **AMI**: Les endpoints enrichis nécessitent qu'Asterisk soit connecté et opérationnel
5. **Soft Delete**: Les tenants utilisent un soft delete (flag `deleted_at`) pour préserver l'historique
