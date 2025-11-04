# 📚 Documentation API Complète - Asterisk Call Center Backend

**Base URL**: `http://localhost:3001/api/v1`
**Version**: 2.0
**Date**: 2025-11-04

---

## 📋 Table des matières

1. [Module Auth (Authentification)](#1--module-auth---authentification)
2. [Module Tenants](#2--module-tenants)
3. [Module Endpoints (SIP)](#3--module-endpoints-sip)
4. [Module Queues](#4--module-queues)
5. [Module Queue Members](#5--module-queue-members)
6. [Module Extensions (Dialplan)](#6--module-extensions-dialplan)
7. [Module Statistics](#7--module-statistics)
8. [Module Recordings](#8--module-recordings)
9. [Module Asterisk (Server)](#9--module-asterisk-server)
10. [Module CDR (Call Detail Records)](#10--module-cdr-call-detail-records)
11. [Module Channels](#11--module-channels)
12. [Module Monitoring](#12--module-monitoring)
13. [Module Metadata](#13--module-metadata)
14. [Module IVR Menus](#14--module-ivr-menus)
15. [Module IVR Options](#15--module-ivr-options)
16. [Module IVR Conditions](#16--module-ivr-conditions)
17. [Module IVR DID Mappings](#17--module-ivr-did-mappings)
18. [Module IVR Audio](#18--module-ivr-audio)

**Total: 18 modules, 150+ endpoints**

---

## 1. 🔐 Module Auth - Authentification

**Base**: `/api/v1/auth`

### POST `/auth/register`
- **Description**: Créer un nouvel utilisateur (admin uniquement)
- **Auth**: Bearer Token + Role Admin
- **Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "agent",
  "tenantId": 1
}
```

### POST `/auth/login`
- **Description**: Authentification et obtention du JWT token
- **Auth**: Public (pas d'auth requise)
- **Body**:
```json
{
  "email": "admin@asterisk.local",
  "password": "Admin123!"
}
```

### GET `/auth/me`
- **Description**: Récupérer le profil de l'utilisateur connecté
- **Auth**: Bearer Token

---

## 2. 🏢 Module Tenants

**Base**: `/api/v1/tenants`

### GET `/tenants`
- **Description**: Liste de tous les tenants
- **Query**: `?includeInactive=true` (admin uniquement)
- **Auth**: Bearer Token

### POST `/tenants`
- **Description**: Créer un nouveau tenant
- **Auth**: Bearer Token + Role Admin
- **Body**:
```json
{
  "name": "company1",
  "companyName": "Company One Ltd",
  "contactEmail": "contact@company1.com",
  "contactPhone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA",
  "timezone": "America/New_York",
  "maxEndpoints": 200,
  "maxQueues": 100
}
```

### GET `/tenants/me`
- **Description**: Récupérer mon tenant (utilisateur connecté)
- **Auth**: Bearer Token

### GET `/tenants/:id`
- **Description**: Récupérer un tenant par ID
- **Auth**: Bearer Token

### PATCH `/tenants/:id`
- **Description**: Modifier un tenant
- **Auth**: Bearer Token + Admin ou Tenant Admin
- **Body**: Partial update

### DELETE `/tenants/:id`
- **Description**: Supprimer un tenant (soft delete)
- **Auth**: Bearer Token + Role Admin

### PATCH `/tenants/:id/restore`
- **Description**: Restaurer un tenant supprimé
- **Auth**: Bearer Token + Role Admin

---

## 3. 📞 Module Endpoints (SIP)

**Base**: `/api/v1/endpoints`

### GET `/endpoints`
- **Description**: Liste des endpoints du tenant
- **Auth**: Bearer Token
- **Query**: Filters (context, transport, etc.)

### POST `/endpoints`
- **Description**: Créer un endpoint SIP
- **Auth**: Bearer Token + Admin ou Tenant Admin
- **Body**:
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

### GET `/endpoints/enriched/all`
- **Description**: Tous les endpoints avec statut AMI en temps réel
- **Auth**: Bearer Token

### GET `/endpoints/:username`
- **Description**: Détails d'un endpoint par username
- **Auth**: Bearer Token

### GET `/endpoints/:username/status`
- **Description**: Statut temps réel d'un endpoint via AMI
- **Auth**: Bearer Token

### GET `/endpoints/:username/details`
- **Description**: Détails complets (DB + AMI)
- **Auth**: Bearer Token

### POST `/endpoints/:username/disconnect`
- **Description**: Déconnecter de force un endpoint
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

### PATCH `/endpoints/:username`
- **Description**: Modifier un endpoint
- **Auth**: Bearer Token + Admin ou Tenant Admin

### DELETE `/endpoints/:username`
- **Description**: Supprimer un endpoint
- **Auth**: Bearer Token + Admin ou Tenant Admin

---

## 4. 📋 Module Queues

**Base**: `/api/v1/queues`

### GET `/queues`
- **Description**: Liste des queues du tenant
- **Auth**: Bearer Token

### POST `/queues`
- **Description**: Créer une queue
- **Auth**: Bearer Token + Admin ou Tenant Admin
- **Body**:
```json
{
  "tenantId": 1,
  "name": "support",
  "description": "Support client",
  "strategy": "ringall",
  "timeout": 15,
  "retry": 5,
  "wrapuptime": 10,
  "maxlen": 20
}
```
**Strategies**: ringall, leastrecent, fewestcalls, random, rrmemory

### GET `/queues/enriched`
- **Description**: Toutes les queues avec stats AMI
- **Auth**: Bearer Token

### GET `/queues/stats/global`
- **Description**: Statistiques globales agrégées
- **Auth**: Bearer Token

### GET `/queues/:name`
- **Description**: Détails d'une queue par nom
- **Auth**: Bearer Token

### GET `/queues/:name/stats`
- **Description**: Stats temps réel via AMI
- **Auth**: Bearer Token

### GET `/queues/:name/details`
- **Description**: Détails complets (DB + AMI + membres)
- **Auth**: Bearer Token

### GET `/queues/:name/calls`
- **Description**: Appels en attente dans la queue
- **Auth**: Bearer Token

### POST `/queues/:name/reload`
- **Description**: Recharger config queue via AMI
- **Auth**: Bearer Token + Admin ou Tenant Admin

### PATCH `/queues/:name`
- **Description**: Modifier une queue
- **Auth**: Bearer Token + Admin ou Tenant Admin

### DELETE `/queues/:name`
- **Description**: Supprimer une queue
- **Auth**: Bearer Token + Admin ou Tenant Admin

---

## 5. 👥 Module Queue Members

**Base**: `/api/v1/queues/:queueName/members`

### POST `/queues/:queueName/members`
- **Description**: Ajouter un membre à la queue
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor
- **Body**:
```json
{
  "interface": "PJSIP/t1_101",
  "memberName": "101",
  "penalty": 0
}
```

### GET `/queues/:queueName/members`
- **Description**: Liste des membres de la queue
- **Auth**: Bearer Token

### GET `/queues/:queueName/members/enriched`
- **Description**: Membres avec données endpoint enrichies
- **Auth**: Bearer Token

### PATCH `/queues/:queueName/members/:memberName/pause`
- **Description**: Mettre en pause un membre
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

### PATCH `/queues/:queueName/members/:memberName/unpause`
- **Description**: Retirer la pause d'un membre
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

### PATCH `/queues/:queueName/members/:memberName`
- **Description**: Modifier pénalité d'un membre
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor
- **Body**: `{ "penalty": 5 }`

### DELETE `/queues/:queueName/members/:memberName`
- **Description**: Retirer un membre de la queue
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

---

## 6. 📱 Module Extensions (Dialplan)

**Base**: `/api/v1/extensions`

### GET `/extensions`
- **Description**: Liste des extensions du tenant
- **Auth**: Bearer Token
- **Query**: Filters (context, priority, etc.)

### POST `/extensions`
- **Description**: Créer une extension dialplan
- **Auth**: Bearer Token + Admin ou Tenant Admin
- **Body**:
```json
{
  "context": "company1_context",
  "exten": "100",
  "priority": 1,
  "app": "Dial",
  "appdata": "PJSIP/t1_101,20"
}
```

### GET `/extensions/contexts`
- **Description**: Liste des contextes disponibles
- **Auth**: Bearer Token

### GET `/extensions/context/:context`
- **Description**: Extensions d'un contexte spécifique
- **Auth**: Bearer Token

### GET `/extensions/:id`
- **Description**: Détails d'une extension par ID
- **Auth**: Bearer Token

### PUT `/extensions/:id`
- **Description**: Modifier une extension
- **Auth**: Bearer Token + Admin ou Tenant Admin

### DELETE `/extensions/:id`
- **Description**: Supprimer une extension
- **Auth**: Bearer Token + Admin ou Tenant Admin

---

## 7. 📊 Module Statistics

**Base**: `/api/v1/statistics`

### GET `/statistics/dashboard`
- **Description**: Dashboard complet avec toutes les stats
- **Auth**: Bearer Token
- **Query**: `?startDate=2025-01-01&endDate=2025-12-31`

### GET `/statistics/summary`
- **Description**: Résumé rapide (7 derniers jours par défaut)
- **Auth**: Bearer Token

### GET `/statistics/calls`
- **Description**: Statistiques détaillées des appels
- **Auth**: Bearer Token
- **Query**: Filters (startDate, endDate, direction, etc.)

### GET `/statistics/queues`
- **Description**: Stats de toutes les queues
- **Auth**: Bearer Token

### GET `/statistics/endpoints`
- **Description**: Stats des endpoints (enregistrements, uptime)
- **Auth**: Bearer Token

### GET `/statistics/recordings`
- **Description**: Stats sur les enregistrements
- **Auth**: Bearer Token

### GET `/statistics/top-callers`
- **Description**: Top des appelants les plus actifs
- **Auth**: Bearer Token

### GET `/statistics/top-called`
- **Description**: Top des destinations les plus appelées
- **Auth**: Bearer Token

### GET `/statistics/active-channels`
- **Description**: Canaux actifs en temps réel (ARI)
- **Auth**: Bearer Token

### GET `/statistics/trend`
- **Description**: Tendance des appels (heure, jour, semaine, mois)
- **Auth**: Bearer Token
- **Query**: `?groupBy=day`

---

## 8. 🎙️ Module Recordings

**Base**: `/api/v1/recordings`

### POST `/recordings/start`
- **Description**: Démarrer l'enregistrement d'un canal
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor
- **Body**:
```json
{
  "channelId": "PJSIP/t1_101-00000001",
  "format": "wav",
  "name": "call-recording-101"
}
```

### POST `/recordings/stop/:recordingName`
- **Description**: Arrêter un enregistrement actif
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

### GET `/recordings`
- **Description**: Liste des enregistrements
- **Auth**: Bearer Token
- **Query**: Filters (startDate, endDate, format)

### GET `/recordings/:id`
- **Description**: Détails d'un enregistrement
- **Auth**: Bearer Token

### GET `/recordings/:id/download`
- **Description**: Télécharger le fichier audio
- **Auth**: Bearer Token

### GET `/recordings/:id/stream`
- **Description**: Stream le fichier audio
- **Auth**: Bearer Token

### DELETE `/recordings/:id`
- **Description**: Supprimer enregistrement (soft delete)
- **Auth**: Bearer Token + Admin/Tenant Admin/Supervisor

### DELETE `/recordings/:id/permanent`
- **Description**: Supprimer définitivement le fichier
- **Auth**: Bearer Token + Admin ou Tenant Admin

---

## 9. ☎️ Module Asterisk (Server)

**Base**: `/api/v1/asterisk`

### GET `/asterisk/status`
- **Description**: Statut complet du serveur Asterisk
- **Auth**: Bearer Token

### GET `/asterisk/uptime`
- **Description**: Uptime du système
- **Auth**: Bearer Token

### GET `/asterisk/stats`
- **Description**: Stats globales (canaux actifs, uptime, etc.)
- **Auth**: Bearer Token

### POST `/asterisk/transfer/blind`
- **Description**: Transfert aveugle d'un appel
- **Auth**: Bearer Token
- **Body**:
```json
{
  "channel": "PJSIP/t1_101-00000001",
  "extension": "102",
  "context": "company1_context"
}
```

### GET `/asterisk/extensions/available`
- **Description**: Extensions disponibles (non occupées)
- **Auth**: Bearer Token
- **Query**: `?context=company1_context` (required)

### POST `/asterisk/reload`
- **Description**: Recharger toutes les configs Asterisk
- **Auth**: Bearer Token + Admin

### POST `/asterisk/reload/pjsip`
- **Description**: Recharger module PJSIP
- **Auth**: Bearer Token + Admin

### POST `/asterisk/reload/dialplan`
- **Description**: Recharger dialplan
- **Auth**: Bearer Token + Admin

### POST `/asterisk/reload/:module`
- **Description**: Recharger un module spécifique
- **Auth**: Bearer Token + Admin

### GET `/asterisk/modules`
- **Description**: Liste des modules chargés
- **Auth**: Bearer Token

### GET `/asterisk/peers`
- **Description**: Liste des peers SIP/PJSIP
- **Auth**: Bearer Token
- **Query**: `?technology=pjsip`

### POST `/asterisk/message`
- **Description**: Envoyer un message SIP
- **Auth**: Bearer Token
- **Body**:
```json
{
  "to": "PJSIP/t1_101",
  "from": "PJSIP/t1_102",
  "body": "Hello"
}
```

### POST `/asterisk/command`
- **Description**: Exécuter commande CLI Asterisk
- **Auth**: Bearer Token + Admin
- **Body**:
```json
{
  "command": "pjsip show endpoints"
}
```

---

## 10. 📞 Module CDR (Call Detail Records)

**Base**: `/api/v1/cdr`

### GET `/cdr`
- **Description**: Liste des CDR avec pagination et filtres
- **Auth**: Bearer Token
- **Query**: Filters (startDate, endDate, disposition, direction)

### GET `/cdr/stats`
- **Description**: Statistiques sur les CDR
- **Auth**: Bearer Token

### GET `/cdr/export/csv`
- **Description**: Exporter les CDR en CSV
- **Auth**: Bearer Token
- **Headers**: `Content-Type: text/csv`

### GET `/cdr/:id`
- **Description**: Détails d'un CDR par ID
- **Auth**: Bearer Token

---

## 11. 📡 Module Channels

**Base**: `/api/v1/channels`

### GET `/channels`
- **Description**: Liste des canaux actifs
- **Auth**: Bearer Token
- **Query**: Filters (state, context)

### GET `/channels/:channelId`
- **Description**: Détails d'un canal
- **Auth**: Bearer Token

### POST `/channels/originate`
- **Description**: Créer un appel sortant
- **Auth**: Bearer Token + Agent
- **Body**:
```json
{
  "endpoint": "PJSIP/t1_101",
  "extension": "102",
  "context": "company1_context",
  "callerId": "101"
}
```

### PATCH `/channels/:channelId/answer`
- **Description**: Répondre à un canal qui sonne
- **Auth**: Bearer Token + Agent

### DELETE `/channels/:channelId`
- **Description**: Raccrocher un canal
- **Auth**: Bearer Token + Supervisor
- **Query**: `?reason=busy`

### PATCH `/channels/:channelId/hold`
- **Description**: Mettre en attente
- **Auth**: Bearer Token + Agent

### PATCH `/channels/:channelId/unhold`
- **Description**: Reprendre l'appel
- **Auth**: Bearer Token + Agent

### PATCH `/channels/:channelId/mute`
- **Description**: Muter un canal
- **Auth**: Bearer Token + Supervisor
- **Query**: `?direction=both` (in, out, both)

### PATCH `/channels/:channelId/unmute`
- **Description**: Unmuter un canal
- **Auth**: Bearer Token + Supervisor
- **Query**: `?direction=both`

---

## 12. 📈 Module Monitoring

**Base**: `/api/v1/monitoring`

### GET `/monitoring/dashboard`
- **Description**: Dashboard de monitoring complet
- **Auth**: Bearer Token

### GET `/monitoring/events`
- **Description**: Événements récents
- **Auth**: Bearer Token
- **Query**: `?limit=50`

---

## 13. 📝 Module Metadata

**Base**: `/api/v1/metadata`

### GET `/metadata/enums`
- **Description**: Liste des catégories d'énumérations
- **Auth**: Bearer Token
- **Query**: `?lang=en` (en ou fr)

### GET `/metadata/enums/all`
- **Description**: Toutes les énumérations avec détails
- **Auth**: Bearer Token
- **Query**: `?lang=en`

### GET `/metadata/enums/:category`
- **Description**: Énumération spécifique
- **Auth**: Bearer Token
- **Categories**: user-roles, queue-strategies, channel-states, call-dispositions, etc.

### GET `/metadata/enums/search/:keyword`
- **Description**: Rechercher dans les énumérations
- **Auth**: Bearer Token

### GET `/metadata/categories`
- **Description**: Liste des identifiants de catégories
- **Auth**: Bearer Token

---

## 14. 🎛️ Module IVR Menus

**Base**: `/api/v1/ivr/menus`

### POST `/ivr/menus`
- **Description**: Créer un menu IVR
- **Query**: `?tenantId=1`
- **Body**:
```json
{
  "name": "main_menu",
  "description": "Menu principal",
  "welcome_sound": "welcome.wav",
  "invalid_sound": "invalid.wav",
  "timeout_sound": "timeout.wav",
  "timeout": 10,
  "max_retries": 3,
  "max_digits": 1,
  "timeout_action": { "type": "hangup" },
  "invalid_action": { "type": "repeat" }
}
```

### GET `/ivr/menus`
- **Description**: Liste des menus IVR
- **Query**: `?tenantId=1`

### GET `/ivr/menus/:id`
- **Description**: Détails d'un menu
- **Query**: `?tenantId=1`

### PATCH `/ivr/menus/:id`
- **Description**: Modifier un menu
- **Query**: `?tenantId=1`

### DELETE `/ivr/menus/:id`
- **Description**: Supprimer un menu
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/options`
- **Description**: Ajouter une option au menu
- **Query**: `?tenantId=1`
- **Body**:
```json
{
  "digit": "1",
  "description": "Support technique",
  "action": {
    "type": "queue",
    "target": "support"
  },
  "priority": 1,
  "is_active": true
}
```

### GET `/ivr/menus/:menuId/options`
- **Description**: Liste des options d'un menu
- **Query**: `?tenantId=1`

### PATCH `/ivr/menus/:menuId/options/:optionId`
- **Description**: Modifier une option
- **Query**: `?tenantId=1`

### DELETE `/ivr/menus/:menuId/options/:optionId`
- **Description**: Supprimer une option
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/conditions`
- **Description**: Ajouter une condition au menu
- **Query**: `?tenantId=1`

### GET `/ivr/menus/:menuId/conditions`
- **Description**: Liste des conditions d'un menu
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/test`
- **Description**: Tester configuration d'un menu
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/duplicate`
- **Description**: Dupliquer un menu
- **Query**: `?tenantId=1`
- **Body**: `{ "name": "menu_copy" }`

### POST `/ivr/menus/:menuId/options/reorder`
- **Description**: Réorganiser l'ordre des options
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/validate`
- **Description**: Valider la configuration complète
- **Query**: `?tenantId=1`

### GET `/ivr/menus/:menuId/export`
- **Description**: Exporter configuration en JSON
- **Query**: `?tenantId=1`

### POST `/ivr/menus/import`
- **Description**: Importer configuration depuis JSON
- **Query**: `?tenantId=1`

### POST `/ivr/menus/:menuId/clone-to-tenant`
- **Description**: Cloner menu vers autre tenant (admin)
- **Query**: `?tenantId=1`
- **Body**: `{ "target_tenant_id": 2, "new_name": "menu_clone" }`

---

## 15. ⚙️ Module IVR Options

**Base**: `/api/v1/ivr/options`

### GET `/ivr/options/:optionId`
- **Description**: Détails d'une option
- **Query**: `?tenantId=1`

### PATCH `/ivr/options/:optionId`
- **Description**: Modifier une option
- **Query**: `?tenantId=1`

### DELETE `/ivr/options/:optionId`
- **Description**: Supprimer une option
- **Query**: `?tenantId=1`

### POST `/ivr/options/:optionId/toggle`
- **Description**: Activer/désactiver une option
- **Query**: `?tenantId=1`

### PATCH `/ivr/options/:optionId/priority`
- **Description**: Modifier priorité
- **Query**: `?tenantId=1`
- **Body**: `{ "priority": 5 }`

### POST `/ivr/options/validate-action`
- **Description**: Valider une action avant enregistrement
- **Query**: `?tenantId=1`

---

## 16. 🔀 Module IVR Conditions

**Base**: `/api/v1/ivr/conditions`

### GET `/ivr/conditions/:conditionId`
- **Description**: Détails d'une condition
- **Query**: `?tenantId=1`

### PATCH `/ivr/conditions/:conditionId`
- **Description**: Modifier une condition
- **Query**: `?tenantId=1`

### DELETE `/ivr/conditions/:conditionId`
- **Description**: Supprimer une condition
- **Query**: `?tenantId=1`

### POST `/ivr/conditions/:conditionId/toggle`
- **Description**: Activer/désactiver une condition
- **Query**: `?tenantId=1`

---

## 17. 📲 Module IVR DID Mappings

**Base**: `/api/v1/ivr/did-mappings`

### POST `/ivr/did-mappings`
- **Description**: Créer un mapping DID → Menu
- **Query**: `?tenantId=1`
- **Body**:
```json
{
  "did": "+33123456789",
  "menu_id": 1,
  "is_active": true
}
```

### GET `/ivr/did-mappings`
- **Description**: Liste des mappings DID
- **Query**: `?tenantId=1`

### GET `/ivr/did-mappings/by-did/:did`
- **Description**: Trouver mapping par numéro DID
- **Query**: `?tenantId=1`

### PATCH `/ivr/did-mappings/:id`
- **Description**: Modifier un mapping
- **Query**: `?tenantId=1`

### DELETE `/ivr/did-mappings/:id`
- **Description**: Supprimer un mapping
- **Query**: `?tenantId=1`

---

## 18. 🎵 Module IVR Audio

**Base**: `/api/v1/ivr/audio`

### POST `/ivr/audio/upload`
- **Description**: Upload fichier audio
- **Query**: `?tenantId=1`
- **Content-Type**: `multipart/form-data`
- **Body**: file + name + language

### GET `/ivr/audio`
- **Description**: Liste des fichiers audio
- **Query**: `?tenantId=1&language=fr`

### GET `/ivr/audio/:id`
- **Description**: Détails d'un fichier audio
- **Query**: `?tenantId=1`

### GET `/ivr/audio/:id/download`
- **Description**: Télécharger fichier audio
- **Query**: `?tenantId=1`

### DELETE `/ivr/audio/:id`
- **Description**: Supprimer fichier audio
- **Query**: `?tenantId=1`

### POST `/ivr/audio/:id/convert`
- **Description**: Convertir format audio
- **Query**: `?tenantId=1`
- **Body**: `{ "targetFormat": "wav" }` (wav, gsm, sln16)

### POST `/ivr/audio/generate-tts`
- **Description**: Générer audio via TTS
- **Query**: `?tenantId=1`
- **Body**:
```json
{
  "text": "Bienvenue",
  "language": "fr",
  "voice": "female",
  "name": "welcome_fr"
}
```

---

## 📊 Résumé Global

### Par Module

| Module | Endpoints | Méthodes |
|--------|-----------|----------|
| Auth | 3 | POST, GET |
| Tenants | 7 | GET, POST, PATCH, DELETE |
| Endpoints | 9 | GET, POST, PATCH, DELETE |
| Queues | 11 | GET, POST, PATCH, DELETE |
| Queue Members | 7 | GET, POST, PATCH, DELETE |
| Extensions | 7 | GET, POST, PUT, DELETE |
| Statistics | 10 | GET |
| Recordings | 8 | GET, POST, DELETE |
| Asterisk | 13 | GET, POST |
| CDR | 4 | GET |
| Channels | 9 | GET, POST, PATCH, DELETE |
| Monitoring | 2 | GET |
| Metadata | 5 | GET |
| IVR Menus | 19 | GET, POST, PATCH, DELETE |
| IVR Options | 6 | GET, POST, PATCH, DELETE |
| IVR Conditions | 4 | GET, PATCH, DELETE, POST |
| IVR DID Mappings | 5 | GET, POST, PATCH, DELETE |
| IVR Audio | 7 | GET, POST, DELETE |

**Total: 136 endpoints documentés**

### Par Méthode HTTP

- **GET**: ~70 endpoints (lecture de données)
- **POST**: ~35 endpoints (création + actions)
- **PATCH/PUT**: ~20 endpoints (modifications)
- **DELETE**: ~15 endpoints (suppressions)

### Contrôle d'Accès

**Rôles disponibles**:
- `admin` - Accès complet système
- `tenant_admin` - Admin du tenant
- `supervisor` - Superviseur avec accès étendu
- `agent` - Agent basique

**Endpoints publics**: 1 (POST /auth/login)
**Endpoints protégés**: 135 (require Bearer Token)

---

## 🔧 Architecture Technique

### Multi-Tenant
- Préfixage automatique: `t{tenantId}_{name}`
- Isolation des données par tenant
- Decorator `@CurrentTenant()` pour extraction auto

### Intégration Asterisk
- **AMI** (Manager Interface): Stats temps réel, contrôle
- **ARI** (REST Interface): Gestion canaux, originate
- **Realtime**: Config via PostgreSQL ODBC

### Base de Données
**Tables principales**:
- app_users, tenants, tenant_contexts
- ps_endpoints, ps_auths, ps_aors (PJSIP)
- queues, queue_members
- extensions (dialplan)
- cdr (Call Detail Records)
- recordings
- ivr_menus, ivr_options, ivr_conditions, ivr_audio_files

---

## 🧪 Tests Recommandés

### Scénario 1: Setup Multi-tenant
1. POST /auth/login (admin)
2. POST /tenants (company1)
3. POST /tenants (company2)
4. GET /tenants (vérifier isolation)

### Scénario 2: Configuration Endpoints
1. POST /endpoints (t1_101 pour tenant 1)
2. POST /endpoints (t1_102 pour tenant 1)
3. POST /endpoints (t2_101 pour tenant 2)
4. GET /endpoints/enriched/all (vérifier statut AMI)

### Scénario 3: Queues et Membres
1. POST /queues (support pour tenant 1)
2. POST /queues/support/members (ajouter 101, 102)
3. GET /queues/support/details (voir membres + stats)
4. PATCH /queues/support/members/101/pause

### Scénario 4: IVR Complet
1. POST /ivr/menus (créer menu principal)
2. POST /ivr/menus/:id/options (ajouter options 1-5)
3. POST /ivr/menus/:id/conditions (time-based routing)
4. POST /ivr/did-mappings (mapper DID → menu)
5. POST /ivr/menus/:id/validate (valider config)

---

## 📌 Notes Importantes

1. **Token JWT**: Copier de /auth/login et utiliser dans header `Authorization: Bearer <TOKEN>`
2. **Tenant ID**: Extrait automatiquement du token JWT via decorator
3. **Asterisk Realtime**: Modifications instantanées, pas besoin de reload (sauf queues)
4. **IVR tenantId**: Passé en query param `?tenantId=1` (auth désactivée pour tests)
5. **Soft Delete**: Les tenants utilisent `is_active` pour soft delete
6. **Pagination**: Supporte limit/offset sur endpoints liste
7. **AMI/ARI**: Endpoints enrichis nécessitent Asterisk connecté

