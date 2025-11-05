# Collection CURL Complète - API Asterisk NestJS

## 📋 Table des Matières
1. [Configuration Postman](#configuration-postman)
2. [Module: Channels](#module-channels) - 10 endpoints
3. [Module: CDR](#module-cdr) - 4 endpoints
4. [Module: Statistics](#module-statistics) - 10 endpoints
5. [Module: Queue-Members](#module-queue-members) - 7 endpoints
6. [Module: Recordings](#module-recordings) - 8 endpoints
7. [Module: Monitoring](#module-monitoring) - 2 endpoints
8. [Module: Asterisk](#module-asterisk) - 13 endpoints
9. [Module: Endpoints Advanced](#module-endpoints-advanced) - 3 endpoints
10. [Module: Metadata](#module-metadata) - 5 endpoints
11. [Module: App](#module-app) - 1 endpoint

**Total : 63 endpoints documentés**

---

## ⚙️ Configuration Postman

### Variables d'Environnement

Créez un environnement Postman avec ces variables :

```json
{
  "asterisk_base_url": "http://localhost:3001/api/v1",
  "token": "votre_jwt_token_ici",
  "tenant_id": "1"
}
```

### Obtenir un Token

```bash
curl -X POST "{{asterisk_base_url}}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@asterisk.local",
    "password": "Admin123!"
  }'
```

---

## 📞 Module: Channels

Gestion des canaux actifs en temps réel (appels en cours).

### 1. Liste des Canaux Actifs

**GET** `{{asterisk_base_url}}/channels`

```bash
curl -X GET "http://localhost:3001/api/v1/channels" \
  -H "Authorization: Bearer {{token}}"
```

**Avec filtres:**
```bash
curl -X GET "http://localhost:3001/api/v1/channels?state=Up&direction=inbound" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1730736851.1",
      "name": "PJSIP/t1_101-00000001",
      "state": "Up",
      "caller": {
        "number": "+33612345678",
        "name": "John Doe"
      },
      "connected": {
        "number": "101",
        "name": "Agent 101"
      },
      "creationTime": "2025-11-04T18:00:00.000Z",
      "duration": 120
    }
  ],
  "timestamp": "2025-11-04T18:02:00.000Z"
}
```

---

### 2. Détails d'un Canal

**GET** `{{asterisk_base_url}}/channels/:channelId`

```bash
curl -X GET "http://localhost:3001/api/v1/channels/1730736851.1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": "1730736851.1",
    "name": "PJSIP/t1_101-00000001",
    "state": "Up",
    "caller": {
      "number": "+33612345678",
      "name": "John Doe"
    },
    "connected": {
      "number": "101",
      "name": "Agent 101"
    },
    "accountcode": "t1",
    "context": "t1_team_developer",
    "extension": "101",
    "priority": "1",
    "creationTime": "2025-11-04T18:00:00.000Z",
    "duration": 120,
    "variables": {}
  },
  "timestamp": "2025-11-04T18:02:00.000Z"
}
```

---

### 3. Originer un Appel

**POST** `{{asterisk_base_url}}/channels/originate`

```bash
curl -X POST "http://localhost:3001/api/v1/channels/originate" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "PJSIP/t1_101",
    "extension": "102",
    "context": "t1_team_developer",
    "callerId": "Support <100>"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "channelId": "1730737000.2",
    "state": "Ringing"
  },
  "timestamp": "2025-11-04T18:05:00.000Z"
}
```

---

### 4. Répondre à un Canal

**PATCH** `{{asterisk_base_url}}/channels/:channelId/answer`

```bash
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/answer" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel answered successfully",
  "timestamp": "2025-11-04T18:06:00.000Z"
}
```

---

### 5. Raccrocher un Canal

**DELETE** `{{asterisk_base_url}}/channels/:channelId`

```bash
curl -X DELETE "http://localhost:3001/api/v1/channels/1730736851.1" \
  -H "Authorization: Bearer {{token}}"
```

**Avec raison:**
```bash
curl -X DELETE "http://localhost:3001/api/v1/channels/1730736851.1?reason=busy" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel hung up successfully",
  "timestamp": "2025-11-04T18:07:00.000Z"
}
```

---

### 6. Mettre en Attente

**PATCH** `{{asterisk_base_url}}/channels/:channelId/hold`

```bash
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/hold" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel put on hold",
  "timestamp": "2025-11-04T18:08:00.000Z"
}
```

---

### 7. Reprendre de l'Attente

**PATCH** `{{asterisk_base_url}}/channels/:channelId/unhold`

```bash
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/unhold" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel unheld",
  "timestamp": "2025-11-04T18:09:00.000Z"
}
```

---

### 8. Mute un Canal

**PATCH** `{{asterisk_base_url}}/channels/:channelId/mute`

```bash
# Mute audio entrant
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/mute?direction=in" \
  -H "Authorization: Bearer {{token}}"

# Mute audio sortant
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/mute?direction=out" \
  -H "Authorization: Bearer {{token}}"

# Mute les deux directions
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/mute?direction=both" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel muted (direction: in)",
  "timestamp": "2025-11-04T18:10:00.000Z"
}
```

---

### 9. Unmute un Canal

**PATCH** `{{asterisk_base_url}}/channels/:channelId/unmute`

```bash
curl -X PATCH "http://localhost:3001/api/v1/channels/1730736851.1/unmute?direction=both" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Channel unmuted (direction: both)",
  "timestamp": "2025-11-04T18:11:00.000Z"
}
```

---

### 10. Enregistrer un Canal (Bonus)

**Note:** Voir le module Recordings pour démarrer un enregistrement.

---

## 📊 Module: CDR

Call Detail Records - Historique complet des appels.

### 1. Liste des CDR avec Filtres

**GET** `{{asterisk_base_url}}/cdr`

```bash
# CDR de base
curl -X GET "http://localhost:3001/api/v1/cdr" \
  -H "Authorization: Bearer {{token}}"

# Avec filtres
curl -X GET "http://localhost:3001/api/v1/cdr?startDate=2025-11-01&endDate=2025-11-04&disposition=ANSWERED&direction=inbound&page=1&limit=20" \
  -H "Authorization: Bearer {{token}}"

# Filtrer par tenant
curl -X GET "http://localhost:3001/api/v1/cdr?tenantId=1&startDate=2025-11-01" \
  -H "Authorization: Bearer {{token}}"
```

**Query Params:**
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)
- `disposition` (ANSWERED, NO ANSWER, BUSY, FAILED)
- `direction` (inbound, outbound, internal)
- `tenantId`
- `src` (numéro source)
- `dst` (numéro destination)
- `page` (défaut: 1)
- `limit` (défaut: 20, max: 100)

**Réponse:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "calldate": "2025-11-04T18:00:00.000Z",
        "clid": "John Doe <+33612345678>",
        "src": "+33612345678",
        "dst": "101",
        "dcontext": "t1_team_developer",
        "channel": "PJSIP/trunk-00000001",
        "dstchannel": "PJSIP/t1_101-00000002",
        "lastapp": "Dial",
        "lastdata": "PJSIP/t1_101,30,tT",
        "duration": 125,
        "billsec": 120,
        "disposition": "ANSWERED",
        "amaflags": "DOCUMENTATION",
        "accountcode": "t1",
        "uniqueid": "1730736851.1",
        "userfield": "",
        "tenantId": 1
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  },
  "timestamp": "2025-11-04T18:15:00.000Z"
}
```

---

### 2. Statistiques CDR

**GET** `{{asterisk_base_url}}/cdr/stats`

```bash
curl -X GET "http://localhost:3001/api/v1/cdr/stats?startDate=2025-11-01&endDate=2025-11-04" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1250,
    "answeredCalls": 980,
    "missedCalls": 200,
    "busyCalls": 50,
    "failedCalls": 20,
    "totalDuration": 145800,
    "totalBillsec": 142000,
    "avgDuration": 116.64,
    "avgBillsec": 144.9,
    "answerRate": 78.4,
    "byDisposition": {
      "ANSWERED": 980,
      "NO ANSWER": 200,
      "BUSY": 50,
      "FAILED": 20
    },
    "byDirection": {
      "inbound": 650,
      "outbound": 500,
      "internal": 100
    },
    "peakHour": {
      "hour": 14,
      "calls": 125
    }
  },
  "timestamp": "2025-11-04T18:20:00.000Z"
}
```

---

### 3. Export CDR en CSV

**GET** `{{asterisk_base_url}}/cdr/export/csv`

```bash
curl -X GET "http://localhost:3001/api/v1/cdr/export/csv?startDate=2025-11-01&endDate=2025-11-04" \
  -H "Authorization: Bearer {{token}}" \
  --output cdr-export.csv
```

**Réponse:** Fichier CSV téléchargé

**Colonnes CSV:**
```
calldate,clid,src,dst,dcontext,duration,billsec,disposition,accountcode
```

---

### 4. Récupérer un CDR par ID

**GET** `{{asterisk_base_url}}/cdr/:id`

```bash
curl -X GET "http://localhost:3001/api/v1/cdr/1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "calldate": "2025-11-04T18:00:00.000Z",
    "clid": "John Doe <+33612345678>",
    "src": "+33612345678",
    "dst": "101",
    "dcontext": "t1_team_developer",
    "channel": "PJSIP/trunk-00000001",
    "dstchannel": "PJSIP/t1_101-00000002",
    "lastapp": "Dial",
    "lastdata": "PJSIP/t1_101,30,tT",
    "duration": 125,
    "billsec": 120,
    "disposition": "ANSWERED",
    "amaflags": "DOCUMENTATION",
    "accountcode": "t1",
    "uniqueid": "1730736851.1",
    "userfield": "",
    "tenantId": 1,
    "recording": null
  },
  "timestamp": "2025-11-04T18:25:00.000Z"
}
```

---

## 📈 Module: Statistics

Statistiques et tableaux de bord.

### 1. Dashboard Complet

**GET** `{{asterisk_base_url}}/statistics/dashboard`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/dashboard?tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "calls": {
      "total": 1250,
      "answered": 980,
      "missed": 200,
      "avgDuration": 116
    },
    "queues": {
      "total": 5,
      "callsWaiting": 3,
      "membersAvailable": 12,
      "membersTotal": 20
    },
    "endpoints": {
      "total": 50,
      "registered": 42,
      "inCall": 8
    },
    "recordings": {
      "total": 350,
      "totalSize": 5242880000
    },
    "activeChannels": 8
  },
  "timestamp": "2025-11-04T18:30:00.000Z"
}
```

---

### 2. Résumé Rapide (7 derniers jours)

**GET** `{{asterisk_base_url}}/statistics/summary`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/summary?tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "period": "Last 7 days",
    "totalCalls": 875,
    "answeredCalls": 690,
    "missedCalls": 150,
    "avgCallDuration": 118,
    "totalCallDuration": 81850,
    "peakDay": "2025-11-02",
    "peakDayCalls": 145
  },
  "timestamp": "2025-11-04T18:35:00.000Z"
}
```

---

### 3. Statistiques d'Appels Détaillées

**GET** `{{asterisk_base_url}}/statistics/calls`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/calls?startDate=2025-11-01&endDate=2025-11-04&tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1250,
    "inbound": 650,
    "outbound": 500,
    "internal": 100,
    "answered": 980,
    "missed": 200,
    "busy": 50,
    "failed": 20,
    "avgDuration": 116,
    "totalDuration": 145000,
    "byHour": [
      { "hour": 0, "calls": 5 },
      { "hour": 1, "calls": 2 },
      { "hour": 8, "calls": 45 },
      { "hour": 9, "calls": 85 },
      { "hour": 10, "calls": 120 }
    ]
  },
  "timestamp": "2025-11-04T18:40:00.000Z"
}
```

---

### 4. Statistiques des Files d'Attente

**GET** `{{asterisk_base_url}}/statistics/queues`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/queues?startDate=2025-11-01&endDate=2025-11-04&tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "queue": "t1_support",
      "callsEntered": 450,
      "callsAnswered": 420,
      "callsAbandoned": 30,
      "avgHoldTime": 35,
      "avgTalkTime": 125,
      "serviceLevelPerf": 92.5
    },
    {
      "queue": "t1_sales",
      "callsEntered": 200,
      "callsAnswered": 195,
      "callsAbandoned": 5,
      "avgHoldTime": 15,
      "avgTalkTime": 180,
      "serviceLevelPerf": 97.5
    }
  ],
  "timestamp": "2025-11-04T18:45:00.000Z"
}
```

---

### 5. Statistiques des Endpoints

**GET** `{{asterisk_base_url}}/statistics/endpoints`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/endpoints?tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "registered": 42,
    "unregistered": 8,
    "inCall": 8,
    "available": 34,
    "byStatus": {
      "Available": 34,
      "In Use": 8,
      "Unavailable": 8
    }
  },
  "timestamp": "2025-11-04T18:50:00.000Z"
}
```

---

### 6. Statistiques des Enregistrements

**GET** `{{asterisk_base_url}}/statistics/recordings`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/recordings?startDate=2025-11-01&endDate=2025-11-04&tenantId=1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "totalRecordings": 350,
    "totalSize": 5242880000,
    "totalDuration": 42000,
    "avgDuration": 120,
    "byFormat": {
      "wav": 200,
      "gsm": 100,
      "mp3": 50
    }
  },
  "timestamp": "2025-11-04T18:55:00.000Z"
}
```

---

### 7. Top Appelants

**GET** `{{asterisk_base_url}}/statistics/top-callers`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/top-callers?startDate=2025-11-01&endDate=2025-11-04&limit=10" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "callerNumber": "+33612345678",
      "callerName": "John Doe",
      "totalCalls": 45,
      "totalDuration": 3600,
      "avgDuration": 80
    },
    {
      "callerNumber": "+33687654321",
      "callerName": "Jane Smith",
      "totalCalls": 38,
      "totalDuration": 2850,
      "avgDuration": 75
    }
  ],
  "timestamp": "2025-11-04T19:00:00.000Z"
}
```

---

### 8. Top Numéros Appelés

**GET** `{{asterisk_base_url}}/statistics/top-called`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/top-called?startDate=2025-11-01&endDate=2025-11-04&limit=10" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "number": "101",
      "name": "Agent 101",
      "totalCalls": 125,
      "totalDuration": 15000,
      "avgDuration": 120
    },
    {
      "number": "102",
      "name": "Agent 102",
      "totalCalls": 98,
      "totalDuration": 11760,
      "avgDuration": 120
    }
  ],
  "timestamp": "2025-11-04T19:05:00.000Z"
}
```

---

### 9. Canaux Actifs (Temps Réel)

**GET** `{{asterisk_base_url}}/statistics/active-channels`

```bash
curl -X GET "http://localhost:3001/api/v1/statistics/active-channels" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "totalActiveChannels": 8,
    "channels": [
      {
        "id": "1730736851.1",
        "name": "PJSIP/t1_101-00000001",
        "state": "Up",
        "duration": 120
      }
    ]
  },
  "timestamp": "2025-11-04T19:10:00.000Z"
}
```

---

### 10. Tendances d'Appels

**GET** `{{asterisk_base_url}}/statistics/trend`

```bash
# Par jour
curl -X GET "http://localhost:3001/api/v1/statistics/trend?startDate=2025-11-01&endDate=2025-11-04&groupBy=day" \
  -H "Authorization: Bearer {{token}}"

# Par heure
curl -X GET "http://localhost:3001/api/v1/statistics/trend?startDate=2025-11-04&groupBy=hour" \
  -H "Authorization: Bearer {{token}}"

# Par semaine
curl -X GET "http://localhost:3001/api/v1/statistics/trend?startDate=2025-10-01&endDate=2025-11-04&groupBy=week" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "groupBy": "day",
    "trend": [
      {
        "period": "2025-11-01",
        "totalCalls": 320,
        "answered": 250,
        "missed": 60,
        "avgDuration": 115
      },
      {
        "period": "2025-11-02",
        "totalCalls": 350,
        "answered": 280,
        "missed": 65,
        "avgDuration": 118
      }
    ]
  },
  "timestamp": "2025-11-04T19:15:00.000Z"
}
```

---

## 👥 Module: Queue-Members

Gestion avancée des membres des files d'attente.

### 1. Ajouter un Membre

**POST** `{{asterisk_base_url}}/queues/:queueName/members`

```bash
curl -X POST "http://localhost:3001/api/v1/queues/t1_support/members" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "memberName": "Agent 101",
    "interface": "PJSIP/t1_101",
    "penalty": 0
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "queue": "t1_support",
    "memberName": "Agent 101",
    "interface": "PJSIP/t1_101",
    "penalty": 0,
    "paused": false
  },
  "timestamp": "2025-11-04T19:20:00.000Z"
}
```

---

### 2. Liste des Membres

**GET** `{{asterisk_base_url}}/queues/:queueName/members`

```bash
curl -X GET "http://localhost:3001/api/v1/queues/t1_support/members" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Agent 101",
      "interface": "PJSIP/t1_101",
      "penalty": 0,
      "paused": false,
      "callsTaken": 45,
      "lastCall": 300,
      "inCall": false,
      "status": "Available"
    },
    {
      "name": "Agent 102",
      "interface": "PJSIP/t1_102",
      "penalty": 0,
      "paused": true,
      "pausedReason": "Break",
      "callsTaken": 38,
      "lastCall": 150,
      "inCall": false,
      "status": "Paused"
    }
  ],
  "timestamp": "2025-11-04T19:25:00.000Z"
}
```

---

### 3. Membres Enrichis (avec données AMI)

**GET** `{{asterisk_base_url}}/queues/:queueName/members/enriched`

```bash
curl -X GET "http://localhost:3001/api/v1/queues/t1_support/members/enriched" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Agent 101",
      "interface": "PJSIP/t1_101",
      "penalty": 0,
      "paused": false,
      "callsTaken": 45,
      "lastCall": 300,
      "inCall": false,
      "status": "Available",
      "endpoint": {
        "username": "t1_101",
        "callerid": "John Doe <101>",
        "deviceState": "NOT_INUSE",
        "registered": true,
        "contact": "sip:101@192.168.1.100:5060"
      }
    }
  ],
  "timestamp": "2025-11-04T19:30:00.000Z"
}
```

---

### 4. Mettre en Pause un Membre

**PATCH** `{{asterisk_base_url}}/queues/:queueName/members/:memberName/pause`

```bash
curl -X PATCH "http://localhost:3001/api/v1/queues/t1_support/members/PJSIP%2Ft1_101/pause" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Member paused successfully",
  "data": {
    "queue": "t1_support",
    "member": "PJSIP/t1_101",
    "paused": true
  },
  "timestamp": "2025-11-04T19:35:00.000Z"
}
```

---

### 5. Reprendre un Membre (Unpause)

**PATCH** `{{asterisk_base_url}}/queues/:queueName/members/:memberName/unpause`

```bash
curl -X PATCH "http://localhost:3001/api/v1/queues/t1_support/members/PJSIP%2Ft1_101/unpause" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Member unpaused successfully",
  "data": {
    "queue": "t1_support",
    "member": "PJSIP/t1_101",
    "paused": false
  },
  "timestamp": "2025-11-04T19:40:00.000Z"
}
```

---

### 6. Mettre à Jour la Pénalité

**PATCH** `{{asterisk_base_url}}/queues/:queueName/members/:memberName`

```bash
curl -X PATCH "http://localhost:3001/api/v1/queues/t1_support/members/PJSIP%2Ft1_101" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "penalty": 5
  }'
```

**Réponse:**
```json
{
  "success": true,
  "message": "Member updated successfully",
  "data": {
    "queue": "t1_support",
    "member": "PJSIP/t1_101",
    "penalty": 5
  },
  "timestamp": "2025-11-04T19:45:00.000Z"
}
```

---

### 7. Retirer un Membre

**DELETE** `{{asterisk_base_url}}/queues/:queueName/members/:memberName`

```bash
curl -X DELETE "http://localhost:3001/api/v1/queues/t1_support/members/PJSIP%2Ft1_101" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Member removed successfully",
  "timestamp": "2025-11-04T19:50:00.000Z"
}
```

---

## 🎙️ Module: Recordings

Gestion des enregistrements d'appels.

### 1. Démarrer un Enregistrement

**POST** `{{asterisk_base_url}}/recordings/start`

```bash
curl -X POST "http://localhost:3001/api/v1/recordings/start" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "1730736851.1",
    "name": "recording-2025-11-04-18-00",
    "format": "wav"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "recordingName": "recording-2025-11-04-18-00",
    "channelId": "1730736851.1",
    "format": "wav",
    "state": "recording"
  },
  "timestamp": "2025-11-04T19:55:00.000Z"
}
```

---

### 2. Arrêter un Enregistrement

**POST** `{{asterisk_base_url}}/recordings/stop/:recordingName`

```bash
curl -X POST "http://localhost:3001/api/v1/recordings/stop/recording-2025-11-04-18-00" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Recording stopped successfully",
  "data": {
    "recordingName": "recording-2025-11-04-18-00",
    "duration": 125,
    "filesize": 2048000
  },
  "timestamp": "2025-11-04T20:00:00.000Z"
}
```

---

### 3. Liste des Enregistrements

**GET** `{{asterisk_base_url}}/recordings`

```bash
# Liste de base
curl -X GET "http://localhost:3001/api/v1/recordings" \
  -H "Authorization: Bearer {{token}}"

# Avec filtres
curl -X GET "http://localhost:3001/api/v1/recordings?startDate=2025-11-01&endDate=2025-11-04&format=wav&page=1&limit=20" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "name": "recording-2025-11-04-18-00",
        "channelId": "1730736851.1",
        "format": "wav",
        "duration": 125,
        "filesize": 2048000,
        "filepath": "/var/spool/asterisk/monitor/recording-2025-11-04-18-00.wav",
        "createdAt": "2025-11-04T18:00:00.000Z",
        "tenantId": 1
      }
    ],
    "total": 350,
    "page": 1,
    "limit": 20
  },
  "timestamp": "2025-11-04T20:05:00.000Z"
}
```

---

### 4. Détails d'un Enregistrement

**GET** `{{asterisk_base_url}}/recordings/:id`

```bash
curl -X GET "http://localhost:3001/api/v1/recordings/1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "recording-2025-11-04-18-00",
    "channelId": "1730736851.1",
    "format": "wav",
    "duration": 125,
    "filesize": 2048000,
    "filepath": "/var/spool/asterisk/monitor/recording-2025-11-04-18-00.wav",
    "createdAt": "2025-11-04T18:00:00.000Z",
    "tenantId": 1,
    "metadata": {
      "caller": "+33612345678",
      "called": "101",
      "queue": "t1_support"
    }
  },
  "timestamp": "2025-11-04T20:10:00.000Z"
}
```

---

### 5. Télécharger un Enregistrement

**GET** `{{asterisk_base_url}}/recordings/:id/download`

```bash
curl -X GET "http://localhost:3001/api/v1/recordings/1/download" \
  -H "Authorization: Bearer {{token}}" \
  --output recording.wav
```

**Réponse:** Fichier audio téléchargé

---

### 6. Streamer un Enregistrement

**GET** `{{asterisk_base_url}}/recordings/:id/stream`

```bash
curl -X GET "http://localhost:3001/api/v1/recordings/1/stream" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:** Stream audio (Content-Type: audio/wav)

---

### 7. Suppression Soft (Marquer comme supprimé)

**DELETE** `{{asterisk_base_url}}/recordings/:id`

```bash
curl -X DELETE "http://localhost:3001/api/v1/recordings/1" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Recording soft deleted",
  "timestamp": "2025-11-04T20:15:00.000Z"
}
```

---

### 8. Suppression Permanente (Supprimer fichier)

**DELETE** `{{asterisk_base_url}}/recordings/:id/permanent`

```bash
curl -X DELETE "http://localhost:3001/api/v1/recordings/1/permanent" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Recording permanently deleted",
  "timestamp": "2025-11-04T20:20:00.000Z"
}
```

---

## 📊 Module: Monitoring

Dashboard de surveillance générale.

### 1. Dashboard Complet

**GET** `{{asterisk_base_url}}/monitoring/dashboard`

```bash
curl -X GET "http://localhost:3001/api/v1/monitoring/dashboard" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "system": {
      "asteriskVersion": "22.6.0",
      "uptime": 864000,
      "activeChannels": 8,
      "activeCalls": 4
    },
    "queues": {
      "total": 5,
      "callsWaiting": 3,
      "membersTotal": 20,
      "membersAvailable": 12,
      "membersInCall": 5,
      "membersPaused": 3
    },
    "endpoints": {
      "total": 50,
      "registered": 42,
      "unregistered": 8,
      "inCall": 8
    },
    "calls": {
      "today": 125,
      "thisHour": 15,
      "avgDuration": 118
    },
    "resources": {
      "cpu": 25.5,
      "memory": 512000000,
      "disk": 85000000000
    }
  },
  "timestamp": "2025-11-04T20:25:00.000Z"
}
```

---

### 2. Événements Récents

**GET** `{{asterisk_base_url}}/monitoring/events`

```bash
# 50 derniers événements (défaut)
curl -X GET "http://localhost:3001/api/v1/monitoring/events" \
  -H "Authorization: Bearer {{token}}"

# 100 derniers événements
curl -X GET "http://localhost:3001/api/v1/monitoring/events?limit=100" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "call_started",
      "timestamp": "2025-11-04T20:20:00.000Z",
      "data": {
        "channelId": "1730736851.1",
        "caller": "+33612345678",
        "called": "101"
      }
    },
    {
      "id": 2,
      "type": "member_paused",
      "timestamp": "2025-11-04T20:15:00.000Z",
      "data": {
        "queue": "t1_support",
        "member": "PJSIP/t1_102",
        "reason": "Break"
      }
    },
    {
      "id": 3,
      "type": "endpoint_registered",
      "timestamp": "2025-11-04T20:10:00.000Z",
      "data": {
        "endpoint": "t1_103",
        "contact": "sip:103@192.168.1.103:5060"
      }
    }
  ],
  "timestamp": "2025-11-04T20:30:00.000Z"
}
```

---

## ⚙️ Module: Asterisk

Contrôle et administration du serveur Asterisk.

### 1. Statut Serveur Asterisk

**GET** `{{asterisk_base_url}}/asterisk/status`

```bash
curl -X GET "http://localhost:3001/api/v1/asterisk/status" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "version": "Asterisk 22.6.0",
    "uptime": "10 days, 5 hours, 23 minutes",
    "reloadTime": "2025-10-25T12:00:00.000Z",
    "activeCalls": 8,
    "activeChannels": 8,
    "callsProcessed": 15234,
    "ami": {
      "connected": true,
      "sessions": 1
    },
    "ari": {
      "connected": true,
      "applications": ["ivr-app"]
    }
  },
  "timestamp": "2025-11-04T20:35:00.000Z"
}
```

---

### 2. Uptime Système

**GET** `{{asterisk_base_url}}/asterisk/uptime`

```bash
curl -X GET "http://localhost:3001/api/v1/asterisk/uptime" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "systemUptime": "10 days, 5 hours, 23 minutes, 45 seconds",
    "systemUptimeSeconds": 864225,
    "lastReload": "2025-10-25T12:00:00.000Z"
  },
  "timestamp": "2025-11-04T20:40:00.000Z"
}
```

---

### 3. Statistiques Globales

**GET** `{{asterisk_base_url}}/asterisk/stats`

```bash
curl -X GET "http://localhost:3001/api/v1/asterisk/stats" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "calls": {
      "active": 8,
      "processed": 15234
    },
    "channels": {
      "active": 8,
      "total": 8
    },
    "endpoints": {
      "total": 50,
      "registered": 42
    },
    "queues": {
      "total": 5
    },
    "threads": 45,
    "fileDescriptors": 125
  },
  "timestamp": "2025-11-04T20:45:00.000Z"
}
```

---

### 4. Transfert Aveugle

**POST** `{{asterisk_base_url}}/asterisk/transfer/blind`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/transfer/blind" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PJSIP/t1_101-00000001",
    "extension": "102",
    "context": "t1_team_developer"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "message": "Blind transfer initiated",
  "timestamp": "2025-11-04T20:50:00.000Z"
}
```

---

### 5. Extensions Disponibles

**GET** `{{asterisk_base_url}}/asterisk/extensions/available`

```bash
curl -X GET "http://localhost:3001/api/v1/asterisk/extensions/available?context=t1_team_developer" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "extension": "101",
      "name": "Agent 101",
      "status": "Available"
    },
    {
      "extension": "102",
      "name": "Agent 102",
      "status": "Available"
    },
    {
      "extension": "103",
      "name": "Agent 103",
      "status": "Available"
    }
  ],
  "timestamp": "2025-11-04T20:55:00.000Z"
}
```

---

### 6. Recharger Toutes les Configurations

**POST** `{{asterisk_base_url}}/asterisk/reload`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/reload" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Asterisk configuration reloaded",
  "timestamp": "2025-11-04T21:00:00.000Z"
}
```

---

### 7. Recharger PJSIP

**POST** `{{asterisk_base_url}}/asterisk/reload/pjsip`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/reload/pjsip" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "PJSIP module reloaded",
  "timestamp": "2025-11-04T21:05:00.000Z"
}
```

---

### 8. Recharger Dialplan

**POST** `{{asterisk_base_url}}/asterisk/reload/dialplan`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/reload/dialplan" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Dialplan reloaded",
  "timestamp": "2025-11-04T21:10:00.000Z"
}
```

---

### 9. Recharger Module Spécifique

**POST** `{{asterisk_base_url}}/asterisk/reload/:module`

```bash
# Recharger app_queue
curl -X POST "http://localhost:3001/api/v1/asterisk/reload/app_queue.so" \
  -H "Authorization: Bearer {{token}}"

# Recharger res_ari
curl -X POST "http://localhost:3001/api/v1/asterisk/reload/res_ari.so" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Module app_queue.so reloaded",
  "timestamp": "2025-11-04T21:15:00.000Z"
}
```

---

### 10. Liste des Modules Chargés

**GET** `{{asterisk_base_url}}/asterisk/modules`

```bash
curl -X GET "http://localhost:3001/api/v1/asterisk/modules" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "name": "app_queue.so",
      "description": "True Call Queueing",
      "useCount": 0,
      "status": "Running"
    },
    {
      "name": "res_ari.so",
      "description": "Asterisk RESTful Interface",
      "useCount": 11,
      "status": "Running"
    },
    {
      "name": "chan_pjsip.so",
      "description": "PJSIP Channel Driver",
      "useCount": 0,
      "status": "Running"
    }
  ],
  "timestamp": "2025-11-04T21:20:00.000Z"
}
```

---

### 11. Liste des Peers

**GET** `{{asterisk_base_url}}/asterisk/peers`

```bash
# PJSIP peers (défaut)
curl -X GET "http://localhost:3001/api/v1/asterisk/peers" \
  -H "Authorization: Bearer {{token}}"

# Spécifier technologie
curl -X GET "http://localhost:3001/api/v1/asterisk/peers?technology=pjsip" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "name": "t1_101",
      "status": "OK (15 ms)",
      "address": "192.168.1.100:5060",
      "channelsActive": 0
    },
    {
      "name": "t1_102",
      "status": "OK (18 ms)",
      "address": "192.168.1.101:5060",
      "channelsActive": 1
    }
  ],
  "timestamp": "2025-11-04T21:25:00.000Z"
}
```

---

### 12. Envoyer Message SIP

**POST** `{{asterisk_base_url}}/asterisk/message`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/message" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "pjsip:t1_101",
    "from": "pjsip:t1_100",
    "body": "Votre pause est terminée. Merci de reprendre vos appels."
  }'
```

**Réponse:**
```json
{
  "success": true,
  "message": "SIP message sent",
  "timestamp": "2025-11-04T21:30:00.000Z"
}
```

---

### 13. Exécuter Commande CLI

**POST** `{{asterisk_base_url}}/asterisk/command`

```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/command" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "core show version"
  }'
```

**Autre exemple:**
```bash
curl -X POST "http://localhost:3001/api/v1/asterisk/command" \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "queue show t1_support"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "command": "core show version",
    "output": "Asterisk 22.6.0 built by root @ buildkitsandbox on a aarch64 running Linux on 2025-10-22 08:06:23 UTC"
  },
  "timestamp": "2025-11-04T21:35:00.000Z"
}
```

---

## 🔌 Module: Endpoints Advanced

Endpoints supplémentaires avec enrichissement AMI.

### 1. Tous les Endpoints Enrichis

**GET** `{{asterisk_base_url}}/endpoints/enriched/all`

```bash
curl -X GET "http://localhost:3001/api/v1/endpoints/enriched/all" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": "t1_101",
      "displayName": "101",
      "callerid": "John Doe <101>",
      "context": "t1_team_developer",
      "tenantId": 1,
      "ami": {
        "deviceState": "NOT_INUSE",
        "registered": true,
        "contacts": [
          {
            "uri": "sip:101@192.168.1.100:5060",
            "status": "Reachable",
            "roundtripUsec": "15000"
          }
        ]
      }
    },
    {
      "id": "t1_102",
      "displayName": "102",
      "callerid": "Jane Smith <102>",
      "context": "t1_team_developer",
      "tenantId": 1,
      "ami": {
        "deviceState": "INUSE",
        "registered": true,
        "contacts": [
          {
            "uri": "sip:102@192.168.1.101:5060",
            "status": "Reachable",
            "roundtripUsec": "18000"
          }
        ]
      }
    }
  ],
  "timestamp": "2025-11-04T21:40:00.000Z"
}
```

---

### 2. Détails Complets Endpoint (avec AMI)

**GET** `{{asterisk_base_url}}/endpoints/:username/details`

```bash
curl -X GET "http://localhost:3001/api/v1/endpoints/t1_101/details" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "endpoint": {
      "id": "t1_101",
      "displayName": "101",
      "callerid": "John Doe <101>",
      "context": "t1_team_developer",
      "allow": "ulaw,alaw,gsm,g729",
      "transport": "transport-udp",
      "tenantId": 1
    },
    "ami": {
      "deviceState": "NOT_INUSE",
      "registered": true,
      "contacts": [
        {
          "uri": "sip:101@192.168.1.100:5060",
          "status": "Reachable",
          "roundtripUsec": "15000",
          "userAgent": "Zoiper v5.6.3",
          "regExpire": 300,
          "viaAddress": "192.168.1.100:5060"
        }
      ],
      "activeChannels": []
    },
    "statistics": {
      "callsToday": 15,
      "callsThisWeek": 85,
      "avgCallDuration": 120,
      "totalCallDuration": 1800
    }
  },
  "timestamp": "2025-11-04T21:45:00.000Z"
}
```

---

### 3. Forcer Déconnexion Endpoint

**POST** `{{asterisk_base_url}}/endpoints/:username/disconnect`

```bash
curl -X POST "http://localhost:3001/api/v1/endpoints/t1_101/disconnect" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Endpoint disconnected (all active channels hung up)",
  "data": {
    "endpoint": "t1_101",
    "channelsHungUp": 2
  },
  "timestamp": "2025-11-04T21:50:00.000Z"
}
```

---

## 🏷️ Module: Metadata

Enums et métadonnées système (multilingue).

### 1. Liste Résumé des Catégories d'Enums

**GET** `{{asterisk_base_url}}/metadata/enums`

```bash
# En français
curl -X GET "http://localhost:3001/api/v1/metadata/enums?lang=fr" \
  -H "Authorization: Bearer {{token}}"

# En anglais
curl -X GET "http://localhost:3001/api/v1/metadata/enums?lang=en" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "category": "user-roles",
      "label": "Rôles Utilisateurs",
      "itemCount": 5
    },
    {
      "category": "queue-strategies",
      "label": "Stratégies de Files",
      "itemCount": 6
    },
    {
      "category": "channel-states",
      "label": "États des Canaux",
      "itemCount": 8
    }
  ],
  "timestamp": "2025-11-04T21:55:00.000Z"
}
```

---

### 2. Tous les Enums avec Détails

**GET** `{{asterisk_base_url}}/metadata/enums/all`

```bash
curl -X GET "http://localhost:3001/api/v1/metadata/enums/all?lang=fr" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "user-roles": {
      "category": "user-roles",
      "label": "Rôles Utilisateurs",
      "items": [
        {
          "value": "SUPER_ADMIN",
          "label": "Super Administrateur",
          "description": "Accès complet au système"
        },
        {
          "value": "ADMIN",
          "label": "Administrateur",
          "description": "Gestion du tenant"
        },
        {
          "value": "TENANT_ADMIN",
          "label": "Administrateur Tenant",
          "description": "Gestion du tenant uniquement"
        }
      ]
    },
    "queue-strategies": {
      "category": "queue-strategies",
      "label": "Stratégies de Files",
      "items": [
        {
          "value": "ringall",
          "label": "Tous sonnent",
          "description": "Sonne tous les agents disponibles"
        },
        {
          "value": "leastrecent",
          "label": "Moins récent",
          "description": "Appelle l'agent le moins récemment sollicité"
        }
      ]
    }
  },
  "timestamp": "2025-11-04T22:00:00.000Z"
}
```

---

### 3. Récupérer une Catégorie Spécifique

**GET** `{{asterisk_base_url}}/metadata/enums/:category`

```bash
# Stratégies de queues
curl -X GET "http://localhost:3001/api/v1/metadata/enums/queue-strategies?lang=fr" \
  -H "Authorization: Bearer {{token}}"

# États des canaux
curl -X GET "http://localhost:3001/api/v1/metadata/enums/channel-states?lang=en" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "category": "queue-strategies",
    "label": "Stratégies de Files",
    "items": [
      {
        "value": "ringall",
        "label": "Tous sonnent",
        "description": "Sonne tous les agents disponibles simultanément"
      },
      {
        "value": "leastrecent",
        "label": "Moins récent",
        "description": "Appelle l'agent le moins récemment sollicité"
      },
      {
        "value": "fewestcalls",
        "label": "Moins d'appels",
        "description": "Appelle l'agent ayant pris le moins d'appels"
      },
      {
        "value": "random",
        "label": "Aléatoire",
        "description": "Sélection aléatoire d'un agent"
      },
      {
        "value": "rrmemory",
        "label": "Round Robin avec mémoire",
        "description": "Rotation équitable avec mémoire de l'ordre"
      },
      {
        "value": "linear",
        "label": "Linéaire",
        "description": "Appelle dans l'ordre défini"
      }
    ]
  },
  "timestamp": "2025-11-04T22:05:00.000Z"
}
```

---

### 4. Rechercher dans les Enums

**GET** `{{asterisk_base_url}}/metadata/enums/search/:keyword`

```bash
curl -X GET "http://localhost:3001/api/v1/metadata/enums/search/admin?lang=fr" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "keyword": "admin",
    "results": [
      {
        "category": "user-roles",
        "categoryLabel": "Rôles Utilisateurs",
        "matches": [
          {
            "value": "SUPER_ADMIN",
            "label": "Super Administrateur",
            "description": "Accès complet au système"
          },
          {
            "value": "ADMIN",
            "label": "Administrateur",
            "description": "Gestion du tenant"
          },
          {
            "value": "TENANT_ADMIN",
            "label": "Administrateur Tenant",
            "description": "Gestion du tenant uniquement"
          }
        ]
      }
    ],
    "totalMatches": 3
  },
  "timestamp": "2025-11-04T22:10:00.000Z"
}
```

---

### 5. Liste Simple des Catégories

**GET** `{{asterisk_base_url}}/metadata/categories`

```bash
curl -X GET "http://localhost:3001/api/v1/metadata/categories" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    "user-roles",
    "sort-orders",
    "boolean-options",
    "queue-strategies",
    "queue-member-status",
    "paused-status",
    "channel-states",
    "call-directions",
    "mute-directions",
    "device-states",
    "endpoint-device-states",
    "transport-protocols",
    "dtmf-modes",
    "call-dispositions",
    "recording-formats"
  ],
  "timestamp": "2025-11-04T22:15:00.000Z"
}
```

---

## 🏥 Module: App

Healthcheck de l'API.

### 1. Healthcheck / Hello

**GET** `{{asterisk_base_url}}/`

```bash
curl -X GET "http://localhost:3001/api/v1/" \
  -H "Authorization: Bearer {{token}}"
```

**Réponse:**
```json
{
  "success": true,
  "message": "Asterisk NestJS API is running",
  "version": "2.0.0",
  "timestamp": "2025-11-04T22:20:00.000Z"
}
```

---

## 📝 Notes Importantes

### 1. Authentification

Tous les endpoints (sauf `/` et `/auth/login`) nécessitent un token JWT valide dans le header `Authorization: Bearer {{token}}`.

### 2. Tenant Isolation

La plupart des endpoints filtrent automatiquement par `tenantId` extrait du JWT. Les SUPER_ADMIN peuvent accéder à tous les tenants.

### 3. Permissions par Rôle

- **SUPER_ADMIN**: Tous les endpoints
- **ADMIN**: Tous les endpoints de son tenant
- **TENANT_ADMIN**: Gestion de son tenant
- **SUPERVISOR**: Gestion des queues et agents
- **AGENT**: Endpoints limités (pause/unpause, originate)

### 4. Formats de Réponse

Toutes les réponses suivent ce format :
```json
{
  "success": true|false,
  "data": { ... },
  "message": "...",
  "timestamp": "2025-11-04T..."
}
```

### 5. Pagination

Les endpoints avec liste supportent généralement :
- `page` (défaut: 1)
- `limit` (défaut: 20, max: 100)

### 6. Filtres de Date

Format : `YYYY-MM-DD` ou ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

---

## 🎯 Collection Postman Recommandée

### Structure de Folders:

```
📁 Asterisk API
├── 📁 00. Auth
│   └── POST Login
│
├── 📁 01. Channels (Real-time)
│   ├── GET List Channels
│   ├── GET Channel Details
│   ├── POST Originate Call
│   ├── PATCH Answer Channel
│   ├── DELETE Hangup Channel
│   ├── PATCH Hold
│   ├── PATCH Unhold
│   ├── PATCH Mute
│   └── PATCH Unmute
│
├── 📁 02. CDR (Call History)
│   ├── GET List CDR
│   ├── GET CDR Stats
│   ├── GET Export CSV
│   └── GET CDR by ID
│
├── 📁 03. Statistics
│   ├── GET Dashboard
│   ├── GET Summary
│   ├── GET Call Stats
│   ├── GET Queue Stats
│   ├── GET Endpoint Stats
│   ├── GET Recording Stats
│   ├── GET Top Callers
│   ├── GET Top Called
│   ├── GET Active Channels
│   └── GET Trend
│
├── 📁 04. Queue Members
│   ├── POST Add Member
│   ├── GET List Members
│   ├── GET Members Enriched
│   ├── PATCH Pause Member
│   ├── PATCH Unpause Member
│   ├── PATCH Update Penalty
│   └── DELETE Remove Member
│
├── 📁 05. Recordings
│   ├── POST Start Recording
│   ├── POST Stop Recording
│   ├── GET List Recordings
│   ├── GET Recording Details
│   ├── GET Download Recording
│   ├── GET Stream Recording
│   ├── DELETE Soft Delete
│   └── DELETE Permanent Delete
│
├── 📁 06. Monitoring
│   ├── GET Dashboard
│   └── GET Events
│
├── 📁 07. Asterisk Control
│   ├── GET Status
│   ├── GET Uptime
│   ├── GET Stats
│   ├── POST Blind Transfer
│   ├── GET Available Extensions
│   ├── POST Reload All
│   ├── POST Reload PJSIP
│   ├── POST Reload Dialplan
│   ├── POST Reload Module
│   ├── GET Modules
│   ├── GET Peers
│   ├── POST Send Message
│   └── POST Execute Command
│
├── 📁 08. Endpoints Advanced
│   ├── GET All Enriched
│   ├── GET Details
│   └── POST Disconnect
│
├── 📁 09. Metadata
│   ├── GET Enums Summary
│   ├── GET All Enums
│   ├── GET Enum Category
│   ├── GET Search Enums
│   └── GET Categories
│
└── 📁 10. App
    └── GET Healthcheck
```

---

**Version:** 2.0
**Date:** 2025-11-04
**Total Endpoints:** 63
**Base URL:** `http://localhost:3001/api/v1`
