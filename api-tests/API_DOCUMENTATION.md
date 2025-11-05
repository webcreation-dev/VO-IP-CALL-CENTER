⏺ 🏗️ Architecture Multi-Tenant Complète - Asterisk API v2

  1️⃣ Architecture Multi-Tenant et Gestion des Contextes

  Le système implémente une isolation complète par tenant utilisant le pattern de nommage
  t{tenantId}_{resourceName}. Chaque tenant possède au minimum un contexte primaire créé
  automatiquement lors de sa création (par exemple company1_context pour le tenant "company1"), mais
   peut avoir plusieurs contextes additionnels pour des cas d'usage spécifiques. Par exemple, un
  tenant peut avoir un contexte principal pour les appels internes (company1_context), un contexte
  IVR (company1_ivr), un contexte pour les appels externes (company1_external), et un contexte pour
  les conférences (company1_conference). Cette séparation permet une gestion granulaire des 
  permissions et du routage : les endpoints peuvent être configurés pour démarrer dans un contexte
  spécifique, et le dialplan peut transférer un appel d'un contexte à un autre selon la logique
  métier. Dans PostgreSQL, la table tenant_contexts stocke tous ces contextes avec les champs
  tenant_id, name, description, et is_primary, ce qui permet de tracer facilement tous les contextes
   d'un tenant et de les gérer via l'API avec des endpoints dédiés.

  2️⃣ Dialplan Dynamique via Asterisk Realtime

  Le dialplan est entièrement dynamique et stocké dans PostgreSQL grâce à la technologie Asterisk 
  Realtime configurée avec ODBC. Au lieu d'avoir un fichier extensions.conf statique, toutes les
  règles de routage sont dans la table extensions avec les colonnes context, exten, priority, app,
  et appdata. Lorsqu'un appel arrive dans Asterisk, le moteur de dialplan interroge directement 
  PostgreSQL via la connexion ODBC pour récupérer les extensions correspondantes dans le bon
  contexte. Par exemple, si un endpoint t1_101 enregistré dans le contexte company1_context compose
  le numéro 102, Asterisk exécute une requête SQL du type SELECT * FROM extensions WHERE context = 
  'company1_context' AND exten = '102' ORDER BY priority, récupère les lignes (priority 1: Dial,
  priority 2: Voicemail, etc.), et les exécute séquentiellement. Cette approche permet de modifier 
  le routage sans redémarrer Asterisk : dès qu'une extension est ajoutée via l'API avec un POST
  /extensions, elle est immédiatement disponible pour le prochain appel. Le backend NestJS gère la
  création/modification/suppression des extensions tout en respectant l'isolation par tenant en
  vérifiant que le contexte appartient bien au tenant de l'utilisateur connecté.

  3️⃣ Endpoints PJSIP et Isolation Multi-Tenant

  Les endpoints SIP utilisent le protocole PJSIP (la stack SIP moderne d'Asterisk) et sont stockés
  dans trois tables liées : ps_endpoints (configuration endpoint), ps_auths (authentification), et
  ps_aors (Address of Record pour l'enregistrement). Chaque endpoint porte un identifiant unique 
  préfixé par le tenant : par exemple, l'utilisateur "101" du tenant 1 devient t1_101 dans Asterisk.
   Dans ps_endpoints, l'endpoint t1_101 est configuré avec le champ context = 'company1_context', ce
   qui signifie que tous les appels sortants de cet endpoint commencent dans ce contexte. L'API
  NestJS, via le service EndpointsService, crée ces trois entités de manière atomique dans une 
  transaction : quand on fait POST /endpoints avec {username: "101", password: "SecurePass", 
  context: "company1_context"}, le backend crée simultanément l'endpoint t1_101 dans ps_endpoints,
  l'auth t1_101 dans ps_auths avec le hash du password, et l'AoR t1_101 dans ps_aors avec
  max_contacts=1. Grâce au Realtime PJSIP, dès que l'endpoint s'enregistre sur Asterisk, le serveur
  lit sa configuration depuis PostgreSQL en temps réel, sans besoin de reload.

  4️⃣ Queues (Files d'Attente) et Membres

  Les queues suivent le même pattern de préfixage : la queue "support" du tenant 1 devient
  t1_support dans Asterisk. Elles sont stockées dans la table queues avec des champs comme strategy
  (ringall, leastrecent, fewestcalls), timeout, retry, maxlen, et wrapuptime. Les membres de la 
  queue sont dans la table queue_members avec les colonnes queue_name, interface, membername,
  penalty, et paused. Par exemple, pour ajouter l'endpoint t1_101 à la queue t1_support, on insère
  une ligne avec {queue_name: 't1_support', interface: 'PJSIP/t1_101', membername: '101', penalty: 
  0}. Contrairement aux endpoints PJSIP qui sont chargés via Realtime, les queues nécessitent 
  parfois un reload car Asterisk les charge en mémoire au démarrage. L'API expose donc un endpoint
  POST /queues/:name/reload qui exécute la commande AMI module reload app_queue.so pour recharger
  uniquement le module des queues sans redémarrer Asterisk. Les statistiques des queues (calls
  waiting, members available, holdtime) sont récupérées en temps réel via AMI avec les commandes
  QueueStatus et QueueSummary, ce qui permet à l'API de fournir des endpoints enrichis comme GET
  /queues/enriched qui combine données PostgreSQL + statistiques AMI.

  5️⃣ Flux d'Appel Complet et Routage Multi-Contexte

  Prenons un scénario complet : un client appelle le numéro DID +33123456789 qui est mappé à un menu
   IVR du tenant 1. Voici le flux : 1) L'appel arrive sur Asterisk dans un contexte d'entrée
  générique, 2) Asterisk consulte la table ivr_did_mappings pour trouver le menu IVR associé au DID,
   3) L'appel est transféré dans le contexte company1_ivr où le dialplan joue le fichier audio de
  bienvenue stocké dans ivr_menus.welcome_sound, 4) L'appelant tape "1" pour le support, 5) Le
  dialplan consulte ivr_options pour trouver l'action associée au digit "1" (type: 'queue', target:
  'support'), 6) L'appel est transféré dans company1_context et placé dans la queue t1_support avec
  l'application Queue(t1_support,t,,,60), 7) Asterisk consulte queue_members pour trouver les agents
   disponibles (t1_101, t1_102), 8) La stratégie "ringall" fait sonner tous les endpoints
  simultanément via Dial(PJSIP/t1_101&PJSIP/t1_102), 9) L'agent 101 répond, la conversation
  commence, 10) Si l'agent veut transférer vers l'agent 103, le dialplan exécute Transfer en restant
   dans company1_context, garantissant qu'il ne peut jamais atteindre les endpoints d'un autre
  tenant. L'isolation est complète car chaque tenant a ses propres contextes, et le dialplan
  interdit explicitement les sauts inter-contextes entre tenants différents.

  6️⃣ Synchronisation Temps Réel : AMI, ARI et Enrichissement

  L'API maintient une synchronisation bidirectionnelle entre PostgreSQL (source de vérité) et
  Asterisk (runtime) via deux interfaces : AMI (Asterisk Manager Interface) pour le monitoring et le
   contrôle, et ARI (Asterisk REST Interface) pour la gestion avancée des canaux. Le backend NestJS
  se connecte à AMI (port 5038) dès le démarrage et écoute les événements en temps réel (PeerStatus,
   QueueMemberAdded, QueueCallerJoin, etc.) pour mettre à jour les caches Redis et notifier les
  clients WebSocket. Par exemple, quand un endpoint t1_101 s'enregistre, Asterisk envoie un
  événement AMI PeerStatus que le backend capte et utilise pour mettre à jour le statut dans Redis
  avec TTL de 60 secondes. Les endpoints enrichis (GET /endpoints/enriched/all) combinent les
  données de PostgreSQL avec l'état en direct d'AMI en exécutant PJSIPShowEndpoints, parsant la
  réponse, et fusionnant les données : on obtient ainsi {id: 't1_101', displayName: '101', callerid:
   'John Doe', deviceState: 'Not in use', contact: 'sip:101@192.168.1.10:5060', latency: '15ms'}.
  Pour les queues, GET /queues/support/details fusionne queues (config PostgreSQL), queue_members
  (membres), et QueueStatus AMI (stats temps réel : calls=3, members=5, holdtime=45s). ARI est
  utilisé pour les opérations de contrôle d'appel : originate (POST /channels/originate),
  hold/unhold, mute, transfer, permettant au frontend de créer des softphones web ou des interfaces
  de supervision.

  7️⃣ Avantages et Limitations de cette Architecture

  Cette architecture offre des avantages majeurs : 1) Isolation parfaite - chaque tenant est dans sa
   bulle, impossible d'interférer avec un autre, 2) Évolutivité - ajouter un nouveau tenant ne
  nécessite qu'une insertion en base, pas de modification de configuration Asterisk, 3) Flexibilité
  - chaque tenant peut avoir son propre dialplan, ses propres stratégies de queue, ses propres menus
   IVR, sans impacter les autres, 4) Monitoring granulaire - les statistiques sont séparées par
  tenant, facilitant la facturation et le SLA, 5) Configuration dynamique - modifier une extension
  ou un endpoint se fait via API REST sans éditer de fichiers, 6) Haute disponibilité - PostgreSQL
  peut être répliqué, Asterisk peut être en cluster avec la base comme source de vérité partagée.
  Les limitations incluent : 1) Performance - Asterisk doit interroger PostgreSQL pour chaque lookup
   d'extension (mitigé par le caching Asterisk), 2) Complexité - déboguer un problème d'appel
  nécessite de comprendre le flow API → PostgreSQL → ODBC → Asterisk → AMI, 3) Reload des queues -
  contrairement aux endpoints, les queues ne sont pas fully realtime et nécessitent parfois un
  reload, 4) Scalabilité horizontale - avec Realtime, tous les Asterisk doivent pointer vers le même
   PostgreSQL (solvable avec read-replicas), 5) Vendor lock-in - cette architecture est spécifique à
   Asterisk avec Realtime, migrer vers un autre PBX nécessiterait une refonte complète.

  ---
  En résumé : l'API crée une couche d'abstraction RESTful au-dessus d'Asterisk, où PostgreSQL est la
   source de vérité, Asterisk Realtime lit la config en temps réel, AMI fournit le monitoring, et le
   préfixage par tenant garantit l'isolation. Le résultat est un PBX multi-tenant moderne, 
  programmable via API, avec une séparation complète des données comparable aux solutions cloud
  comme Twilio ou Vonage, mais self-hosted et open-source.


  

  


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
