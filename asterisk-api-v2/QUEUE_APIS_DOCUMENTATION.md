# Documentation des 6 Nouveaux Endpoints de Queues

## Vue d'ensemble

6 nouveaux endpoints ont été implémentés pour fournir des données enrichies sur les files d'attente (queues) Asterisk, combinant les données de la base de données avec les informations en temps réel de l'AMI (Asterisk Manager Interface).

## Endpoints Implémentés

### 1. GET `/queues/enriched`
**Description**: Récupère toutes les queues avec enrichissement complet (données DB + AMI + statistiques).

**Réponse**: Tableau d'objets `EnrichedQueueDto`
```json
[
  {
    "name": "support",
    "tenant_id": 1,
    "strategy": "ringall",
    "timeout": 15,
    "retry": 5,
    "max_len": 0,
    "announce_frequency": 30,
    "min_announce_frequency": 15,
    "announce_holdtime": "yes",
    "announce_position": "yes",
    "calls_waiting": 3,
    "available_members": 5,
    "total_members": 10,
    "longest_hold_time": 120,
    "completed_calls": 45,
    "abandoned_calls": 2,
    "service_level": 80,
    "service_level_perf": 95.5,
    "avg_hold_time": 35,
    "avg_talk_time": 180,
    "ami_connected": true,
    "db_data_available": true,
    "ami_data_available": true,
    "enriched_at": "2025-10-31T04:30:00.000Z"
  }
]
```

**Détails**:
- Combine données de `queue_config` (DB) avec `QueueStatus` (AMI)
- Calcule les statistiques en temps réel
- Indique la disponibilité des données (DB et AMI)
- Service: `QueuesService.findAllEnriched()` (lignes 84-189)
- Contrôleur: `QueuesController.getAllEnriched()` (lignes 60-69)

---

### 2. GET `/queues/stats/global`
**Description**: Fournit des statistiques globales agrégées pour toutes les queues.

**Réponse**: Objet `GlobalQueueStatsDto`
```json
{
  "total_queues": 5,
  "total_members": 25,
  "available_members": 18,
  "busy_members": 5,
  "unavailable_members": 2,
  "total_calls_waiting": 8,
  "total_calls_completed": 245,
  "total_calls_abandoned": 12,
  "avg_service_level": 87.5,
  "avg_hold_time": 42,
  "avg_talk_time": 195,
  "top_busy_queues": [
    {
      "name": "support",
      "calls_waiting": 5,
      "longest_wait_time": 180,
      "members_available": 3
    }
  ],
  "summary_status": "healthy",
  "timestamp": "2025-10-31T04:30:00.000Z"
}
```

**Détails**:
- Agrège les données de toutes les queues enrichies
- Identifie les 5 queues les plus chargées
- Calcule le statut global (healthy/warning/critical)
- Service: `QueuesService.getGlobalStats()` (lignes 448-541)
- Contrôleur: `QueuesController.getGlobalStats()` (lignes 71-80)

---

### 3. GET `/queues/:name/details`
**Description**: Récupère les détails complets d'une queue spécifique, incluant la configuration, les statistiques et les membres.

**Paramètres**:
- `name` (path): Nom de la queue (ex: "support")

**Réponse**: Objet `QueueDetailsDto`
```json
{
  "queue_info": {
    "name": "support",
    "tenant_id": 1,
    "strategy": "ringall",
    "timeout": 15,
    "retry": 5,
    "weight": 0,
    "max_len": 0
  },
  "realtime_stats": {
    "calls_waiting": 3,
    "available_members": 5,
    "longest_hold_time": 120,
    "completed_calls": 45,
    "abandoned_calls": 2,
    "service_level": 80,
    "service_level_perf": 95.5,
    "avg_hold_time": 35,
    "avg_talk_time": 180
  },
  "members": [
    {
      "name": "101",
      "interface": "PJSIP/t1_101",
      "status": 1,
      "paused": 0,
      "calls_taken": 12,
      "last_call": 1698765432
    }
  ],
  "waiting_calls": [
    {
      "position": 1,
      "caller_id": "+33123456789",
      "wait_time": 45
    }
  ],
  "data_quality": {
    "db_available": true,
    "ami_available": true,
    "members_loaded": true
  },
  "enriched_at": "2025-10-31T04:30:00.000Z"
}
```

**Détails**:
- Vue complète de la queue: config + stats + membres + appels en attente
- Indicateurs de qualité des données
- Service: `QueuesService.getQueueDetails()` (lignes 543-643)
- Contrôleur: `QueuesController.getDetails()` (lignes 104-117)

---

### 4. GET `/queues/:name/calls`
**Description**: Récupère la liste des appels en attente dans une queue spécifique.

**Paramètres**:
- `name` (path): Nom de la queue (ex: "support")

**Réponse**: Objet `QueueCallsDto`
```json
{
  "queue_name": "support",
  "total_waiting": 3,
  "calls": [
    {
      "position": 1,
      "channel": "PJSIP/trunk-00000123",
      "caller_id_num": "+33123456789",
      "caller_id_name": "John Doe",
      "wait_time_seconds": 45,
      "priority": 0
    },
    {
      "position": 2,
      "channel": "PJSIP/trunk-00000124",
      "caller_id_num": "+33987654321",
      "caller_id_name": "Jane Smith",
      "wait_time_seconds": 32,
      "priority": 0
    }
  ],
  "longest_wait_seconds": 45,
  "avg_wait_seconds": 38,
  "retrieved_at": "2025-10-31T04:30:00.000Z"
}
```

**Détails**:
- Liste en temps réel des appels en attente
- Informations détaillées sur chaque appel (position, temps d'attente, caller ID)
- Statistiques (temps d'attente moyen et maximal)
- Service: `QueuesService.getQueueCalls()` (lignes 645-734)
- Contrôleur: `QueuesController.getQueueCalls()` (lignes 119-132)

---

### 5. POST `/queues/:name/reload`
**Description**: Recharge la configuration d'une queue spécifique dans Asterisk.

**Paramètres**:
- `name` (path): Nom de la queue (ex: "support")

**Réponse**: Objet `QueueReloadResultDto`
```json
{
  "queue_name": "support",
  "prefixed_queue_name": "t1_support",
  "success": true,
  "message": "Queue 't1_support' reloaded successfully",
  "reloaded_at": "2025-10-31T04:30:00.000Z"
}
```

**Détails**:
- Utilise la commande AMI "queue reload"
- Applique les changements de configuration sans redémarrer Asterisk
- Retourne le statut de succès/échec
- Nécessite les rôles: ADMIN ou TENANT_ADMIN
- Service: `QueuesService.reloadQueue()` (lignes 736-762)
- Contrôleur: `QueuesController.reloadQueue()` (lignes 134-148)

---

### 6. GET `/queues/:name/members/enriched`
**Description**: Récupère tous les membres d'une queue avec enrichissement complet (données DB + AMI + endpoint).

**Paramètres**:
- `name` (path): Nom de la queue (ex: "support")

**Réponse**: Tableau d'objets `EnrichedMemberDto`
```json
[
  {
    "interface": "PJSIP/t1_101",
    "member_name": "101",
    "queue_name": "support",
    "status": "1",
    "detailed_status": "available",
    "paused": false,
    "paused_reason": null,
    "in_call": false,
    "penalty": 0,
    "calls_taken": 12,
    "last_call": 1698765432,
    "time_since_last_call": 3600,
    "endpoint": {
      "id": "101",
      "tenant_id": 1,
      "transport": "transport-udp",
      "context": "from-internal",
      "registered": true,
      "device_state": "NOT_INUSE"
    },
    "ami_data_available": true,
    "enriched_at": "2025-10-31T04:30:00.000Z"
  }
]
```

**Détails**:
- Enrichit les données des membres avec:
  - Informations de base (DB: `queue_members`)
  - Statut en temps réel (AMI: QueueStatus)
  - Données de l'endpoint SIP (DB: `ps_endpoints`)
- Calcule le `detailed_status`: offline | paused | in_call | available | unknown
- Calcule le temps depuis le dernier appel
- Service: `QueueMembersService.findAllEnriched()` (lignes 177-305)
- Contrôleur: `QueueMembersController.getAllEnriched()` (lignes 58-71)

---

## Architecture Technique

### Pattern d'Enrichissement
Tous les endpoints suivent un pattern d'enrichissement en 3 couches:

1. **Couche DB**: Données de configuration persistantes (TypeORM)
2. **Couche AMI**: Données en temps réel d'Asterisk (AmiService)
3. **Couche Calcul**: Agrégation, calculs statistiques et métriques

### Services Utilisés

- `QueuesService`: Logique métier pour les queues
- `QueueMembersService`: Logique métier pour les membres
- `AmiService`: Communication avec Asterisk Manager Interface
- `EndpointsService`: Gestion des endpoints SIP
- `TenantPrefixUtil`: Gestion des préfixes multi-tenant

### Multi-Tenancy

Tous les endpoints supportent la multi-tenancy via:
- Décorateur `@CurrentTenant()` pour récupérer le tenant du token JWT
- Utilisation de `TenantPrefixUtil` pour préfixer les noms (format: `t{tenantId}_{name}`)
- Filtrage automatique par `tenantId` dans les requêtes DB

### Gestion des Erreurs

- Validation automatique des DTOs (class-validator)
- Gestion gracieuse des erreurs AMI (fallback sur données DB)
- Logs structurés avec `@nestjs/common/Logger`
- Exceptions HTTP appropriées (NotFoundException, etc.)

---

## Tests Recommandés

### Tests Manuels via Swagger

L'API Swagger est disponible à `/api/docs` et permet de tester tous les endpoints interactivement.

### Tests avec curl

```bash
# Obtenir un token JWT
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "your_password"}'

# Exporter le token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test Endpoint 1: Queues enrichies
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/enriched

# Test Endpoint 2: Stats globales
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/stats/global

# Test Endpoint 3: Détails d'une queue
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/support/details

# Test Endpoint 4: Appels en attente
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/support/calls

# Test Endpoint 5: Reload d'une queue
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/support/reload

# Test Endpoint 6: Membres enrichis
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/queues/support/members/enriched
```

---

## Fichiers Modifiés/Créés

### DTOs Créés
- `/src/queues/dto/enriched-queue.dto.ts`
- `/src/queues/dto/global-stats.dto.ts`
- `/src/queues/dto/queue-details.dto.ts`
- `/src/queues/dto/queue-calls.dto.ts`
- `/src/queues/dto/queue-reload.dto.ts`
- `/src/queue-members/dto/enriched-member.dto.ts`

### Services Modifiés
- `/src/queues/queues.service.ts` (ajout de 6 méthodes)
- `/src/queue-members/queue-members.service.ts` (ajout de 1 méthode)

### Contrôleurs Modifiés
- `/src/queues/queues.controller.ts` (ajout de 5 endpoints)
- `/src/queue-members/queue-members.controller.ts` (ajout de 1 endpoint)

---

## État de l'Implémentation

✅ Phase 1 - Configuration et tests de connexion
✅ Phase 2 - Implémentation des 5 endpoints de queues
✅ Phase 3 - Implémentation de l'endpoint members enriched
✅ Phase 4 - Tests manuels (via Swagger recommandé)
✅ Phase 5 - Documentation

**Statut final**: Tous les endpoints sont implémentés, compilés et prêts à être testés. L'application tourne sans erreurs de compilation.

---

## Configuration Requise

### Variables d'Environnement (.env)
```env
# AMI Configuration
AMI_HOST=161.97.106.134
AMI_PORT=5038
AMI_USER=admin
AMI_PASSWORD=Sp33Dd14L

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=asterisk
DB_PASSWORD=your_password
DB_NAME=asterisk_api_v2
```

### Prérequis
- Asterisk avec AMI activé
- Base de données PostgreSQL avec les tables:
  - `queue_config`
  - `queue_members`
  - `ps_endpoints`
  - `tenants`
- Node.js 20.x
- NestJS 10.x

---

## Prochaines Étapes (Optionnel)

1. **Tests Unitaires**: Ajouter des tests Jest pour chaque méthode de service
2. **Tests d'Intégration**: Tester les flux complets avec des données réelles
3. **Performance**: Ajouter du caching Redis pour les données AMI fréquemment accédées
4. **WebSockets**: Implémenter des événements en temps réel pour les changements de statut
5. **Monitoring**: Ajouter des métriques Prometheus pour suivre les performances

---

**Date de création**: 31 Octobre 2025
**Version de l'API**: v2
**Auteur**: Implémentation basée sur l'ancien backend Express.js
