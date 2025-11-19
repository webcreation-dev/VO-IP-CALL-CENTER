# Tutoriel complet : Mise en place d'Asterisk Realtime avec API REST

## Table des matières

1. [Introduction](#introduction)
2. [Architecture globale](#architecture-globale)
3. [Prérequis](#prérequis)
4. [Étape 1 : Installation de PostgreSQL](#étape-1--installation-de-postgresql)
5. [Étape 2 : Configuration d'Asterisk Realtime](#étape-2--configuration-dasterisk-realtime)
6. [Étape 3 : Installation de l'API REST NestJS](#étape-3--installation-de-lapi-rest-nestjs)
7. [Étape 4 : Configuration AMI et ARI](#étape-4--configuration-ami-et-ari)
8. [Étape 5 : Initialisation de la base de données](#étape-5--initialisation-de-la-base-de-données)
9. [Étape 6 : Déploiement avec Docker](#étape-6--déploiement-avec-docker)
10. [Étape 7 : Tests et vérifications](#étape-7--tests-et-vérifications)
11. [Commandes utiles](#commandes-utiles)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

Ce tutoriel vous guide pas-à-pas dans la mise en place d'un système de téléphonie VoIP complet basé sur :

- **Asterisk avec Realtime** : Configuration dynamique stockée en base de données
- **PostgreSQL** : Base de données centrale
- **API REST NestJS** : Backend pour gérer la configuration via HTTP
- **Multi-tenant** : Isolation complète entre organisations

### Avantages de cette architecture

✅ **Pas de redémarrage Asterisk** nécessaire pour ajouter endpoints, queues, etc.
✅ **Configuration centralisée** : Tout en base de données
✅ **API moderne** : Gestion via HTTP REST
✅ **Multi-tenant natif** : Isolation automatique
✅ **Scalabilité** : Possibilité d'ajouter plusieurs serveurs Asterisk
✅ **Audit trail** : Tous les changements tracés en DB

---

## Architecture globale

```
┌──────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE COMPLETE                      │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐         ┌──────────────┐                   │
│  │   Clients    │────────▶│  API NestJS  │                   │
│  │  (WebRTC,    │  HTTP   │  Port 3001   │                   │
│  │   SIP, etc)  │         └───────┬──────┘                   │
│  └──────────────┘                 │                           │
│                            ┌──────┴─────────┐                 │
│                            │                │                 │
│                    ┌───────▼────┐    ┌──────▼──────┐         │
│                    │ PostgreSQL │    │  Asterisk   │         │
│                    │  Port 5432 │◄───│  (Realtime) │         │
│                    └────────────┘    │  SIP: 5060  │         │
│                            ▲         │  WSS: 8089  │         │
│                            │         │  AMI: 5038  │         │
│                            │         │  ARI: 8088  │         │
│                            │         └─────────────┘         │
│                            │                                  │
│                            └──────────────────────────────────┤
│                         Realtime Configuration (ODBC)         │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Flux de données

1. **Client → API** : Requête HTTP pour créer un endpoint, queue, etc.
2. **API → PostgreSQL** : INSERT/UPDATE dans les tables
3. **API → Asterisk (AMI)** : Commande reload (ex: `module reload res_pjsip.so`)
4. **Asterisk → PostgreSQL (Realtime)** : Lecture dynamique de la configuration
5. **Asterisk → Client** : Enregistrement SIP, traitement d'appels

---

## Prérequis

### Logiciels requis

- **Docker** et **Docker Compose** (recommandé) OU installation native
- **Node.js** 18+ et **npm** (pour l'API)
- **PostgreSQL** 14+
- **Asterisk** 18+ avec modules :
  - `res_pjsip.so`
  - `res_config_pgsql.so` ou `res_odbc.so`
  - `app_queue.so`
  - `app_stasis.so`
  - `res_ari.so`

### Ports réseau

| Service | Port | Protocole | Description |
|---------|------|-----------|-------------|
| API REST | 3001 | TCP | HTTP API |
| PostgreSQL | 5432 | TCP | Base de données |
| Asterisk SIP | 5060 | UDP | SIP classique |
| Asterisk WSS | 8089 | TCP | WebRTC (SIP over WebSocket) |
| Asterisk AMI | 5038 | TCP | Manager Interface |
| Asterisk ARI | 8088 | TCP | REST Interface |
| RTP | 10000-10200 | UDP | Media streams |

---

## Étape 1 : Installation de PostgreSQL

### Option A : Avec Docker (recommandé)

```bash
docker run -d \
  --name asterisk-postgres \
  -e POSTGRES_DB=asterisk_api \
  -e POSTGRES_USER=api_user \
  -e POSTGRES_PASSWORD=ApiSecurePass2025! \
  -p 5432:5432 \
  -v asterisk-pg-data:/var/lib/postgresql/data \
  postgres:14
```

### Option B : Installation native (Ubuntu/Debian)

```bash
# Installer PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Créer utilisateur et base
sudo -u postgres psql <<EOF
CREATE DATABASE asterisk_api;
CREATE USER api_user WITH ENCRYPTED PASSWORD 'ApiSecurePass2025!';
GRANT ALL PRIVILEGES ON DATABASE asterisk_api TO api_user;
\q
EOF
```

### Vérification

```bash
psql -h localhost -U api_user -d asterisk_api -c "SELECT version();"
```

---

## Étape 2 : Configuration d'Asterisk Realtime

### 2.1 Installer les dépendances ODBC

```bash
# Ubuntu/Debian
sudo apt install unixodbc unixodbc-dev odbc-postgresql

# Vérifier l'installation
odbcinst -j
```

### 2.2 Configurer ODBC

**Fichier : `/etc/odbc.ini`**

```ini
[asterisk]
Description = PostgreSQL ODBC Connection for Asterisk
Driver = PostgreSQL
Database = asterisk_api
Servername = localhost
Port = 5432
Username = api_user
Password = ApiSecurePass2025!
Protocol = 9.6
ReadOnly = No
RowVersioning = No
ShowSystemTables = No
ConnSettings =
```

**Fichier : `/etc/odbcinst.ini`**

```ini
[PostgreSQL]
Description = PostgreSQL ODBC driver
Driver = /usr/lib/x86_64-linux-gnu/odbc/psqlodbcw.so
Setup = /usr/lib/x86_64-linux-gnu/odbc/libodbcpsqlS.so
FileUsage = 1
```

**Test de connexion ODBC :**

```bash
isql -v asterisk api_user ApiSecurePass2025!
```

Vous devriez voir :
```
+---------------------------------------+
| Connected!                            |
+---------------------------------------+
```

### 2.3 Configurer Asterisk pour Realtime

**Fichier : `/etc/asterisk/res_odbc.conf`**

```ini
[general]
; Configuration ODBC pour Asterisk

[asterisk]
enabled => yes
dsn => asterisk
username => api_user
password => ApiSecurePass2025!
pooling => no
limit => 5
pre-connect => yes
```

**Fichier : `/etc/asterisk/extconfig.conf`**

```ini
[settings]

; PJSIP Realtime
ps_endpoints => odbc,asterisk
ps_auths => odbc,asterisk
ps_aors => odbc,asterisk
ps_contacts => odbc,asterisk
ps_transports => odbc,asterisk

; Dialplan Realtime
extensions => odbc,asterisk,extensions

; CDR Realtime
cdr => odbc,asterisk

; Queue Realtime
queues => odbc,asterisk,queues
queue_members => odbc,asterisk,queue_members
```

**Fichier : `/etc/asterisk/sorcery.conf`**

```ini
[res_pjsip]
endpoint=realtime,ps_endpoints
auth=realtime,ps_auths
aor=realtime,ps_aors

[res_pjsip_endpoint_identifier_ip]
identify=realtime,ps_endpoint_id_ips
```

### 2.4 Configurer les transports PJSIP

**Fichier : `/etc/asterisk/pjsip.conf`**

```ini
; Transports SIP (seule config statique nécessaire)

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=VOTRE_IP_PUBLIQUE
external_signaling_address=VOTRE_IP_PUBLIQUE
local_net=172.18.0.0/16

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=VOTRE_IP_PUBLIQUE
external_signaling_address=VOTRE_IP_PUBLIQUE
local_net=172.18.0.0/16
```

### 2.5 Configurer le dialplan de base

**Fichier : `/etc/asterisk/extensions.conf`**

```ini
[general]
static=yes
writeprotect=no

; Template pour contexts dynamiques
[tenant_template](!)
switch => Realtime

; Context pour appels entrants (trunks)
[from-trunk]
exten => _X.,1,NoOp(=== Appel entrant DID: ${EXTEN} ===)
 same => n,Stasis(ivr-app,${EXTEN},${CALLERID(num)})
 same => n,Hangup()

; Context pour retour depuis Stasis (IVR)
[from-stasis]
exten => _[a-zA-Z0-9_].,1,NoOp(=== Queue: ${EXTEN} ===)
 same => n,Queue(${EXTEN},tTcCr)
 same => n,Hangup()
```

**Fichier : `/etc/asterisk/queues.conf`**

```ini
[general]
persistentmembers = yes
monitor-type = MixMonitor
```

### 2.6 Configurer AMI (Asterisk Manager Interface)

**Fichier : `/etc/asterisk/manager.conf`**

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[api_manager]
secret = AsteriskAMISecret2025!
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
permit = 172.18.0.0/16
read = all
write = all
```

### 2.7 Configurer ARI (Asterisk REST Interface)

**Fichier : `/etc/asterisk/ari.conf`**

```ini
[general]
enabled = yes
pretty = yes

[api_ari_user]
type = user
read_only = no
password = AsteriskARISecret2025!
```

**Fichier : `/etc/asterisk/http.conf`**

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088
```

### 2.8 Redémarrer Asterisk

```bash
sudo systemctl restart asterisk

# Vérifier les modules chargés
asterisk -rx "module show like pjsip"
asterisk -rx "module show like odbc"
asterisk -rx "module show like ari"

# Vérifier la connexion ODBC
asterisk -rx "odbc show all"
```

Vous devriez voir :
```
ODBC DSN Settings
-----------------
  Name:   asterisk
  DSN:    asterisk
    Connected: Yes
```

---

## Étape 3 : Installation de l'API REST NestJS

### 3.1 Cloner ou préparer le projet

```bash
cd /var/www
git clone <VOTRE_REPO> asterisk-api-v2
cd asterisk-api-v2
```

### 3.2 Installer les dépendances

```bash
npm install
```

### 3.3 Configurer les variables d'environnement

**Fichier : `.env`**

```bash
# Application
NODE_ENV=production
PORT=3001
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asterisk_api
DB_USER=api_user
DB_PASSWORD=ApiSecurePass2025!
DB_POOL_SIZE=20

# AMI (Asterisk Manager Interface)
AMI_HOST=localhost
AMI_PORT=5038
AMI_USER=api_manager
AMI_PASSWORD=AsteriskAMISecret2025!

# ARI (Asterisk REST Interface)
ARI_HOST=localhost
ARI_PORT=8088
ARI_USER=api_ari_user
ARI_PASSWORD=AsteriskARISecret2025!
ARI_WS_URL=ws://localhost:8088/ari/events

# Asterisk Config
ASTERISK_CONFIG_PATH=/etc/asterisk
ASTERISK_RELOAD_TIMEOUT=5000

# JWT
JWT_SECRET=votre-cle-secrete-super-longue-minimum-32-caracteres
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Network (si Asterisk est sur le même serveur)
PUBLIC_IP=VOTRE_IP_PUBLIQUE
SIP_PORT=5060
WSS_PORT=8089
RTP_START=10000
RTP_END=10200
```

### 3.4 Compiler l'application

```bash
npm run build
```

### 3.5 Exécuter les migrations TypeORM

```bash
npm run migration:run
```

### 3.6 Lancer l'API

```bash
# Mode développement
npm run start:dev

# Mode production
npm run start:prod
```

### 3.7 Vérifier l'API

```bash
curl http://localhost:3001/api/v1/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "database": "connected",
  "ami": "connected"
}
```

---

## Étape 4 : Configuration AMI et ARI

### 4.1 Test de connexion AMI

**Créer un script de test** : `/tmp/test-ami.sh`

```bash
#!/bin/bash

nc localhost 5038 <<EOF
Action: Login
Username: api_manager
Secret: AsteriskAMISecret2025!

Action: Ping

Action: Logoff

EOF
```

```bash
chmod +x /tmp/test-ami.sh
/tmp/test-ami.sh
```

Réponse attendue :
```
Asterisk Call Manager/5.0.0
Response: Success
Message: Authentication accepted

Response: Success
Ping: Pong
...
```

### 4.2 Test de connexion ARI

```bash
curl -u api_ari_user:AsteriskARISecret2025! \
  http://localhost:8088/ari/asterisk/info
```

Réponse attendue :
```json
{
  "build": {
    "date": "...",
    "kernel": "...",
    "machine": "..."
  },
  "system": {
    "version": "18.x.x"
  }
}
```

---

## Étape 5 : Initialisation de la base de données

### 5.1 Schéma complet

Les migrations TypeORM créent automatiquement les tables. Voici la liste complète :

**Tables API** :
- `tenants` : Organisations (entreprises)
- `app_users` : Utilisateurs de l'API
- `tenant_contexts` : Contexts dialplan par tenant
- `endpoint_roles` : Rôles pour les endpoints
- `role_presets` : Presets de rôles prédéfinis
- `role_preset_roles` : Rôles associés aux presets

**Tables Asterisk PJSIP** :
- `ps_endpoints` : Endpoints SIP
- `ps_auths` : Authentification
- `ps_aors` : Address of Record
- `ps_transports` : Transports
- `ps_contacts` : Contacts actifs (gérés par Asterisk)

**Tables Dialplan** :
- `extensions` : Extensions du dialplan

**Tables Queues** :
- `queues` : Files d'attente
- `queue_members` : Membres des files

**Tables CDR** :
- `cdr` : Call Detail Records
- `call_recordings` : Métadonnées des enregistrements

**Tables IVR** :
- `ivr_menus` : Menus IVR
- `ivr_options` : Options DTMF
- `ivr_did_mappings` : Mapping DID → Menu

**Tables Audio** :
- `sound_files` : Fichiers audio
- `moh_classes` : Musique d'attente

### 5.2 Créer le premier utilisateur SUPER_ADMIN

**Via l'API (inscription)** :

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword2025!",
    "firstName": "Admin",
    "lastName": "System",
    "role": "admin"
  }'
```

**Obtenir le token JWT** :

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword2025!"
  }' | jq -r '.accessToken')

echo "Token: $TOKEN"
```

### 5.3 Créer le premier tenant

```bash
TENANT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "companyName": "Acme Corporation Inc.",
    "contactEmail": "contact@acme.com",
    "timezone": "Europe/Paris",
    "maxEndpoints": 100,
    "maxQueues": 20
  }')

TENANT_ID=$(echo "$TENANT_RESPONSE" | jq -r '.id')
echo "Tenant créé avec ID: $TENANT_ID"
```

### 5.4 Créer le premier endpoint WebRTC

```bash
curl -X POST http://localhost:3001/api/v1/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "AliceSecure123",
    "transport": "transport-wss",
    "context": "t'$TENANT_ID'_default",
    "webrtc": true,
    "displayName": "Alice Agent"
  }'
```

Réponse :
```json
{
  "id": "t1_alice",
  "displayName": "alice",
  "transport": "transport-wss",
  "context": "t1_default",
  "tenantId": 1,
  "deviceState": "UNAVAILABLE"
}
```

---

## Étape 6 : Déploiement avec Docker

### 6.1 Docker Compose complet

**Fichier : `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:14
    container_name: asterisk-api-postgres
    environment:
      POSTGRES_DB: asterisk_api
      POSTGRES_USER: api_user
      POSTGRES_PASSWORD: ApiSecurePass2025!
    ports:
      - "5432:5432"
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - asterisk-network

  # Asterisk with Realtime
  asterisk:
    image: andrius/asterisk:latest
    container_name: asterisk-realtime
    depends_on:
      - db
    ports:
      - "5060:5060/udp"    # SIP
      - "8089:8089"        # WSS
      - "5038:5038"        # AMI
      - "8088:8088"        # ARI
      - "10000-10200:10000-10200/udp"  # RTP
    volumes:
      - ./asterisk-config:/etc/asterisk
      - asterisk-sounds:/var/lib/asterisk/sounds
      - asterisk-recordings:/var/spool/asterisk/monitor
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: asterisk_api
      DB_USER: api_user
      DB_PASSWORD: ApiSecurePass2025!
    networks:
      - asterisk-network

  # API NestJS
  api:
    build: ./asterisk-api-v2
    container_name: asterisk-api
    depends_on:
      - db
      - asterisk
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: asterisk_api
      DB_USER: api_user
      DB_PASSWORD: ApiSecurePass2025!
      AMI_HOST: asterisk
      AMI_PORT: 5038
      AMI_USER: api_manager
      AMI_PASSWORD: AsteriskAMISecret2025!
      ARI_HOST: asterisk
      ARI_PORT: 8088
      ARI_USER: api_ari_user
      ARI_PASSWORD: AsteriskARISecret2025!
      JWT_SECRET: votre-cle-secrete-super-longue-minimum-32-caracteres
    volumes:
      - ./asterisk-api-v2:/app
    networks:
      - asterisk-network

volumes:
  pg-data:
  asterisk-sounds:
  asterisk-recordings:

networks:
  asterisk-network:
    driver: bridge
```

### 6.2 Démarrer tous les services

```bash
docker-compose up -d

# Vérifier les logs
docker-compose logs -f api
docker-compose logs -f asterisk

# Vérifier l'état
docker-compose ps
```

---

## Étape 7 : Tests et vérifications

### 7.1 Vérifier PostgreSQL

```bash
docker exec asterisk-api-postgres psql -U api_user -d asterisk_api -c "\dt"
```

Vous devriez voir toutes les tables créées.

### 7.2 Vérifier Asterisk Realtime

```bash
docker exec asterisk-realtime asterisk -rx "odbc show all"
docker exec asterisk-realtime asterisk -rx "pjsip show endpoints"
docker exec asterisk-realtime asterisk -rx "dialplan show"
```

### 7.3 Tester l'enregistrement WebRTC

Utilisez un client WebRTC (ex: [Sipgate](https://www.sipjs.com/guides/make-call/)) avec :

- **WebSocket Server** : `wss://VOTRE_IP:8089/ws`
- **SIP URI** : `sip:alice@VOTRE_IP`
- **Username** : `alice`
- **Password** : `AliceSecure123`

### 7.4 Test d'appel interne

```bash
# Créer un second endpoint
curl -X POST http://localhost:3001/api/v1/endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "password": "BobSecure123",
    "transport": "transport-wss",
    "context": "t1_default",
    "webrtc": true
  }'

# Alice peut maintenant appeler Bob à l'extension 1002
# (en supposant que Bob a l'extension 1002)
```

---

## Commandes utiles

### Asterisk CLI

```bash
# Connexion CLI
docker exec -it asterisk-realtime asterisk -rvvv

# Recharger la configuration PJSIP
asterisk -rx "module reload res_pjsip.so"

# Recharger le dialplan
asterisk -rx "dialplan reload"

# Voir les endpoints
asterisk -rx "pjsip show endpoints"

# Voir les queues
asterisk -rx "queue show"

# Voir les channels actifs
asterisk -rx "core show channels"

# Tester Realtime
asterisk -rx "realtime load ps_endpoints t1_alice"
```

### PostgreSQL

```bash
# Voir les endpoints
docker exec asterisk-api-postgres psql -U api_user -d asterisk_api \
  -c "SELECT id, transport, context FROM ps_endpoints;"

# Voir les queues
docker exec asterisk-api-postgres psql -U api_user -d asterisk_api \
  -c "SELECT name, strategy, timeout FROM queues;"

# Voir les extensions
docker exec asterisk-api-postgres psql -U api_user -d asterisk_api \
  -c "SELECT context, exten, priority, app FROM extensions ORDER BY context, exten, priority;"
```

### API

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Lister les endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/endpoints

# Statut d'un endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/endpoints/alice/status
```

---

## Troubleshooting

### Problème : Asterisk ne se connecte pas à PostgreSQL

**Symptôme** :
```
[ERROR] res_odbc.c: Failed to connect to asterisk [asterisk]
```

**Solution** :
1. Vérifier ODBC : `asterisk -rx "odbc show all"`
2. Tester la connexion : `isql -v asterisk api_user ApiSecurePass2025!`
3. Vérifier `/etc/odbc.ini` et `/etc/odbcinst.ini`
4. Redémarrer Asterisk : `systemctl restart asterisk`

---

### Problème : Les endpoints ne sont pas chargés

**Symptôme** :
```
asterisk -rx "pjsip show endpoints"
No objects found.
```

**Solution** :
1. Vérifier que les endpoints existent en DB :
   ```sql
   SELECT id FROM ps_endpoints;
   ```

2. Vérifier `sorcery.conf` :
   ```ini
   [res_pjsip]
   endpoint=realtime,ps_endpoints
   ```

3. Recharger PJSIP :
   ```bash
   asterisk -rx "module reload res_pjsip.so"
   ```

---

### Problème : AMI ne se connecte pas

**Symptôme** :
```
[ERROR] Unable to connect to AMI
```

**Solution** :
1. Vérifier `/etc/asterisk/manager.conf` :
   ```ini
   [general]
   enabled = yes
   port = 5038
   ```

2. Tester avec netcat :
   ```bash
   nc localhost 5038
   ```

3. Vérifier les credentials dans `.env` de l'API

---

### Problème : Le dialplan n'est pas chargé

**Symptôme** :
```
asterisk -rx "dialplan show t1_default"
No such context
```

**Solution** :
1. Vérifier `extensions_dynamic.conf` :
   ```ini
   [t1_default](tenant_template)
   ```

2. Vérifier les extensions en DB :
   ```sql
   SELECT * FROM extensions WHERE context = 't1_default';
   ```

3. Recharger :
   ```bash
   asterisk -rx "dialplan reload"
   ```

---

## Conclusion

Vous avez maintenant un système Asterisk Realtime complet avec :

✅ Configuration dynamique en base de données
✅ API REST pour gérer la téléphonie
✅ Multi-tenant avec isolation
✅ WebRTC et SIP supportés
✅ AMI et ARI configurés
✅ Queues en temps réel

### Prochaines étapes

- Ajouter l'IVR avec ARI
- Configurer les trunks SIP
- Mettre en place la supervision (Grafana + Prometheus)
- Implémenter les webhooks pour les événements
- Ajouter l'enregistrement des appels

### Ressources

- Documentation Asterisk : https://wiki.asterisk.org
- Documentation NestJS : https://docs.nestjs.com
- PostgreSQL ODBC : https://odbc.postgresql.org

Bon déploiement ! 🚀
