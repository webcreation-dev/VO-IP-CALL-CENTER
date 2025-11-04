# 🐳 Guide de Démarrage Docker - Asterisk Multi-Tenant API

## 📋 Architecture Docker

```
┌─────────────────────────────────────────────────────────────┐
│                    ASTERISK MULTI-TENANT                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Asterisk   │   │  PostgreSQL  │   │  PostgreSQL  │    │
│  │     PBX      │   │   (Realtime) │   │    (API)     │    │
│  │              │   │              │   │              │    │
│  │  Port: 5038  │   │  Port: 5432  │   │  Port: 5433  │    │
│  │  Port: 8088  │   │              │   │              │    │
│  │  Port: 8089  │   │              │   │              │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                   │                   │            │
│         └───────────────────┴───────────────────┘            │
│                             │                                │
│         ┌───────────────────┴───────────────────┐            │
│         │                                       │            │
│  ┌──────────────┐                      ┌──────────────┐     │
│  │    Redis     │                      │   NestJS API  │     │
│  │    Cache     │◄─────────────────────┤   Backend     │     │
│  │              │                      │               │     │
│  │  Port: 6379  │                      │  Port: 3001   │     │
│  └──────────────┘                      └──────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage Rapide

### 1. Prérequis

- Docker Engine 20.10+
- Docker Compose 1.29+
- 4 GB RAM minimum
- 10 GB espace disque

### 2. Configuration Initiale

```bash
# Se placer dans le répertoire principal
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk

# Copier le fichier .env Docker pour le backend
cd asterisk-api-v2
cp .env.docker .env

# Retourner au répertoire de docker-compose
cd ../asterisk-pgsql
```

### 3. Démarrer Tous les Services

```bash
# Dans le répertoire asterisk-pgsql/
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Ou logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f asterisk
```

### 4. Vérifier que Tout Fonctionne

```bash
# Vérifier le statut des conteneurs
docker-compose ps

# Devrait afficher :
# asterisk              running   5038/tcp, 8088/tcp, 8089/tcp, 5060/udp, 10000-10200/udp
# asterisk-postgres     running   5432/tcp
# asterisk-api-postgres running   5433/tcp
# asterisk-redis        running   6379/tcp
# asterisk-backend      running   3001/tcp
```

### 5. Accéder aux Services

- **API Backend**: http://localhost:3001
- **Swagger Documentation**: http://localhost:3001/api/docs
- **Asterisk AMI**: telnet localhost 5038
- **Asterisk ARI**: http://localhost:8088
- **Asterisk WSS (WebRTC)**: wss://localhost:8089/ws
- **PostgreSQL Realtime**: localhost:5432
- **PostgreSQL API**: localhost:5433
- **Redis**: localhost:6379

## 🔧 Commandes Utiles

### Gestion des Conteneurs

```bash
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Redémarrer un service spécifique
docker-compose restart backend

# Voir les logs
docker-compose logs -f [service]

# Entrer dans un conteneur
docker-compose exec backend sh
docker-compose exec asterisk bash
```

### Base de Données

```bash
# Accéder à PostgreSQL API
docker-compose exec api-db psql -U api_user -d asterisk_api

# Accéder à PostgreSQL Realtime
docker-compose exec db psql -U asterisk -d asterisk

# Exécuter les migrations
docker-compose exec backend npm run migration:run

# Créer une nouvelle migration
docker-compose exec backend npm run migration:generate -- -n NomDeLaMigration
```

### Asterisk CLI

```bash
# Accéder au CLI Asterisk
docker-compose exec asterisk asterisk -rvvv

# Commandes Asterisk utiles :
pjsip show endpoints          # Voir tous les endpoints
pjsip show endpoint t1_101    # Détails d'un endpoint
queue show                    # Voir toutes les queues
core show channels            # Appels en cours
dialplan show                 # Voir le dialplan
core reload                   # Recharger la config
```

### Redis

```bash
# Accéder au CLI Redis
docker-compose exec redis redis-cli

# Commandes Redis utiles :
KEYS *                  # Voir toutes les clés
GET clé                 # Voir une valeur
FLUSHALL                # Vider tout le cache
```

## 📦 Installation des Dépendances Backend

Si vous modifiez `package.json` :

```bash
# Reconstruire le conteneur backend
docker-compose build backend

# Ou installer directement dans le conteneur
docker-compose exec backend npm install
```

## 🧪 Tests & Développement

### Mode Développement avec Hot Reload

Le backend est configuré en mode `npm run start:dev`, donc :

```bash
# Modifier un fichier dans asterisk-api-v2/src/
# Le serveur redémarre automatiquement !
```

### Tester l'API

```bash
# Créer un tenant
curl -X POST http://localhost:3001/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "companyName": "Test Corp",
    "maxEndpoints": 20
  }'

# Lister les tenants
curl http://localhost:3001/api/v1/tenants

# Voir le Swagger pour tous les endpoints
# Ouvrir http://localhost:3001/api/docs dans le navigateur
```

## 🔐 Sécurité

### Mots de Passe par Défaut

⚠️ **IMPORTANT** : Changez ces mots de passe en production !

- PostgreSQL Realtime : `Obelix`
- PostgreSQL API : `ApiSecurePass2025!`
- Asterisk AMI : `Sp33Dd14L`
- Asterisk ARI : `Secret123!`
- JWT Secret : Voir `.env`

### Fichiers à Modifier

1. `docker-compose.yml` : Mots de passe des bases de données
2. `asterisk-api-v2/.env` : JWT secret et autres secrets
3. `asterisk-pgsql/etc/asterisk/manager.conf` : AMI password
4. `asterisk-pgsql/etc/asterisk/ari.conf` : ARI password

## 🗃️ Persistance des Données

Les données sont persistées dans des volumes Docker :

```bash
# Voir les volumes
docker volume ls | grep asterisk

# Localisation sur l'hôte :
asterisk-pgsql/.pgdata/         # PostgreSQL Realtime
asterisk-pgsql/api-pgdata/      # PostgreSQL API
```

### Nettoyer Toutes les Données

⚠️ **ATTENTION** : Cela supprime TOUTES les données !

```bash
# Arrêter et supprimer tous les conteneurs + volumes
docker-compose down -v

# Supprimer les répertoires de données
rm -rf asterisk-pgsql/.pgdata
rm -rf asterisk-pgsql/api-pgdata
```

## 🐛 Dépannage

### Le backend ne démarre pas

```bash
# Vérifier que api-db est bien démarré
docker-compose ps api-db

# Vérifier les logs du backend
docker-compose logs backend

# Problème courant : attendre que la DB soit prête
docker-compose restart backend
```

### Asterisk ne se connecte pas à PostgreSQL

```bash
# Vérifier la connexion ODBC
docker-compose exec asterisk cat /etc/odbc.ini

# Tester la connexion
docker-compose exec asterisk isql -v asterisk

# Voir les logs Asterisk
docker-compose logs asterisk
tail -f asterisk-pgsql/log/asterisk/full
```

### Erreur "Port already in use"

```bash
# Voir les ports utilisés
sudo lsof -i :3001
sudo lsof -i :5432

# Changer le port dans docker-compose.yml
# Par exemple : "3002:3001" au lieu de "3001:3001"
```

### Rebuild complet

```bash
# Tout supprimer et reconstruire
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoring

### Voir l'utilisation des ressources

```bash
# Stats en temps réel
docker stats

# CPU et RAM par conteneur
docker-compose ps -q | xargs docker stats --no-stream
```

## 🚢 Mise en Production

Pour la production, modifiez :

1. **NODE_ENV=production** dans `.env`
2. **Changez TOUS les mots de passe**
3. **Utilisez un JWT_SECRET fort** (32+ caractères aléatoires)
4. **Désactivez Swagger** : `SWAGGER_ENABLED=false`
5. **Configurez les limites de ressources** dans `docker-compose.yml`

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

## 📚 Prochaines Étapes

Après avoir démarré Docker :

1. ✅ Vérifier que tous les services fonctionnent
2. 🔄 Exécuter les migrations : `docker-compose exec backend npm run migration:run`
3. 🧪 Tester la création d'un tenant via Swagger
4. 📞 Tester WebRTC avec un softphone
5. 📊 Vérifier les statistiques dans Redis

---

**Besoin d'aide ?** Vérifiez les logs : `docker-compose logs -f`
