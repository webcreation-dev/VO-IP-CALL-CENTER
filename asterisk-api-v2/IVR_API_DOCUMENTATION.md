# Documentation API IVR - Asterisk REST Interface (ARI)

## 📋 Table des Matières
1. [Explication du Processus IVR](#explication-du-processus-ivr)
2. [Configuration Postman](#configuration-postman)
3. [Endpoints Menus IVR](#endpoints-menus-ivr)
4. [Endpoints Options DTMF](#endpoints-options-dtmf)
5. [Endpoints Conditions](#endpoints-conditions)
6. [Endpoints Mappings DID](#endpoints-mappings-did)
7. [Endpoints Fichiers Audio](#endpoints-fichiers-audio)
8. [Types d'Actions Disponibles](#types-dactions-disponibles)
9. [Exemples Complets](#exemples-complets)

---

## 🎯 Explication du Processus IVR

### Architecture et Fonctionnement

Le système IVR (Interactive Voice Response) est basé sur **Asterisk REST Interface (ARI)**, une interface WebSocket temps réel qui permet de contrôler complètement le flux d'appels. Lorsqu'un appel arrive sur un DID configuré, Asterisk le redirige vers l'application Stasis `ivr-app` qui émet un événement `StasisStart`. L'orchestrateur IVR (`IvrOrchestratorService`) capte cet événement, identifie le menu associé au DID, évalue les conditions contextuelles (horaires, caller ID, etc.), puis répond à l'appel et joue le son de bienvenue. Le système attend ensuite l'input DTMF du client (touche pressée), recherche l'option correspondante dans la configuration, et exécute l'action associée via l'`IvrActionExecutorService`. Les actions peuvent être simples (transfert vers une queue, playback audio, raccrocher) ou complexes (sous-menus imbriqués, actions chaînées, conditions multiples). Toute la session est gérée en mémoire avec un système de retry automatique en cas de timeout ou choix invalide.

### Niveau de Configuration et Flexibilité

Le système offre un **niveau de configuration très avancé** permettant de créer des scénarios IVR complexes sans coder. Chaque menu IVR peut avoir un nombre illimité d'options DTMF (0-9, *, #), chacune avec sa propre action et priorité. Les conditions permettent de router dynamiquement les appels selon le contexte : plages horaires (jours de la semaine, heures d'ouverture avec timezone), patterns de numéros appelants (regex sur caller ID pour clients VIP), ou numéros appelés (DID). Les actions sont **chaînables** (par exemple : jouer un message puis transférer), et 8 types d'actions sont supportés (queue, endpoint, submenu, playback, hangup, voicemail, callback, external_api - les 3 dernières en TODO). La gestion audio est complète avec upload de fichiers personnalisés, conversion automatique vers les formats Asterisk (WAV, GSM, SLN16), et génération de prompts par Text-to-Speech (Google Cloud TTS). Le système supporte également l'import/export de configurations, la duplication de menus, la validation pré-déploiement, et des tests de simulation sans impacter les appels réels. L'isolation multi-tenant garantit que chaque organisation a ses propres menus, audio, et configurations totalement séparés.

---

## ⚙️ Configuration Postman

### Variables d'Environnement

Créez un environnement Postman avec ces variables :

```json
{
  "asterisk_base_url": "http://localhost:3001/api/v1",
  "token": "votre_jwt_token",
  "tenant_id": "1"
}
```

### Headers Globaux

Ajoutez ces headers à toutes vos requêtes :

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

---

## 📁 Endpoints Menus IVR

### 1. Créer un Menu IVR

**POST** `{{asterisk_base_url}}/ivr/menus?tenantId={{tenant_id}}`

**Body:**
```json
{
  "name": "Menu Principal Support",
  "description": "Menu principal du service client",
  "welcome_sound": "welcome-support",
  "invalid_sound": "invalid-choice",
  "timeout_sound": "timeout",
  "timeout": 5,
  "max_retries": 3,
  "max_digits": 1,
  "timeout_action": {
    "type": "queue",
    "target": "queue-uuid-here"
  },
  "invalid_action": {
    "type": "hangup"
  },
  "is_active": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "name": "Menu Principal Support",
    "description": "Menu principal du service client",
    "welcome_sound": "welcome-support",
    "invalid_sound": "invalid-choice",
    "timeout_sound": "timeout",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": { "type": "queue", "target": "queue-uuid-here" },
    "invalid_action": { "type": "hangup" },
    "is_active": true,
    "created_at": "2025-11-04T16:00:00.000Z",
    "updated_at": "2025-11-04T16:00:00.000Z"
  },
  "timestamp": "2025-11-04T16:00:00.000Z"
}
```

---

### 2. Lister Tous les Menus

**GET** `{{asterisk_base_url}}/ivr/menus?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenantId": 1,
      "name": "Menu Principal Support",
      "description": "Menu principal du service client",
      "welcome_sound": "welcome-support",
      "is_active": true,
      "created_at": "2025-11-04T16:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-04T16:00:00.000Z"
}
```

---

### 3. Récupérer un Menu Spécifique

**GET** `{{asterisk_base_url}}/ivr/menus/:menuId?tenantId={{tenant_id}}`

**Exemple:** `{{asterisk_base_url}}/ivr/menus/1?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "name": "Menu Principal Support",
    "description": "Menu principal du service client",
    "welcome_sound": "welcome-support",
    "invalid_sound": "invalid-choice",
    "timeout_sound": "timeout",
    "timeout": 5,
    "max_retries": 3,
    "max_digits": 1,
    "timeout_action": { "type": "queue", "target": "queue-uuid-here" },
    "invalid_action": { "type": "hangup" },
    "is_active": true,
    "created_at": "2025-11-04T16:00:00.000Z",
    "updated_at": "2025-11-04T16:00:00.000Z",
    "options": [],
    "conditions": []
  },
  "timestamp": "2025-11-04T16:00:00.000Z"
}
```

---

### 4. Mettre à Jour un Menu

**PATCH** `{{asterisk_base_url}}/ivr/menus/:menuId?tenantId={{tenant_id}}`

**Body (tous les champs sont optionnels):**
```json
{
  "name": "Menu Principal Support - Modifié",
  "description": "Nouvelle description",
  "timeout": 10,
  "max_retries": 5
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "name": "Menu Principal Support - Modifié",
    "description": "Nouvelle description",
    "timeout": 10,
    "max_retries": 5,
    "updated_at": "2025-11-04T16:30:00.000Z"
  },
  "timestamp": "2025-11-04T16:30:00.000Z"
}
```

---

### 5. Supprimer un Menu

**DELETE** `{{asterisk_base_url}}/ivr/menus/:menuId?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "message": "Menu deleted successfully",
  "timestamp": "2025-11-04T16:35:00.000Z"
}
```

---

### 6. Dupliquer un Menu

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/duplicate?tenantId={{tenant_id}}`

**Body:**
```json
{
  "name": "Copie - Menu Principal Support"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "tenantId": 1,
    "name": "Copie - Menu Principal Support",
    "description": "Menu principal du service client",
    "options_count": 5,
    "conditions_count": 2
  },
  "timestamp": "2025-11-04T16:40:00.000Z"
}
```

---

### 7. Tester la Configuration d'un Menu

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/test?tenantId={{tenant_id}}`

**Body:**
```json
{
  "callerId": "+33612345678",
  "did": "+33987654321",
  "datetime": "2025-11-04T14:30:00Z"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "menu_id": 1,
    "menu_name": "Menu Principal Support",
    "conditions_evaluated": 2,
    "conditions_matched": 1,
    "final_menu": {
      "id": 3,
      "name": "Menu Heures Ouverture"
    },
    "simulation": {
      "welcome_sound": "welcome-business-hours",
      "available_options": ["1", "2", "3", "0"],
      "timeout": 5,
      "max_retries": 3
    }
  },
  "timestamp": "2025-11-04T16:45:00.000Z"
}
```

---

### 8. Valider la Configuration d'un Menu

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/validate?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [
      "Option with digit '9' has no description"
    ],
    "stats": {
      "total_options": 5,
      "active_options": 5,
      "total_conditions": 2,
      "active_conditions": 2,
      "max_depth": 3
    }
  },
  "timestamp": "2025-11-04T16:50:00.000Z"
}
```

---

### 9. Exporter un Menu (JSON)

**GET** `{{asterisk_base_url}}/ivr/menus/:menuId/export?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "version": "1.0",
    "exported_at": "2025-11-04T16:55:00.000Z",
    "menu": {
      "id": 1,
      "name": "Menu Principal Support",
      "description": "Menu principal du service client",
      "welcome_sound": "welcome-support",
      "timeout": 5,
      "max_retries": 3
    },
    "options": [
      {
        "digit": "1",
        "description": "Service commercial",
        "action": { "type": "queue", "target": "sales-queue-id" }
      }
    ],
    "conditions": [
      {
        "condition_type": "time",
        "condition_config": {
          "days": [1, 2, 3, 4, 5],
          "start_time": "09:00",
          "end_time": "18:00"
        },
        "action": { "type": "submenu", "target": "business-hours-menu" }
      }
    ]
  },
  "timestamp": "2025-11-04T16:55:00.000Z"
}
```

---

### 10. Importer un Menu (JSON)

**POST** `{{asterisk_base_url}}/ivr/menus/import?tenantId={{tenant_id}}`

**Body:**
```json
{
  "version": "1.0",
  "menu": {
    "name": "Menu Importé",
    "description": "Configuration importée",
    "welcome_sound": "welcome-imported",
    "timeout": 5,
    "max_retries": 3,
    "timeout_action": { "type": "hangup" },
    "invalid_action": { "type": "hangup" }
  },
  "options": [
    {
      "digit": "1",
      "action": { "type": "queue", "target": "queue-id" }
    }
  ],
  "conditions": []
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "menu_id": 5,
    "menu_name": "Menu Importé",
    "options_imported": 1,
    "conditions_imported": 0
  },
  "timestamp": "2025-11-04T17:00:00.000Z"
}
```

---

### 11. Cloner un Menu vers un Autre Tenant (ADMIN ONLY)

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/clone-to-tenant?tenantId={{tenant_id}}`

**Body:**
```json
{
  "target_tenant_id": 2,
  "new_name": "Menu Cloné pour Tenant 2"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "source_menu_id": 1,
    "source_tenant_id": 1,
    "cloned_menu_id": 6,
    "target_tenant_id": 2,
    "cloned_menu_name": "Menu Cloné pour Tenant 2"
  },
  "timestamp": "2025-11-04T17:05:00.000Z"
}
```

---

## 🔢 Endpoints Options DTMF

### 12. Ajouter une Option à un Menu

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/options?tenantId={{tenant_id}}`

**Body:**
```json
{
  "digit": "1",
  "description": "Service commercial",
  "action": {
    "type": "queue",
    "target": "t1_sales",
    "announce": "transfert-sales"
  },
  "priority": 0,
  "is_active": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "menu_id": 1,
    "tenantId": 1,
    "digit": "1",
    "description": "Service commercial",
    "action": {
      "type": "queue",
      "target": "t1_sales",
      "announce": "transfert-sales"
    },
    "priority": 0,
    "is_active": true,
    "created_at": "2025-11-04T17:10:00.000Z"
  },
  "timestamp": "2025-11-04T17:10:00.000Z"
}
```

---

### 13. Lister les Options d'un Menu

**GET** `{{asterisk_base_url}}/ivr/menus/:menuId/options?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "digit": "1",
      "description": "Service commercial",
      "action": { "type": "queue", "target": "t1_sales" },
      "priority": 0,
      "is_active": true
    },
    {
      "id": 2,
      "digit": "2",
      "description": "Support technique",
      "action": { "type": "queue", "target": "t1_support" },
      "priority": 1,
      "is_active": true
    }
  ],
  "timestamp": "2025-11-04T17:15:00.000Z"
}
```

---

### 14. Mettre à Jour une Option

**PATCH** `{{asterisk_base_url}}/ivr/menus/:menuId/options/:optionId?tenantId={{tenant_id}}`

**Body:**
```json
{
  "description": "Service commercial - Nouvelle description",
  "priority": 10
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "digit": "1",
    "description": "Service commercial - Nouvelle description",
    "priority": 10,
    "updated_at": "2025-11-04T17:20:00.000Z"
  },
  "timestamp": "2025-11-04T17:20:00.000Z"
}
```











-------





---

### 15. Supprimer une Option

**DELETE** `{{asterisk_base_url}}/ivr/menus/:menuId/options/:optionId?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "message": "Option deleted successfully",
  "timestamp": "2025-11-04T17:25:00.000Z"
}
```

---

### 16. Réorganiser les Options

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/options/reorder?tenantId={{tenant_id}}`

**Body:**
```json
{
  "order": [
    { "optionId": 1, "priority": 0 },
    { "optionId": 2, "priority": 1 },
    { "optionId": 3, "priority": 2 }
  ]
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Options reordered successfully",
  "data": {
    "updated_count": 3
  },
  "timestamp": "2025-11-04T17:30:00.000Z"
}
```

---

### 17. Récupérer une Option par ID

**GET** `{{asterisk_base_url}}/ivr/options/:optionId?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "menu_id": 1,
    "digit": "1",
    "description": "Service commercial",
    "action": { "type": "queue", "target": "t1_sales" },
    "priority": 0,
    "is_active": true
  },
  "timestamp": "2025-11-04T17:35:00.000Z"
}
```

---

### 18. Activer/Désactiver une Option

**POST** `{{asterisk_base_url}}/ivr/options/:optionId/toggle?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "is_active": false
  },
  "timestamp": "2025-11-04T17:40:00.000Z"
}
```

---

### 19. Modifier la Priorité d'une Option

**PATCH** `{{asterisk_base_url}}/ivr/options/:optionId/priority?tenantId={{tenant_id}}`

**Body:**
```json
{
  "priority": 99
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "priority": 99
  },
  "timestamp": "2025-11-04T17:45:00.000Z"
}
```

---

### 20. Valider une Action

**POST** `{{asterisk_base_url}}/ivr/options/validate-action?tenantId={{tenant_id}}`

**Body:**
```json
{
  "type": "queue",
  "target": "t1_sales",
  "announce": "transfert-sales"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "Action is valid"
  },
  "timestamp": "2025-11-04T17:50:00.000Z"
}
```

---

## ⚡ Endpoints Conditions

### 21. Ajouter une Condition à un Menu

**POST** `{{asterisk_base_url}}/ivr/menus/:menuId/conditions?tenantId={{tenant_id}}`

**Body (Condition Horaire):**
```json
{
  "condition_type": "time",
  "condition_config": {
    "days": [1, 2, 3, 4, 5],
    "start_time": "09:00",
    "end_time": "18:00",
    "timezone": "Europe/Paris"
  },
  "action": {
    "type": "submenu",
    "target": "business-hours-menu-id"
  },
  "priority": 0,
  "is_active": true
}
```

**Body (Condition Caller ID):**
```json
{
  "condition_type": "caller_id",
  "condition_config": {
    "caller_pattern": "^\\+33[67]"
  },
  "action": {
    "type": "queue",
    "target": "vip-queue-id"
  },
  "priority": 1,
  "is_active": true
}
```

**Body (Condition DID):**
```json
{
  "condition_type": "did",
  "condition_config": {
    "did_pattern": "^\\+229"
  },
  "action": {
    "type": "playback",
    "sounds": ["greeting-benin"]
  },
  "priority": 2,
  "is_active": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "menu_id": 1,
    "tenantId": 1,
    "condition_type": "time",
    "condition_config": {
      "days": [1, 2, 3, 4, 5],
      "start_time": "09:00",
      "end_time": "18:00",
      "timezone": "Europe/Paris"
    },
    "action": {
      "type": "submenu",
      "target": "business-hours-menu-id"
    },
    "priority": 0,
    "is_active": true,
    "created_at": "2025-11-04T18:00:00.000Z"
  },
  "timestamp": "2025-11-04T18:00:00.000Z"
}
```

---

### 22. Lister les Conditions d'un Menu

**GET** `{{asterisk_base_url}}/ivr/menus/:menuId/conditions?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "condition_type": "time",
      "condition_config": {
        "days": [1, 2, 3, 4, 5],
        "start_time": "09:00",
        "end_time": "18:00"
      },
      "action": { "type": "submenu", "target": "business-hours-menu-id" },
      "priority": 0,
      "is_active": true
    }
  ],
  "timestamp": "2025-11-04T18:05:00.000Z"
}
```

---

### 23. Récupérer une Condition par ID

**GET** `{{asterisk_base_url}}/ivr/conditions/:conditionId?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "menu_id": 1,
    "condition_type": "time",
    "condition_config": {
      "days": [1, 2, 3, 4, 5],
      "start_time": "09:00",
      "end_time": "18:00",
      "timezone": "Europe/Paris"
    },
    "action": { "type": "submenu", "target": "business-hours-menu-id" },
    "priority": 0,
    "is_active": true
  },
  "timestamp": "2025-11-04T18:10:00.000Z"
}
```

---

### 24. Mettre à Jour une Condition

**PATCH** `{{asterisk_base_url}}/ivr/conditions/:conditionId?tenantId={{tenant_id}}`

**Body:**
```json
{
  "condition_config": {
    "days": [1, 2, 3, 4, 5, 6],
    "start_time": "08:00",
    "end_time": "20:00"
  },
  "priority": 5
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "condition_config": {
      "days": [1, 2, 3, 4, 5, 6],
      "start_time": "08:00",
      "end_time": "20:00"
    },
    "priority": 5,
    "updated_at": "2025-11-04T18:15:00.000Z"
  },
  "timestamp": "2025-11-04T18:15:00.000Z"
}
```

---

### 25. Supprimer une Condition

**DELETE** `{{asterisk_base_url}}/ivr/conditions/:conditionId?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "message": "Condition deleted successfully",
  "timestamp": "2025-11-04T18:20:00.000Z"
}
```

---

### 26. Activer/Désactiver une Condition

**POST** `{{asterisk_base_url}}/ivr/conditions/:conditionId/toggle?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "is_active": false
  },
  "timestamp": "2025-11-04T18:25:00.000Z"
}
```

---

## 📞 Endpoints Mappings DID

### 27. Créer un Mapping DID → Menu

**POST** `{{asterisk_base_url}}/ivr/did-mappings?tenantId={{tenant_id}}`

**Body:**
```json
{
  "did": "+33987654321",
  "menu_id": 1,
  "is_active": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "did": "+33987654321",
    "menu_id": 1,
    "is_active": true,
    "created_at": "2025-11-04T18:30:00.000Z"
  },
  "timestamp": "2025-11-04T18:30:00.000Z"
}
```

---

### 28. Lister Tous les Mappings DID

**GET** `{{asterisk_base_url}}/ivr/did-mappings?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenantId": 1,
      "did": "+33987654321",
      "menu_id": 1,
      "menu_name": "Menu Principal Support",
      "is_active": true,
      "created_at": "2025-11-04T18:30:00.000Z"
    }
  ],
  "timestamp": "2025-11-04T18:35:00.000Z"
}
```

---

### 29. Trouver un Mapping par DID

**GET** `{{asterisk_base_url}}/ivr/did-mappings/by-did/:did?tenantId={{tenant_id}}`

**Exemple:** `{{asterisk_base_url}}/ivr/did-mappings/by-did/+33987654321?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "did": "+33987654321",
    "menu_id": 1,
    "menu_name": "Menu Principal Support",
    "is_active": true
  },
  "timestamp": "2025-11-04T18:40:00.000Z"
}
```

---

### 30. Mettre à Jour un Mapping DID

**PATCH** `{{asterisk_base_url}}/ivr/did-mappings/:id?tenantId={{tenant_id}}`

**Body:**
```json
{
  "menu_id": 2,
  "is_active": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "did": "+33987654321",
    "menu_id": 2,
    "is_active": true,
    "updated_at": "2025-11-04T18:45:00.000Z"
  },
  "timestamp": "2025-11-04T18:45:00.000Z"
}
```

---

### 31. Supprimer un Mapping DID

**DELETE** `{{asterisk_base_url}}/ivr/did-mappings/:id?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "message": "DID mapping deleted successfully",
  "timestamp": "2025-11-04T18:50:00.000Z"
}
```

---

## 🎵 Endpoints Fichiers Audio

### 32. Upload un Fichier Audio

**POST** `{{asterisk_base_url}}/ivr/audio/upload?tenantId={{tenant_id}}`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

**Body (form-data):**
```
file: (sélectionner un fichier .wav, .mp3, .gsm)
name: "welcome-support"
language: "fr"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "name": "welcome-support",
    "filename": "t1_welcome-support.wav",
    "filepath": "/var/lib/asterisk/sounds/custom/t1_welcome-support.wav",
    "format": "wav",
    "duration": 12.5,
    "language": "fr",
    "filesize": 256000,
    "created_at": "2025-11-04T19:00:00.000Z"
  },
  "timestamp": "2025-11-04T19:00:00.000Z"
}
```

---

### 33. Lister les Fichiers Audio

**GET** `{{asterisk_base_url}}/ivr/audio?tenantId={{tenant_id}}&language=fr`

**Query Params:**
- `tenantId` (requis): ID du tenant
- `language` (optionnel): Filtrer par langue (fr, en, etc.)

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "welcome-support",
      "filename": "t1_welcome-support.wav",
      "format": "wav",
      "duration": 12.5,
      "language": "fr",
      "filesize": 256000,
      "created_at": "2025-11-04T19:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-04T19:05:00.000Z"
}
```

---

### 34. Récupérer un Fichier Audio

**GET** `{{asterisk_base_url}}/ivr/audio/:id?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "tenantId": 1,
    "name": "welcome-support",
    "filename": "t1_welcome-support.wav",
    "filepath": "/var/lib/asterisk/sounds/custom/t1_welcome-support.wav",
    "format": "wav",
    "duration": 12.5,
    "language": "fr",
    "filesize": 256000,
    "created_at": "2025-11-04T19:00:00.000Z"
  },
  "timestamp": "2025-11-04T19:10:00.000Z"
}
```

---

### 35. Télécharger un Fichier Audio

**GET** `{{asterisk_base_url}}/ivr/audio/:id/download?tenantId={{tenant_id}}`

**Réponse:** Fichier binaire (audio/wav)

---

### 36. Supprimer un Fichier Audio

**DELETE** `{{asterisk_base_url}}/ivr/audio/:id?tenantId={{tenant_id}}`

**Réponse:**
```json
{
  "success": true,
  "message": "Audio file deleted successfully",
  "timestamp": "2025-11-04T19:15:00.000Z"
}
```

---

### 37. Convertir un Fichier Audio

**POST** `{{asterisk_base_url}}/ivr/audio/:id/convert?tenantId={{tenant_id}}`

**Body:**
```json
{
  "targetFormat": "gsm"
}
```

**Formats supportés:** `wav`, `gsm`, `sln16`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "tenantId": 1,
    "name": "welcome-support-gsm",
    "filename": "t1_welcome-support.gsm",
    "filepath": "/var/lib/asterisk/sounds/custom/t1_welcome-support.gsm",
    "format": "gsm",
    "duration": 12.5,
    "filesize": 65000,
    "created_at": "2025-11-04T19:20:00.000Z"
  },
  "timestamp": "2025-11-04T19:20:00.000Z"
}
```

---

### 38. Générer un Fichier Audio via TTS

**POST** `{{asterisk_base_url}}/ivr/audio/generate-tts?tenantId={{tenant_id}}`

**Body:**
```json
{
  "text": "Bienvenue sur notre service client. Veuillez choisir une option.",
  "language": "fr-FR",
  "voice": "fr-FR-Standard-A",
  "name": "welcome-tts"
}
```

**Voix disponibles:**
- `fr-FR-Standard-A` (Femme)
- `fr-FR-Standard-B` (Homme)
- `fr-FR-Standard-C` (Femme)
- `fr-FR-Standard-D` (Homme)
- `en-US-Standard-A` (Femme)
- `en-US-Standard-B` (Homme)

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "tenantId": 1,
    "name": "welcome-tts",
    "filename": "t1_welcome-tts.wav",
    "filepath": "/var/lib/asterisk/sounds/custom/t1_welcome-tts.wav",
    "format": "wav",
    "duration": 8.2,
    "language": "fr",
    "filesize": 164000,
    "created_at": "2025-11-04T19:25:00.000Z"
  },
  "timestamp": "2025-11-04T19:25:00.000Z"
}
```

---





## 🎬 Types d'Actions Disponibles

### 1. Action Queue (Transfert vers File d'Attente)

```json
{
  "type": "queue",
  "target": "t1_support",
  "announce": "transfert-support",
  "timeout": 30
}
```

**Champs:**
- `type`: `"queue"` (requis)
- `target`: Nom de la queue (requis)
- `announce`: Son à jouer avant mise en queue (optionnel)
- `timeout`: Timeout spécifique (optionnel)

---

### 2. Action Endpoint (Appel Direct)

```json
{
  "type": "endpoint",
  "target": "t1_101",
  "timeout": 30
}
```

**Champs:**
- `type`: `"endpoint"` (requis)
- `target`: ID de l'endpoint (requis)
- `timeout`: Durée de sonnerie max en secondes (optionnel)

---

### 3. Action Submenu (Sous-Menu)

```json
{
  "type": "submenu",
  "target": "3"
}
```

**Champs:**
- `type`: `"submenu"` (requis)
- `target`: ID du menu à ouvrir (requis)

---

### 4. Action Playback (Lecture Audio)

```json
{
  "type": "playback",
  "sounds": ["message-1", "message-2", "beep"],
  "then": {
    "type": "queue",
    "target": "t1_support"
  }
}
```

**Champs:**
- `type`: `"playback"` (requis)
- `sounds`: Liste de fichiers audio (requis)
- `then`: Action suivante (optionnel, chaînable)

**Formats de sons supportés:**
- `"custom-sound"`: Fichier audio custom du tenant
- `"say:Bonjour"`: TTS à la volée
- `"number:123"`: Dire un nombre
- `"digits:456"`: Dire des chiffres
- `"beep"`: Son standard Asterisk

---

### 5. Action Hangup (Raccrocher)

```json
{
  "type": "hangup",
  "cause": "normal"
}
```

**Champs:**
- `type`: `"hangup"` (requis)
- `cause`: Cause du hangup (optionnel)

---

### 6. Action Voicemail (Messagerie Vocale) - TODO

```json
{
  "type": "voicemail",
  "mailbox": "101@default"
}
```

**Statut:** Non implémenté

---

### 7. Action Callback (Rappel Automatique) - TODO

```json
{
  "type": "callback",
  "queue_id": "t1_support",
  "message": "callback-confirm"
}
```

**Statut:** Non implémenté

---

### 8. Action External API (Webhook) - TODO

```json
{
  "type": "external_api",
  "url": "https://api.example.com/ivr-webhook",
  "method": "POST",
  "headers": {
    "X-Custom-Header": "value"
  },
  "body": {
    "caller": "{{caller_id}}",
    "did": "{{did}}"
  },
  "then": {
    "type": "queue",
    "target": "t1_support"
  }
}
```

**Statut:** Non implémenté

---

## 📖 Exemples Complets

### Exemple 1: Menu IVR Simple

**Scénario:** Menu avec 3 options (commercial, support, réentendre)

**Étape 1: Créer le menu**

```bash
POST {{asterisk_base_url}}/ivr/menus?tenantId=1
```

```json
{
  "name": "Menu Principal",
  "welcome_sound": "welcome",
  "invalid_sound": "invalid-choice",
  "timeout_sound": "timeout",
  "timeout": 5,
  "max_retries": 3,
  "max_digits": 1,
  "timeout_action": {
    "type": "hangup"
  },
  "invalid_action": {
    "type": "hangup"
  }
}
```

**Étape 2: Ajouter les options**

```bash
POST {{asterisk_base_url}}/ivr/menus/1/options?tenantId=1
```

**Option 1: Commercial**
```json
{
  "digit": "1",
  "description": "Service commercial",
  "action": {
    "type": "queue",
    "target": "t1_sales"
  },
  "priority": 0
}
```

**Option 2: Support**
```json
{
  "digit": "2",
  "description": "Support technique",
  "action": {
    "type": "queue",
    "target": "t1_support"
  },
  "priority": 1
}
```

**Option 9: Réentendre**
```json
{
  "digit": "9",
  "description": "Réentendre le menu",
  "action": {
    "type": "playback",
    "sounds": ["welcome"]
  },
  "priority": 10
}
```

**Étape 3: Mapper un DID**

```bash
POST {{asterisk_base_url}}/ivr/did-mappings?tenantId=1
```

```json
{
  "did": "+33987654321",
  "menu_id": 1,
  "is_active": true
}
```

---

### Exemple 2: Menu avec Conditions Horaires

**Scénario:** Menu différent selon heures ouverture/fermeture

**Étape 1: Créer le menu principal**

```bash
POST {{asterisk_base_url}}/ivr/menus?tenantId=1
```

```json
{
  "name": "Menu Principal",
  "welcome_sound": "welcome",
  "timeout": 5,
  "max_retries": 3,
  "timeout_action": { "type": "hangup" },
  "invalid_action": { "type": "hangup" }
}
```

**Étape 2: Créer le menu heures ouverture**

```bash
POST {{asterisk_base_url}}/ivr/menus?tenantId=1
```

```json
{
  "name": "Menu Heures Ouverture",
  "welcome_sound": "welcome-business-hours",
  "timeout": 5,
  "max_retries": 3,
  "timeout_action": { "type": "queue", "target": "t1_support" },
  "invalid_action": { "type": "hangup" }
}
```

**Étape 3: Créer le menu heures fermeture**

```bash
POST {{asterisk_base_url}}/ivr/menus?tenantId=1
```

```json
{
  "name": "Menu Heures Fermeture",
  "welcome_sound": "welcome-closed",
  "timeout": 5,
  "max_retries": 3,
  "timeout_action": { "type": "hangup" },
  "invalid_action": { "type": "hangup" }
}
```

**Étape 4: Ajouter condition horaire au menu principal**

```bash
POST {{asterisk_base_url}}/ivr/menus/1/conditions?tenantId=1
```

**Condition heures ouverture:**
```json
{
  "condition_type": "time",
  "condition_config": {
    "days": [1, 2, 3, 4, 5],
    "start_time": "09:00",
    "end_time": "18:00",
    "timezone": "Europe/Paris"
  },
  "action": {
    "type": "submenu",
    "target": "2"
  },
  "priority": 0,
  "is_active": true
}
```

**Condition heures fermeture:**
```json
{
  "condition_type": "time",
  "condition_config": {
    "days": [0, 6],
    "start_time": "00:00",
    "end_time": "23:59",
    "timezone": "Europe/Paris"
  },
  "action": {
    "type": "submenu",
    "target": "3"
  },
  "priority": 1,
  "is_active": true
}
```

---

### Exemple 3: Menu avec TTS

**Scénario:** Générer les prompts vocaux automatiquement

**Étape 1: Générer le prompt d'accueil**

```bash
POST {{asterisk_base_url}}/ivr/audio/generate-tts?tenantId=1
```

```json
{
  "text": "Bienvenue sur notre service client. Pour le service commercial, tapez 1. Pour le support technique, tapez 2. Pour raccrocher, tapez étoile.",
  "language": "fr-FR",
  "voice": "fr-FR-Standard-A",
  "name": "welcome-tts"
}
```

**Étape 2: Générer le prompt choix invalide**

```bash
POST {{asterisk_base_url}}/ivr/audio/generate-tts?tenantId=1
```

```json
{
  "text": "Choix invalide. Veuillez réessayer.",
  "language": "fr-FR",
  "voice": "fr-FR-Standard-A",
  "name": "invalid-choice-tts"
}
```

**Étape 3: Créer le menu avec les sons TTS**

```bash
POST {{asterisk_base_url}}/ivr/menus?tenantId=1
```

```json
{
  "name": "Menu TTS",
  "welcome_sound": "welcome-tts",
  "invalid_sound": "invalid-choice-tts",
  "timeout": 5,
  "max_retries": 3,
  "timeout_action": { "type": "hangup" },
  "invalid_action": { "type": "hangup" }
}
```

---

## 🔐 Authentification

Toutes les requêtes nécessitent un JWT Bearer Token valide.

**Obtenir un token:**

```bash
POST {{asterisk_base_url}}/auth/login
Content-Type: application/json

{
  "email": "admin@asterisk.local",
  "password": "Admin123!"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@asterisk.local",
      "role": "SUPER_ADMIN"
    }
  }
}
```

**Utiliser le token dans les requêtes:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Notes Importantes

1. **Tenant ID:** Toutes les requêtes nécessitent le paramètre `?tenantId={id}`

2. **Isolation Multi-Tenant:** Chaque tenant a ses propres menus, options, conditions, et fichiers audio

3. **Formats Audio Supportés:**
   - Upload: `.wav`, `.mp3`, `.gsm`, `.sln16`
   - Recommandé Asterisk: `.wav` (16kHz, mono) ou `.gsm`

4. **Actions Chaînables:** Les actions `playback` peuvent avoir un champ `then` pour enchaîner une autre action

5. **Conditions:** Évaluées par ordre de priorité (0 = priorité la plus haute)

6. **Options DTMF:** Le digit doit être unique par menu (si actif)

7. **Validation:** Utilisez `/ivr/menus/:id/validate` avant de déployer en production

8. **Test:** Utilisez `/ivr/menus/:id/test` pour simuler le comportement sans impacter les appels réels

---

## 🚀 Collection Postman Suggérée

### Structure de Collection:

```
📁 Asterisk IVR API
│
├── 📁 01. Authentication
│   └── POST Login
│
├── 📁 02. Menus IVR
│   ├── POST Create Menu
│   ├── GET List Menus
│   ├── GET Get Menu
│   ├── PATCH Update Menu
│   ├── DELETE Delete Menu
│   ├── POST Duplicate Menu
│   ├── POST Test Menu
│   ├── POST Validate Menu
│   ├── GET Export Menu
│   └── POST Import Menu
│
├── 📁 03. Options DTMF
│   ├── POST Add Option
│   ├── GET List Options
│   ├── GET Get Option
│   ├── PATCH Update Option
│   ├── DELETE Delete Option
│   ├── POST Reorder Options
│   ├── POST Toggle Option
│   └── POST Validate Action
│
├── 📁 04. Conditions
│   ├── POST Add Condition (Time)
│   ├── POST Add Condition (Caller ID)
│   ├── POST Add Condition (DID)
│   ├── GET List Conditions
│   ├── GET Get Condition
│   ├── PATCH Update Condition
│   ├── DELETE Delete Condition
│   └── POST Toggle Condition
│
├── 📁 05. DID Mappings
│   ├── POST Create Mapping
│   ├── GET List Mappings
│   ├── GET Find by DID
│   ├── PATCH Update Mapping
│   └── DELETE Delete Mapping
│
└── 📁 06. Audio Files
    ├── POST Upload Audio
    ├── GET List Audio Files
    ├── GET Get Audio File
    ├── GET Download Audio
    ├── DELETE Delete Audio
    ├── POST Convert Audio
    └── POST Generate TTS
```

### Variables d'Environnement:

```json
{
  "asterisk_base_url": "http://localhost:3001/api/v1",
  "token": "",
  "tenant_id": "1",
  "menu_id": "",
  "option_id": "",
  "condition_id": "",
  "did_mapping_id": "",
  "audio_id": ""
}
```

---

## ✅ Checklist de Test

### Test Basique:
- [ ] Créer un menu
- [ ] Ajouter 3 options DTMF
- [ ] Mapper un DID au menu
- [ ] Tester la configuration
- [ ] Valider la configuration

### Test Avancé:
- [ ] Créer un menu avec conditions horaires
- [ ] Créer des sous-menus
- [ ] Upload fichiers audio
- [ ] Générer prompts TTS
- [ ] Dupliquer un menu
- [ ] Export/Import configuration

### Test Production:
- [ ] Vérifier isolation multi-tenant
- [ ] Tester tous les types d'actions
- [ ] Tester les timeouts et retries
- [ ] Tester les choix invalides
- [ ] Vérifier les logs Asterisk

---

**Version:** 1.0
**Date:** 2025-11-04
**Auteur:** Claude Code
**API Base URL:** `http://localhost:3001/api/v1`
