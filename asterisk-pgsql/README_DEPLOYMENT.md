# 📋 Guide de Déploiement - Système Asterisk avec Files d'Attente

## 🎯 Vue d'ensemble

Ce guide vous aidera à déployer et configurer complètement votre système Asterisk avec :

- ✅ Files d'attente (queues) avec musique d'attente
- ✅ Enregistrement des appels (CDR + Recordings)
- ✅ Transferts d'appels
- ✅ WebRTC client avec sonnerie
- ✅ Multi-tenant support
- ✅ IVR (Interactive Voice Response)

## 📦 Étapes de Déploiement

### 1️⃣ **Base de Données - Créer les Queues et Tables**

```bash
# Se connecter au conteneur PostgreSQL
docker exec -it <nom_conteneur_postgres> psql -U asterisk -d asterisk

# Exécuter les scripts de configuration
\i /path/to/setup_queues.sql
\i /path/to/setup_recording.sql
```

Ou via ligne de commande :

```bash
# Créer les queues
docker exec -i <nom_conteneur_postgres> psql -U asterisk -d asterisk < setup_queues.sql

# Créer les tables d'enregistrement
docker exec -i <nom_conteneur_postgres> psql -U asterisk -d asterisk < setup_recording.sql
```

### 2️⃣ **Vérifier la Configuration Realtime**

Les fichiers suivants doivent être en place :

```
asterisk-pgsql/etc/asterisk/
├── extconfig.conf       ✅ (configure queues et CDR en realtime)
├── res_pgsql.conf       ✅ (connexion PostgreSQL)
├── sorcery.conf         ✅ (PJSIP realtime)
├── pjsip.conf           ✅ (transports et trunk)
├── extensions.conf      ✅ (dialplan avec queues et IVR)
├── queues.conf          ✅ (configuration générale des queues)
├── musiconhold.conf     ✅ (musique d'attente)
├── features.conf        ✅ (transferts d'appels)
├── cdr.conf             ✅ (configuration CDR)
└── cdr_pgsql.conf       ✅ (CDR vers PostgreSQL)
```

### 3️⃣ **Redémarrer Asterisk**

```bash
# Redémarrer le conteneur Asterisk
docker restart <nom_conteneur_asterisk>

# Ou recharger la configuration depuis la CLI Asterisk
docker exec -it <nom_conteneur_asterisk> asterisk -rx "core reload"
docker exec -it <nom_conteneur_asterisk> asterisk -rx "module reload"
```

### 4️⃣ **Vérifier les Modules Chargés**

```bash
# Se connecter à la CLI Asterisk
docker exec -it <nom_conteneur_asterisk> asterisk -rvvv

# Vérifier les modules
module show like queue
module show like cdr
module show like pgsql
module show like res_musiconhold

# Vérifier les queues
queue show

# Vérifier les membres des queues
queue show support_queue
```

### 5️⃣ **Configuration de la Musique d'Attente**

```bash
# Copier des fichiers audio dans le répertoire MOH
# Les fichiers doivent être en format WAV mono 8000Hz

# Exemple avec sox pour convertir
sox input.mp3 -r 8000 -c 1 -t wav /var/lib/asterisk/moh/music1.wav

# Vérifier les classes MOH
docker exec -it <nom_conteneur_asterisk> asterisk -rx "moh show"
```

Structure recommandée :

```
/var/lib/asterisk/
├── moh/                    # Musique d'attente par défaut
│   ├── music1.wav
│   ├── music2.wav
│   └── music3.wav
└── sounds/
    └── custom/             # Messages personnalisés
        ├── welcome.wav     # Message d'accueil IVR
        ├── support-welcome.wav
        └── sales-welcome.wav
```

### 6️⃣ **Enregistrement des Appels**

```bash
# Créer le répertoire des enregistrements
mkdir -p /var/spool/asterisk/monitor

# Donner les permissions
chown asterisk:asterisk /var/spool/asterisk/monitor
chmod 755 /var/spool/asterisk/monitor

# Vérifier que MixMonitor fonctionne
docker exec -it <nom_conteneur_asterisk> asterisk -rx "core show applications like MixMonitor"
```

Les enregistrements seront sauvegardés au format :

```
/var/spool/asterisk/monitor/YYYYMMDD-HHMMSS-uniqueid.wav
```

## 🧪 Tests

### Test 1 : Appel Direct entre Utilisateurs

1. Ouvrir `web_phone.html` avec le user **101**
2. Se connecter
3. Appeler **102**
4. L'utilisateur 102 doit voir une popup avec sonnerie
5. Cliquer sur "Répondre"
6. Tester le transfert avec **#1** ou **\*2**

### Test 2 : File d'Attente Support

1. User 101 appelle l'extension **800**
2. L'appel entre dans la queue `support_queue`
3. Musique d'attente
4. Un agent (101 ou 102) reçoit l'appel

### Test 3 : Appel Entrant du Trunk

1. Appeler le numéro business
2. IVR joue le message d'accueil
3. Appuyer sur **1** pour support
4. L'appel est dirigé vers `support_queue`
5. Les agents disponibles reçoivent l'appel

### Test 4 : Extensions Spéciales

```
*65  : Consulter la messagerie vocale
*66  : Se mettre en pause (agent)
*67  : Reprendre le service (agent)
*68  : Écouter statistiques de la queue
#1   : Transfert aveugle (pendant un appel)
*2   : Transfert accompagné (pendant un appel)
*3   : Enregistrement manuel (pendant un appel)
```

## 📊 Requêtes SQL Utiles

### Voir tous les appels du jour

```sql
SELECT * FROM v_call_history
WHERE DATE(start_time) = CURRENT_DATE
ORDER BY start_time DESC;
```

### Statistiques des queues

```sql
SELECT * FROM v_queue_statistics
WHERE call_date = CURRENT_DATE;
```

### Appels avec enregistrements

```sql
SELECT
    caller,
    called,
    start_time,
    billable_duration,
    recording_filename
FROM v_call_history
WHERE has_recording = 'OUI'
ORDER BY start_time DESC
LIMIT 20;
```

### Top appelants du mois

```sql
SELECT
    src AS numero,
    COUNT(*) AS nb_appels,
    SUM(billsec)/60 AS minutes_totales
FROM cdr
WHERE calldate >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY src
ORDER BY nb_appels DESC
LIMIT 10;
```

## 🔧 Dépannage

### Problème : Les queues n'apparaissent pas

```bash
# Vérifier la connexion à la base de données
docker exec -it <conteneur_asterisk> asterisk -rx "database show"

# Vérifier extconfig
docker exec -it <conteneur_asterisk> asterisk -rx "realtime load queues support_queue"

# Recharger les queues
docker exec -it <conteneur_asterisk> asterisk -rx "module reload app_queue.so"
```

### Problème : Pas de musique d'attente

```bash
# Vérifier les classes MOH
docker exec -it <conteneur_asterisk> asterisk -rx "moh show"

# Recharger MOH
docker exec -it <conteneur_asterisk> asterisk -rx "moh reload"
```

### Problème : CDR ne s'enregistre pas

```bash
# Vérifier le module CDR
docker exec -it <conteneur_asterisk> asterisk -rx "cdr status"

# Vérifier la connexion PostgreSQL
docker exec -it <conteneur_asterisk> asterisk -rx "module reload cdr_pgsql.so"

# Voir les logs
docker logs <conteneur_asterisk> | grep CDR
```

### Problème : Transfert ne fonctionne pas

Vérifier que les options `Tt` sont dans le Dial() :

```
Dial(PJSIP/${EXTEN},30,TtWw)
```

## 📁 Structure des Fichiers

```
asterisk-pgsql/
├── setup_queues.sql          # Création des queues
├── setup_recording.sql       # Tables enregistrements
├── init.sql                  # Données initiales (tenants, users)
├── schema.sql                # Schema complet de la base
├── etc/asterisk/
│   ├── extensions.conf       # Dialplan avec queues et IVR
│   ├── queues.conf           # Config générale des queues
│   ├── musiconhold.conf      # Musique d'attente
│   ├── features.conf         # Transferts
│   ├── cdr.conf              # Configuration CDR
│   ├── cdr_pgsql.conf        # CDR PostgreSQL
│   ├── extconfig.conf        # Realtime config
│   └── pjsip.conf            # SIP endpoints et trunk
└── web_phone.html            # Client WebRTC avec sonnerie
```

## 🎉 Fonctionnalités Implémentées

✅ **Files d'attente (Queues)**

- Queue support_queue avec 2 agents (101, 102)
- Queue sales_queue
- Musique d'attente
- Annonces de position
- Stratégies de distribution (ringall, rrmemory)

✅ **Enregistrement des Appels**

- CDR complet en base de données
- Table call_recordings pour métadonnées
- Vues SQL pour statistiques
- MixMonitor pour enregistrements audio

✅ **Transferts d'Appels**

- Transfert aveugle (#1)
- Transfert accompagné (\*2)
- Conférence à 3 (\*3)

✅ **WebRTC Client**

- Sonnerie pour appels entrants
- Boutons Répondre/Rejeter
- Interface utilisateur améliorée
- Support WebRTC complet

✅ **IVR (Répondeur Interactif)**

- Menu vocal personnalisable
- Routage vers différentes queues
- Messages d'accueil

✅ **Multi-tenant**

- Isolation des données par tenant
- Context séparés
- Support PostgreSQL

## 🚀 Prochaines Étapes

1. Créer les messages audio personnalisés (IVR)
2. Configurer les horaires d'ouverture
3. Ajouter des rapports statistiques
4. Implémenter la supervision en temps réel
5. Ajouter des callbacks automatiques

## 📞 Support

Pour toute question, consultez :

- Les logs Asterisk : `docker logs <conteneur_asterisk>`
- La CLI Asterisk : `docker exec -it <conteneur_asterisk> asterisk -rvvv`
- Les logs PostgreSQL : `docker logs <conteneur_postgres>`
