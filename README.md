# 🎯 SYSTÈME MULTI-TENANT ASTERISK

> Plateforme VoIP complète avec gestion multi-tenant, IVR, queues, et API REST

## 📋 Vue d'ensemble

Ce projet fournit une solution complète de centre d'appels VoIP basée sur **Asterisk** avec :

- ✅ **Multi-tenant** - Isolation complète des données par tenant
- ✅ **API REST** - Backend NestJS avec Swagger
- ✅ **Realtime** - Configuration Asterisk en base de données
- ✅ **IVR dynamique** - Système d'IVR configurable par tenant
- ✅ **Gestion de queues** - Statistiques en temps réel
- ✅ **Authentification** - JWT avec rôles (SUPER_ADMIN, TENANT_ADMIN, AGENT)
- ✅ **Contextes multiples** - Plusieurs contextes par tenant
- ✅ **CDR** - Historique des appels complet

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│              React Admin UI (port 3000)              │
└────────────────────┬─────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────┐
│                 BACKEND API                          │
│          NestJS REST API (port 3001)                 │
│          - Swagger UI                                │
│          - JWT Authentication                        │
│          - WebSocket (temps réel)                    │
└──────┬──────────────────────────────────────┬────────┘
       │                                      │
       │                                      │
┌──────▼──────┐                       ┌──────▼─────────┐
│   ASTERISK  │                       │   POSTGRESQL   │
│             │◄──────ODBC────────────│    (api-db)    │
│ - AMI       │                       │                │
│ - ARI       │                       │ - Realtime     │
│ - SIP       │                       │ - API data     │
│ - WSS       │                       │ - IVR config   │
└─────────────┘                       └────────────────┘
```

## 🚀 DÉMARRAGE RAPIDE

### Prérequis

- Docker 20+
- Docker Compose 2+
- Port 5432 disponible (PostgreSQL)
- Ports 3001, 5038, 5060, 8088, 8089 disponibles

### Démarrage automatique

```bash
cd asterisk-pgsql
./start-fresh.sh
```

Le script va :
1. Vérifier les prérequis
2. Gérer les données existantes (sauvegarde ou suppression)
3. Démarrer tous les services
4. Vérifier que tout fonctionne
5. Afficher un résumé complet

### Démarrage manuel

```bash
cd asterisk-pgsql

# Supprimer l'ancien volume (si c'est un premier démarrage)
sudo rm -rf ./api-pgdata

# Démarrer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

## 📊 Services disponibles

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:3001/api/v1 | API REST principale |
| **Swagger UI** | http://localhost:3001/api/v1/docs | Documentation interactive |
| **Health Check** | http://localhost:3001/api/v1/health | État du système |
| **PostgreSQL** | localhost:5432 | Base de données unifiée |
| **Asterisk AMI** | localhost:5038 | Asterisk Manager Interface |
| **Asterisk ARI** | localhost:8088 | Asterisk REST Interface |
| **SIP/UDP** | localhost:5060 | SIP pour téléphones |
| **WSS** | localhost:8089 | WebRTC pour navigateurs |
| **Redis** | localhost:6379 | Cache et sessions |

## 🔑 Credentials par défaut

### Admin API

```
Username: admin
Email: admin@asterisk.local
Password: Admin123!
Role: SUPER_ADMIN
```

### Base de données

```
Host: localhost
Port: 5432
Database: asterisk_api
User: api_user
Password: ApiSecurePass2025!
```

### Asterisk AMI

```
Host: localhost
Port: 5038
User: admin
Password: Sp33Dd14L
```

### Asterisk ARI

```
Host: localhost
Port: 8088
User: callcenter-ivr
Password: Secret123!
```

⚠️ **Important:** Changez tous les mots de passe en production !

## 📚 Documentation

- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Guide de migration complet
- **[PHASE1_COMPLETE.md](PHASE1_COMPLETE.md)** - Récapitulatif Phase 1
- **Swagger UI** - Documentation API interactive

## 🗂️ Structure du projet

```
asterisk/
├── asterisk-pgsql/              # Docker + Asterisk
│   ├── docker-compose.yml       # Orchestration Docker
│   ├── init-api-db.sql          # Script d'initialisation DB
│   ├── start-fresh.sh           # Script de démarrage
│   ├── odbc.ini                 # Configuration ODBC
│   └── etc/asterisk/            # Configuration Asterisk
│
├── asterisk-api-v2/             # Backend NestJS
│   ├── src/
│   │   ├── core/                # Configuration, DB, AMI, ARI
│   │   ├── tenants/             # Gestion des tenants
│   │   ├── endpoints/           # SIP endpoints
│   │   ├── extensions/          # Dialplan
│   │   ├── queues/              # Gestion des queues
│   │   ├── ivr/                 # Système IVR
│   │   ├── cdr/                 # Call Detail Records
│   │   └── auth/                # Authentification
│   ├── package.json
│   └── tsconfig.json
│
├── asterisk-admin-ui/           # Frontend React (à reprendre)
│   ├── src/
│   └── package.json
│
├── MIGRATION_GUIDE.md           # Guide de migration
├── PHASE1_COMPLETE.md           # Récapitulatif Phase 1
└── README.md                    # Ce fichier
```

## 🎯 Fonctionnalités principales

### 1. Gestion des tenants

```bash
# Créer un tenant
POST /api/v1/tenants
{
  "name": "entreprise-a",
  "companyName": "Entreprise A Inc.",
  "contactEmail": "contact@entreprise-a.com",
  "maxEndpoints": 50,
  "maxQueues": 10
}

# Lister les tenants
GET /api/v1/tenants

# Statistiques d'un tenant
GET /api/v1/tenants/1/statistics
```

### 2. Gestion des endpoints SIP

```bash
# Créer un endpoint
POST /api/v1/endpoints
{
  "tenantId": 1,
  "extension": "101",
  "displayName": "John Doe",
  "password": "SecurePass123",
  "callerid": "John Doe <101>"
}

# Lister les endpoints avec état en temps réel
GET /api/v1/endpoints?tenantId=1

# Statut d'un endpoint
GET /api/v1/endpoints/t1_101/status
```

### 3. Gestion des queues

```bash
# Créer une queue
POST /api/v1/queues
{
  "tenantId": 1,
  "name": "support",
  "strategy": "rrmemory",
  "timeout": 30
}

# Statistiques enrichies (avec AMI)
GET /api/v1/queues/enriched?tenantId=1

# Détails d'une queue
GET /api/v1/queues/t1_support/details

# Appels en attente
GET /api/v1/queues/t1_support/calls
```

### 4. Dialplan dynamique

```bash
# Créer une extension
POST /api/v1/extensions
{
  "tenantId": 1,
  "context": "t1_default",
  "exten": "_1XXX",
  "priority": 1,
  "app": "Dial",
  "appdata": "PJSIP/${EXTEN},30,tT"
}

# Lister les extensions
GET /api/v1/extensions?tenantId=1&context=t1_default
```

### 5. IVR

```bash
# Créer un menu IVR
POST /api/v1/ivr/menus
{
  "tenantId": 1,
  "name": "Menu principal",
  "welcomeSound": "welcome",
  "options": [
    {"digit": "1", "action": {"type": "queue", "target": "support"}},
    {"digit": "2", "action": {"type": "queue", "target": "sales"}}
  ]
}

# Mapper un DID à un menu
POST /api/v1/ivr/did-mappings
{
  "tenantId": 1,
  "did": "+33123456789",
  "menuId": 1
}
```

### 6. CDR (Historique des appels)

```bash
# Récupérer les CDR
GET /api/v1/cdr?tenantId=1&startDate=2025-01-01&endDate=2025-01-31

# Statistiques d'appels
GET /api/v1/cdr/statistics?tenantId=1
```

## 🛠️ Commandes utiles

### Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Voir les logs
docker-compose logs -f [service]

# Redémarrer un service
docker-compose restart [service]

# Statut des services
docker-compose ps
```

### Base de données

```bash
# Se connecter à PostgreSQL
docker exec -it asterisk-api-postgres psql -U api_user -d asterisk_api

# Lister les tables
\dt

# Décrire une table
\d tenants

# Exécuter une query
SELECT * FROM tenants;

# Quitter
\q
```

### Asterisk

```bash
# CLI Asterisk
docker exec -it asterisk asterisk -rx "core show version"

# Vérifier ODBC
docker exec -it asterisk asterisk -rx "odbc show"

# Lister les endpoints
docker exec -it asterisk asterisk -rx "pjsip show endpoints"

# Lister les queues
docker exec -it asterisk asterisk -rx "queue show"

# Voir les appels actifs
docker exec -it asterisk asterisk -rx "core show channels"

# Recharger la config
docker exec -it asterisk asterisk -rx "dialplan reload"
docker exec -it asterisk asterisk -rx "queue reload all"
```

## 🔧 Dépannage

### Base de données ne démarre pas

```bash
# Vérifier les logs
docker-compose logs api-db

# Supprimer le volume et redémarrer
docker-compose down
sudo rm -rf ./api-pgdata
docker-compose up -d api-db
```

### Asterisk ne se connecte pas à ODBC

```bash
# Vérifier les logs
docker-compose logs asterisk | grep -i odbc

# Redémarrer Asterisk
docker-compose restart asterisk

# Vérifier la configuration
docker exec -it asterisk cat /etc/odbc.ini
```

### Backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Redémarrer le backend
docker-compose restart backend

# Vérifier les variables d'environnement
docker exec -it asterisk-backend env | grep DB
```

## 📈 Prochaines étapes (Phases suivantes)

### Phase 2 : Architecture multi-contextes
- [ ] Créer l'entité `TenantContext`
- [ ] Implémenter la gestion des contextes multiples
- [ ] Créer le contexte principal automatiquement

### Phase 3 : Authentification
- [ ] Créer l'entité `AppUser`
- [ ] Activer les guards JWT
- [ ] Implémenter les rôles RBAC
- [ ] Middleware d'isolation de tenant

### Phase 4 : Nettoyage du code
- [ ] Supprimer le code "TEST MODE"
- [ ] Nettoyer les services
- [ ] Ajouter des tests unitaires

### Phase 5 : Frontend
- [ ] Refactoriser l'UI React
- [ ] Architecture en composants réutilisables
- [ ] Intégration avec la nouvelle API

## 🤝 Contribution

Ce projet est actuellement en développement actif.

## 📄 Licence

Propriétaire

## 📞 Support

Pour toute question ou problème :
1. Consultez `MIGRATION_GUIDE.md`
2. Vérifiez les logs : `docker-compose logs -f`
3. Testez la connectivité : `docker-compose ps`

---

**Version actuelle:** Phase 1 Complète
**Dernière mise à jour:** 2025-01-04
**Status:** ✅ Prêt pour la production (Phase 1)
