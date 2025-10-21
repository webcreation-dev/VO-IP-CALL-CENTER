# 🚀 GUIDE DE DÉPLOIEMENT RAPIDE

## ✅ Corrections appliquées

Tous les problèmes de configuration ont été corrigés :

1. ✅ **PostgreSQL TCP activé** dans `res_pgsql.conf` (déblocage connexion Docker)
2. ✅ **Identification par IP activée** dans `sorcery.conf` et `extconfig.conf`
3. ✅ **Configuration realtime complète** (transports, endpoints, auth, registrations)
4. ✅ **SIP Trunk configuré** avec authentification (62908521 / 167d458f-8)
5. ✅ **Dialplan complet dans PostgreSQL** (appels internes, queues, features)
6. ✅ **Suppression des doublons** pjsip.conf vs PostgreSQL
7. ✅ **Script de génération SSL** pour WebRTC

---

## 📋 Prérequis

- VPS avec Ubuntu 20.04+ ou Debian 11+
- Docker et Docker Compose installés
- Ports ouverts : **5060 UDP**, **8089 TCP/WSS**, **10000-10200 UDP (RTP)**
- Accès root ou sudo

---

## 🔧 Déploiement en 5 étapes

### 1️⃣ Cloner et préparer le projet

```bash
# Se positionner dans le dossier du projet
cd /path/to/asterisk

# Vérifier que les fichiers sont présents
ls -la asterisk-pgsql/
```

### 2️⃣ Générer les certificats SSL (WebRTC)

```bash
# Depuis le dossier asterisk-pgsql
cd asterisk-pgsql

# Exécuter le script de génération
sudo ./generate-ssl-certs.sh
```

**Résultat attendu :**
```
✓ Certificats générés avec succès dans /etc/asterisk/keys
  - /etc/asterisk/keys/privkey.pem
  - /etc/asterisk/keys/fullchain.pem
```

> **Note production** : Pour la production, remplacer par des certificats Let's Encrypt :
> ```bash
> sudo certbot certonly --standalone -d votre-domaine.com
> sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem /etc/asterisk/keys/
> sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem /etc/asterisk/keys/
> ```

### 3️⃣ Configurer l'adresse IP publique

**Modifier `init.sql` avec votre IP publique VPS :**

```bash
# Trouver votre IP publique
curl ifconfig.me

# Éditer init.sql et remplacer 161.97.106.134 par votre IP
nano init.sql
# Chercher et remplacer toutes les occurrences
```

**Lignes à modifier :**
- Ligne 80 : `external_media_address` et `external_signaling_address` pour transport-udp
- Ligne 84 : `external_media_address` et `external_signaling_address` pour transport-wss

### 4️⃣ Lancer Docker Compose

```bash
# Depuis le dossier asterisk-pgsql
docker-compose up -d

# Vérifier que les 3 conteneurs tournent
docker-compose ps
```

**Sortie attendue :**
```
       Name                     Command               State                    Ports
--------------------------------------------------------------------------------------------------------
asterisk-pgsql_api_1        node index.js                Up      0.0.0.0:3000->3000/tcp
asterisk-pgsql_asterisk_1   /docker-entrypoint.sh ...    Up      5038, 0.0.0.0:5060->5060/udp, etc.
asterisk-pgsql_db_1         docker-entrypoint.sh ...     Up      0.0.0.0:5432->5432/tcp
```

### 5️⃣ Vérifier le fonctionnement



#### A. Vérifier Asterisk

```bash
# Accéder au CLI Asterisk
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rvvv

# Dans le CLI Asterisk, vérifier :
pjsip show endpoints         # Doit montrer 101, 102, trunk_operateur_endpoint
pjsip show transports        # Doit montrer transport-udp et transport-wss
pjsip show registrations     # Doit montrer trunk_operateur_reg
dialplan show client-a-context  # Doit montrer les extensions 1XX, 800, 801, *65, etc.
queue show support_queue     # Doit montrer la queue avec agents 101 et 102
odbc show all                # Doit montrer "asterisk" connecté
```

#### B. Vérifier PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it asterisk-pgsql_db_1 psql -U asterisk -d asterisk

# Requêtes de vérification
SELECT id, context FROM ps_endpoints;
SELECT name, strategy FROM queues;
SELECT queue_name, interface FROM queue_members;
SELECT context, exten, priority, app FROM extensions ORDER BY context, exten, priority;
\q
```

#### C. Vérifier l'API

```bash
# Tester l'endpoint health
curl http://localhost:3000/api/health

# Lister les tenants
curl http://localhost:3000/api/tenants

# Lister les endpoints
curl http://localhost:3000/api/endpoints
```

---

## 🧪 Tests fonctionnels

### Test 1 : Enregistrement WebRTC

1. Ouvrir `web_phone.html` dans Chrome/Firefox
2. Configurer :
   - **WebSocket URI** : `wss://VOTRE_IP:8089/ws`
   - **SIP URI** : `sip:101@VOTRE_IP`
   - **Password** : `password101`
3. Cliquer sur "Register"
4. **Résultat attendu** : "Registered"

### Test 2 : Appel entre 101 et 102

1. Enregistrer deux clients WebRTC (101 et 102)
2. Depuis 101, appeler `102`
3. **Résultat attendu** : 102 sonne, peut répondre, conversation bidirectionnelle

### Test 3 : Appel vers la queue

1. Depuis 101, appeler `800`
2. **Résultat attendu** : Entrer dans `support_queue`, le téléphone de 102 sonne
3. 102 répond → conversation établie

### Test 4 : Appel entrant du trunk

1. Appeler le numéro business : **+22954150000**
2. **Résultat attendu** :
   - Asterisk reçoit l'appel du trunk 197.234.218.195
   - L'appel entre dans `from-trunk` context
   - Redirection vers `support_queue`
   - Les agents 101 et 102 sonnent

---

## 📊 Surveillance

### Logs Asterisk

```bash
# Logs en temps réel
docker logs -f asterisk-pgsql_asterisk_1

# Logs PJSIP
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip set logger on"
```

### Logs PostgreSQL

```bash
docker logs -f asterisk-pgsql_db_1
```

### Logs API

```bash
docker logs -f asterisk-pgsql_api_1
```

---

## 🛠️ Dépannage

### Problème : 101 ne peut pas appeler 102

**Vérifier :**
```bash
# Endpoints enregistrés ?
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show contacts"

# Dialplan chargé ?
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "dialplan show client-a-context"
```

**Solution :** Si le dialplan est vide, vérifier que PostgreSQL est connecté :
```bash
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "odbc show all"
# Doit montrer : asterisk  [Connected]
```

### Problème : Trunk ne s'enregistre pas

**Vérifier :**
```bash
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "pjsip show registrations"
```

**Solution :**
- Vérifier les credentials dans `init.sql` (62908521 / 167d458f-8)
- Vérifier que le port 25060 est accessible :
```bash
docker exec -it asterisk-pgsql_asterisk_1 ping -c 3 197.234.218.195
```

### Problème : WebRTC ne se connecte pas (SSL)

**Vérifier :**
```bash
# Certificats présents ?
docker exec -it asterisk-pgsql_asterisk_1 ls -la /etc/asterisk/keys/

# HTTP/WSS activé ?
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "http show status"
```

**Solution :**
- Régénérer les certificats avec `generate-ssl-certs.sh`
- Redémarrer Asterisk : `docker-compose restart asterisk`

### Problème : Pas de son (RTP)

**Vérifier :**
- Ports RTP ouverts : 10000-10200 UDP
- NAT configuré : `external_media_address` dans `init.sql`

```bash
# Tester RTP
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rx "rtp set debug on"
```

---

## 🎯 Configuration multi-tenant

### Ajouter un nouveau client (Tenant 3)

```sql
-- Se connecter à PostgreSQL
docker exec -it asterisk-pgsql_db_1 psql -U asterisk -d asterisk

-- Créer le tenant
INSERT INTO tenants (id, name) VALUES (3, 'Client C - Société Gamma');

-- Créer des endpoints (301, 302)
INSERT INTO ps_endpoints (id, tenant_id, transport, aors, auth, context, disallow, allow, webrtc, use_avpf, media_encryption, dtls_verify, dtls_cert_file, dtls_private_key, dtls_setup, ice_support, rtp_symmetric, force_rport, rewrite_contact)
VALUES ('301', 3, 'transport-wss', '301', '301', 'client-c-context', 'all', 'opus,ulaw,alaw,g722', 'yes', 'yes', 'dtls', 'fingerprint', '/etc/asterisk/keys/fullchain.pem', '/etc/asterisk/keys/privkey.pem', 'actpass', 'yes', 'yes', 'yes', 'yes');

INSERT INTO ps_auths (id, tenant_id, auth_type, password, username)
VALUES ('301', 3, 'userpass', 'password301', '301');

INSERT INTO ps_aors (id, tenant_id, max_contacts)
VALUES ('301', 3, 5);

-- Ajouter dialplan
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata)
VALUES
(3, 'client-c-context', '_3XX', 1, 'NoOp', 'Appel interne vers ${EXTEN}'),
(3, 'client-c-context', '_3XX', 2, 'Dial', 'PJSIP/${EXTEN},30,TtWw'),
(3, 'client-c-context', '_3XX', 3, 'Hangup', '');
```

Puis ajouter `[client-c-context]` dans `extensions.conf`.

---

## 📞 Informations de connexion

### Extensions WebRTC (Client A)

| Extension | Password | Context | Queues |
|-----------|----------|---------|--------|
| 101 | password101 | client-a-context | support_queue, sales_queue |
| 102 | password102 | client-a-context | support_queue, sales_queue |

### SIP Trunk

| Paramètre | Valeur |
|-----------|--------|
| Username | 62908521 |
| Password | 167d458f-8 |
| SIP Server | 197.234.218.195:25060 |
| Protocol | UDP |
| Codec | alaw, ulaw |
| Numéro DID | +22954150000 |

### Codes spéciaux

| Code | Fonction |
|------|----------|
| 800 | Entrer dans support_queue |
| 801 | Entrer dans sales_queue |
| *65 | Messagerie vocale |
| *66 | Mettre en pause (agent) |
| *67 | Reprendre service (agent) |
| *68 | Statistiques de la queue |

---

## ✅ Checklist finale

- [ ] Certificats SSL générés
- [ ] IP publique configurée dans `init.sql`
- [ ] Docker Compose démarré (`docker-compose ps` OK)
- [ ] Asterisk connecté à PostgreSQL (`odbc show all`)
- [ ] Endpoints visibles (`pjsip show endpoints`)
- [ ] Trunk enregistré (`pjsip show registrations`)
- [ ] Queues configurées (`queue show support_queue`)
- [ ] Dialplan chargé (`dialplan show client-a-context`)
- [ ] Test appel 101 → 102 réussi
- [ ] Test appel vers queue 800 réussi

---

## 🎉 Résultat attendu

Après ces 5 étapes, vous aurez :

- ✅ **2 extensions WebRTC** (101, 102) qui peuvent s'appeler
- ✅ **2 files d'attente** (support, ventes) opérationnelles
- ✅ **1 trunk SIP** enregistré et recevant les appels
- ✅ **Appels entrants** redirigés vers les agents
- ✅ **Multi-tenant** complètement isolé
- ✅ **API REST** pour administration
- ✅ **Dashboard React** pour supervision

**Vous pouvez maintenant appeler +22954150000, l'appel arrivera sur 101 et 102 ! 🎊**
