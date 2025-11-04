# 🚀 GUIDE DE MIGRATION - BASE DE DONNÉES UNIFIÉE

## 📋 Vue d'ensemble

Ce guide explique comment démarrer le nouveau système multi-tenant Asterisk avec la base de données unifiée `api-db`.

### Qu'est-ce qui a changé ?

**AVANT:**
- 2 bases de données PostgreSQL distinctes
  - `db` (port 5432) : Asterisk realtime
  - `api-db` (port 5433) : API backend
- Asterisk connecté à `db`
- Backend connecté à `api-db`

**MAINTENANT:**
- **1 SEULE base de données PostgreSQL**
  - `api-db` (port 5432) : TOUT (Asterisk + Backend)
- Asterisk connecté à `api-db` via ODBC
- Backend connecté à `api-db`
- Ancien service `db` désactivé mais gardé dans le fichier

### Avantages

✅ **Cohérence des données** - Une seule source de vérité
✅ **Migrations simplifiées** - Un seul schéma à gérer
✅ **Meilleures performances** - Pas de duplication de données
✅ **Facilité de déploiement** - Une seule base à sauvegarder

---

## 🔧 Modifications effectuées

### 1. Script d'initialisation complet (`init-api-db.sql`)

Un nouveau script SQL a été créé contenant :
- ✅ Toutes les tables Asterisk realtime (ps_*, queues, extensions, cdr)
- ✅ Colonnes supplémentaires manquantes (display_name, timestamps, etc.)
- ✅ Nouvelles tables :
  - `tenants` (avec toutes les colonnes complètes)
  - `tenant_contexts` (gestion multi-contextes par tenant)
  - `app_users` (utilisateurs de l'API avec rôles)
  - `ivr_*` (système IVR complet)
- ✅ Triggers automatiques pour `updated_at`
- ✅ Indexes pour performance
- ✅ Utilisateur admin par défaut

**Credentials admin par défaut:**
- Username: `admin`
- Email: `admin@asterisk.local`
- Password: `Admin123!`
- Role: `SUPER_ADMIN`

### 2. Configuration ODBC modifiée

**Fichiers modifiés:**
- `/asterisk-pgsql/odbc.ini` → Pointe vers `api-db`
- `/asterisk-pgsql/etc/asterisk/res_odbc.conf` → Credentials mis à jour

**Nouvelles valeurs:**
```ini
Servername = api-db
Database = asterisk_api
UserName = api_user
Password = ApiSecurePass2025!
```

### 3. Docker Compose mis à jour

**Changements:**
- Service `db` commenté (gardé pour référence)
- Service `api-db` sur port **5432** (standard)
- Asterisk dépend maintenant de `api-db`
- Script `init-api-db.sql` monté automatiquement

---

## 🚀 DÉMARRAGE DU NOUVEAU SYSTÈME

### Prérequis

1. Docker et Docker Compose installés
2. Aucun autre service PostgreSQL sur le port 5432
3. L'ancien volume `api-pgdata` doit être supprimé ou renommé (voir étapes ci-dessous)

### Étape 1 : Nettoyer l'ancien volume (IMPORTANT!)

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/asterisk-pgsql

# Arrêter tous les conteneurs
docker-compose down

# IMPORTANT: Sauvegarder l'ancien volume si nécessaire
# Si vous avez des données importantes dans api-db, sauvegardez d'abord!

# Option A: Supprimer complètement l'ancien volume (recommandé pour nouveau démarrage)
sudo rm -rf ./api-pgdata

# Option B: Renommer l'ancien volume pour le garder en backup
# mv ./api-pgdata ./api-pgdata.backup.$(date +%Y%m%d)
```

### Étape 2 : Démarrer les services

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f api-db     # Base de données
docker-compose logs -f asterisk   # Asterisk
docker-compose logs -f backend    # Backend NestJS
```

### Étape 3 : Vérifier que tout fonctionne

#### A) Vérifier la base de données

```bash
# Se connecter à la base de données
docker exec -it asterisk-api-postgres psql -U api_user -d asterisk_api

# Vérifier les tables créées
\dt

# Devrait afficher:
# - tenants
# - tenant_contexts
# - app_users
# - ps_endpoints, ps_auths, ps_aors
# - extensions
# - queues, queue_members
# - cdr
# - ivr_menus, ivr_options, ivr_conditions, ivr_did_mappings, ivr_audio_files
# etc.

# Vérifier l'utilisateur admin
SELECT id, username, email, role FROM app_users;

# Quitter psql
\q
```

#### B) Vérifier la connexion ODBC d'Asterisk

```bash
# Se connecter au CLI Asterisk
docker exec -it asterisk asterisk -rx "odbc show"

# Devrait afficher:
# ODBC DSN Settings
# -----------------
#   Name:   asterisk
#   DSN:    asterisk
#     Connected: yes

# Tester la connexion
docker exec -it asterisk asterisk -rx "odbc show asterisk"
```

#### C) Vérifier l'API Backend

```bash
# Tester le health check
curl http://localhost:3001/api/v1/health

# Accéder à Swagger
open http://localhost:3001/api/v1/docs
```

---

## 📊 NOUVELLES FONCTIONNALITÉS DISPONIBLES

### 1. Gestion complète des tenants

Toutes les colonnes sont maintenant disponibles dans la table `tenants`:

```sql
-- Exemple de tenant complet
INSERT INTO tenants (
    name, company_name, contact_email, contact_phone,
    address, city, country, timezone,
    is_active, max_endpoints, max_queues, context
) VALUES (
    'entreprise-a',
    'Entreprise A Inc.',
    'contact@entreprise-a.com',
    '+33123456789',
    '123 Rue de la Paix',
    'Paris',
    'France',
    'Europe/Paris',
    true,
    50,
    10,
    't1_default'
);
```

### 2. Contextes multiples par tenant

```sql
-- Créer un contexte principal
INSERT INTO tenant_contexts (tenant_id, name, description, is_primary)
VALUES (1, 't1_default', 'Contexte principal', true);

-- Ajouter un contexte secondaire (ventes)
INSERT INTO tenant_contexts (tenant_id, name, description, is_primary)
VALUES (1, 't1_sales', 'Équipe commerciale', false);

-- Ajouter un contexte tertiaire (support)
INSERT INTO tenant_contexts (tenant_id, name, description, is_primary)
VALUES (1, 't1_support', 'Support client', false);
```

### 3. Gestion des utilisateurs avec rôles

```sql
-- Créer un admin de tenant
INSERT INTO app_users (username, email, password_hash, tenant_id, role, first_name, last_name)
VALUES (
    'admin_tenant1',
    'admin@entreprise-a.com',
    '$2b$10$...', -- Hash bcrypt
    1,
    'TENANT_ADMIN',
    'Jean',
    'Dupont'
);

-- Créer un agent
INSERT INTO app_users (username, email, password_hash, tenant_id, role, first_name, last_name)
VALUES (
    'agent001',
    'agent@entreprise-a.com',
    '$2b$10$...',
    1,
    'AGENT',
    'Marie',
    'Martin'
);
```

### 4. Endpoints avec métadonnées complètes

```sql
-- Créer un endpoint avec toutes les informations
INSERT INTO ps_endpoints (
    id, tenant_id, display_name, transport, aors, auth,
    context, allow, callerid, dtmf_mode, created_at
) VALUES (
    't1_101',
    1,
    'John Doe',
    'transport-udp',
    't1_101',
    't1_101',
    't1_default',
    'ulaw,alaw,g722',
    'John Doe <101>',
    'rfc4733',
    NOW()
);
```

---

## 🔍 DÉPANNAGE

### Problème : Le conteneur `api-db` ne démarre pas

**Solution :**
```bash
# Vérifier les logs
docker-compose logs api-db

# Souvent causé par un volume existant corrompu
docker-compose down
sudo rm -rf ./api-pgdata
docker-compose up -d api-db
```

### Problème : Asterisk ne se connecte pas à ODBC

**Solution :**
```bash
# Vérifier les logs Asterisk
docker-compose logs asterisk | grep -i odbc

# Redémarrer Asterisk après que la DB soit prête
docker-compose restart asterisk

# Vérifier manuellement ODBC
docker exec -it asterisk cat /etc/odbc.ini
```

### Problème : Backend ne démarre pas

**Solution :**
```bash
# Vérifier les logs
docker-compose logs backend

# Souvent causé par des node_modules
docker-compose down
docker-compose up -d backend
```

### Problème : Tables manquantes

**Solution :**
```bash
# Re-créer complètement la base
docker-compose down
sudo rm -rf ./api-pgdata
docker-compose up -d

# Le script init-api-db.sql s'exécutera automatiquement
```

---

## 📝 PROCHAINES ÉTAPES

Maintenant que la base est configurée, vous pouvez :

1. ✅ **Décommenter les colonnes dans les entités TypeScript**
   - `tenant.entity.ts`
   - `ps-endpoint.entity.ts`
   - `ps-auth.entity.ts`
   - `ps-aor.entity.ts`

2. ✅ **Créer l'entité TenantContext**
   - Nouvelle entité pour gérer les contextes multiples

3. ✅ **Créer l'entité AppUser**
   - Gestion des utilisateurs de l'API

4. ✅ **Supprimer le code "TEST MODE"**
   - Dans `queue-members.service.ts`
   - Dans `queues.service.ts`
   - Partout où `tenantId ?? 1` est utilisé

5. ✅ **Réactiver l'authentification JWT**
   - Décommenter les guards dans `app.module.ts`

6. ✅ **Tester les APIs**
   - Créer un tenant via API
   - Créer des endpoints
   - Créer des queues
   - Tester l'IVR

---

## 🎯 RÉSUMÉ DES CREDENTIALS

### Base de données

**api-db (PostgreSQL 14)**
- Host: `localhost` (ou `api-db` dans Docker)
- Port: `5432`
- Database: `asterisk_api`
- User: `api_user`
- Password: `ApiSecurePass2025!`

### Admin par défaut

**API Admin**
- Username: `admin`
- Email: `admin@asterisk.local`
- Password: `Admin123!`
- Role: `SUPER_ADMIN`

### Asterisk

**AMI**
- Host: `localhost`
- Port: `5038`
- User: `admin`
- Password: `Sp33Dd14L`

**ARI**
- Host: `localhost`
- Port: `8088`
- User: `callcenter-ivr`
- Password: `Secret123!`

---

## ⚠️ IMPORTANT

1. **Ne supprimez PAS le service `db` commenté** dans docker-compose.yml - Il est gardé pour référence
2. **Changez le mot de passe admin** après le premier démarrage
3. **Sauvegardez régulièrement** la base de données api-db
4. **Utilisez des mots de passe forts** en production

---

## 📞 Support

Pour toute question ou problème, vérifiez :
1. Les logs Docker : `docker-compose logs -f`
2. La connectivité réseau : `docker network inspect asterisk_asterisk-network`
3. L'état des services : `docker-compose ps`

**Bon démarrage ! 🎉**
