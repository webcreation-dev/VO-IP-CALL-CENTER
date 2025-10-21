# 📞 Plateforme Multi-Tenant Asterisk + PostgreSQL Realtime

Plateforme VoIP multi-tenant complète avec Asterisk, PostgreSQL, WebRTC et API REST.

## 🎯 Fonctionnalités

- ✅ **Multi-tenant** : Isolation complète entre clients
- ✅ **PostgreSQL Realtime** : Configuration dynamique sans redémarrage
- ✅ **WebRTC** : Appels depuis le navigateur (WebSocket Secure)
- ✅ **SIP Trunk** : Connexion opérateur téléphonique
- ✅ **Files d'attente** : Distribution intelligente des appels
- ✅ **API REST** : Gestion complète via Node.js
- ✅ **Dashboard React** : Interface d'administration
- ✅ **Enregistrement** : CDR et enregistrement des appels

## 🚀 Déploiement rapide

### Prérequis

- Docker & Docker Compose
- VPS avec Ubuntu 20.04+ ou Debian 11+
- Ports : 5060 UDP, 8089 TCP, 10000-10200 UDP

### Installation en 3 commandes

```bash
# 1. Générer les certificats SSL
cd asterisk-pgsql
sudo ./generate-ssl-certs.sh

# 2. Modifier l'IP publique dans init.sql
nano init.sql  # Remplacer 161.97.106.134 par votre IP

# 3. Démarrer
docker-compose up -d
```

### Vérification

```bash
# Vérifier l'installation
./verify-install.sh

# Accéder au CLI Asterisk
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rvvv
```

## 📖 Documentation

- **[DEPLOIEMENT_RAPIDE.md](DEPLOIEMENT_RAPIDE.md)** - Guide complet pas à pas
- **[CORRECTIONS_APPLIQUEES.md](CORRECTIONS_APPLIQUEES.md)** - Détails techniques des corrections
- **[asterisk-pgsql/README.md](asterisk-pgsql/README.md)** - Configuration Asterisk
- **[GUIDE_DEPLOIEMENT_COMPLET.md](GUIDE_DEPLOIEMENT_COMPLET.md)** - Déploiement avancé

## 🧪 Tests

### Test 1 : Appels internes WebRTC

1. Ouvrir `web_phone.html` dans Chrome
2. Configurer :
   - URI: `wss://VOTRE_IP:8089/ws`
   - SIP: `sip:101@VOTRE_IP`
   - Password: `password101`
3. S'enregistrer
4. Appeler `102`

### Test 2 : File d'attente

1. Depuis 101, appeler `800`
2. Entrer dans `support_queue`
3. 102 reçoit l'appel

### Test 3 : Appels entrants

Appeler le numéro DID : **+22954150000**
→ L'appel arrive sur la queue support

## 📊 Architecture

```
┌─────────────────┐
│  API Node.js    │ :3000
│  (REST)         │
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │ :5432
│  (Realtime)     │
└────────┬────────┘
         │
┌────────▼────────┐      ┌──────────────┐
│  Asterisk       │◄────►│ SIP Trunk    │
│  PJSIP/WebRTC   │      │ 197.234...   │
└─────────────────┘      └──────────────┘
   │         │
   │ 5060    │ 8089
   │ UDP     │ WSS
   │         │
┌──▼──┐   ┌─▼────────┐
│ SIP │   │ WebRTC   │
│Phone│   │ Browser  │
└─────┘   └──────────┘
```

## 🔧 Configuration

### Trunk SIP

```
Username: 62908521
Password: 167d458f-8
Server: 197.234.218.195:25060
Protocol: UDP
Codec: alaw, ulaw
```

### Extensions WebRTC

| Extension | Password | Context |
|-----------|----------|---------|
| 101 | password101 | client-a-context |
| 102 | password102 | client-a-context |
| 201 | password201 | client-b-context |
| 202 | password202 | client-b-context |

### Codes spéciaux

| Code | Fonction |
|------|----------|
| 800 | File d'attente support |
| 801 | File d'attente ventes |
| *65 | Messagerie vocale |
| *66 | Pause agent |
| *67 | Reprise service |
| *68 | Statistiques queue |

## 🔐 Sécurité

### Production

- ⚠️ Changer tous les mots de passe par défaut
- ⚠️ Utiliser Let's Encrypt au lieu de certificats auto-signés
- ⚠️ Configurer un firewall (ufw/iptables)
- ⚠️ Utiliser des variables d'environnement pour les secrets

### Certificats SSL Let's Encrypt

```bash
sudo certbot certonly --standalone -d votre-domaine.com
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem /etc/asterisk/keys/
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem /etc/asterisk/keys/
docker-compose restart asterisk
```

## 📡 API REST

### Endpoints disponibles

```
GET  /api/health              - Health check
GET  /api/tenants             - Liste des tenants
GET  /api/endpoints           - Liste des endpoints
GET  /api/queues              - Liste des queues
POST /api/queues/:name/members - Ajouter membre à queue
GET  /api/cdr                 - Historique d'appels
GET  /api/statistics          - Statistiques globales
```

### Exemple

```bash
# Lister les tenants
curl http://localhost:3000/api/tenants

# Statistiques
curl http://localhost:3000/api/statistics
```

## 🐛 Dépannage

### 101 ne peut pas appeler 102

```bash
# Vérifier ODBC
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "odbc show all"
# Doit montrer : asterisk [Connected]

# Vérifier endpoints
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show endpoints"

# Vérifier dialplan
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "dialplan show client-a-context"
```

### Trunk ne s'enregistre pas

```bash
# Vérifier registration
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show registrations"

# Logs PJSIP
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip set logger on"
docker logs -f asterisk-pgsql_asterisk_1
```

### WebRTC ne fonctionne pas

```bash
# Vérifier certificats
docker exec -it asterisk-pgsql_asterisk_1 ls -la /etc/asterisk/keys/

# Régénérer
cd asterisk-pgsql
sudo ./generate-ssl-certs.sh
docker-compose restart asterisk
```

### Plus de détails

Consulter **[DEPLOIEMENT_RAPIDE.md](DEPLOIEMENT_RAPIDE.md)** section Dépannage

## 📦 Structure du projet

```
asterisk/
├── asterisk-pgsql/          # Configuration Asterisk + Docker
│   ├── etc/asterisk/        # Fichiers de config Asterisk
│   │   ├── pjsip.conf       # (vide - tout en realtime)
│   │   ├── extensions.conf  # Dialplan (switch realtime)
│   │   ├── extconfig.conf   # Mapping ODBC
│   │   ├── sorcery.conf     # Mapping PJSIP realtime
│   │   ├── res_pgsql.conf   # Connexion PostgreSQL
│   │   └── ...
│   ├── init.sql             # Données initiales PostgreSQL
│   ├── schema.sql           # Schéma de base de données
│   ├── docker-compose.yml   # Orchestration Docker
│   ├── Dockerfile           # Image Asterisk custom
│   └── generate-ssl-certs.sh # Génération certificats
├── src/                     # API Node.js
│   ├── controllers/         # Contrôleurs REST
│   ├── services/            # Logique métier
│   ├── routes/              # Routes Express
│   └── config/              # Configuration AMI/DB
├── asterisk-admin-ui/       # Dashboard React
├── web_phone.html           # Client WebRTC
├── index.js                 # Serveur API Express
├── verify-install.sh        # Script de vérification
├── DEPLOIEMENT_RAPIDE.md    # Guide déploiement
├── CORRECTIONS_APPLIQUEES.md # Documentation corrections
└── README.md                # Ce fichier
```

## 🛠️ Technologies

- **Asterisk 18+** avec PJSIP
- **PostgreSQL 12+** avec ODBC
- **Node.js 20+** avec Express
- **React 18** avec Tailwind CSS
- **Docker & Docker Compose**
- **WebRTC** avec JsSIP

## 🎓 Ressources

- [Documentation Asterisk](https://docs.asterisk.org/)
- [PJSIP Configuration](https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip)
- [Realtime Database](https://wiki.asterisk.org/wiki/display/AST/Realtime+Database+Configuration)
- [WebRTC Tutorial](https://wiki.asterisk.org/wiki/display/AST/WebRTC+tutorial+using+SIPML5)

## 🤝 Support

1. Consulter [DEPLOIEMENT_RAPIDE.md](DEPLOIEMENT_RAPIDE.md)
2. Vérifier les logs : `docker logs -f asterisk-pgsql_asterisk_1`
3. Lancer le script de vérification : `./verify-install.sh`

## 📝 License

Projet privé - Tous droits réservés

---

**🎉 Prêt à passer en production !**

Suivre [DEPLOIEMENT_RAPIDE.md](DEPLOIEMENT_RAPIDE.md) pour un déploiement en 5 minutes.
