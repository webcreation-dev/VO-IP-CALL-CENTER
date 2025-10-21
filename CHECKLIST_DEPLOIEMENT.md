# ✅ CHECKLIST DE DÉPLOIEMENT

## 📋 Avant le déploiement

### Configuration locale

- [ ] Projet cloné sur le VPS
- [ ] Docker installé (`docker --version`)
- [ ] Docker Compose installé (`docker-compose --version`)
- [ ] Ports vérifiés disponibles (5060, 8089, 10000-10200)
- [ ] IP publique VPS récupérée (`curl ifconfig.me`)

### Fichiers de configuration

- [ ] `init.sql` modifié avec IP publique (lignes 80, 84)
- [ ] Certificats SSL générés (`./generate-ssl-certs.sh`)
- [ ] `.env` créé à partir de `.env.example`
- [ ] Mots de passe changés dans `.env`

---

## 🚀 Déploiement

### Étape 1 : Préparation

```bash
cd /path/to/asterisk/asterisk-pgsql
```

- [ ] Dans le bon répertoire
- [ ] Fichiers présents : `docker-compose.yml`, `init.sql`, `schema.sql`

### Étape 2 : Certificats SSL

```bash
sudo ./generate-ssl-certs.sh
```

- [ ] Script exécuté sans erreur
- [ ] Fichiers créés : `/etc/asterisk/keys/privkey.pem` et `fullchain.pem`
- [ ] Permissions correctes (600 pour privkey, 644 pour fullchain)

### Étape 3 : IP publique

```bash
nano init.sql
# Chercher : 161.97.106.134
# Remplacer par : VOTRE_IP_PUBLIQUE
```

- [ ] Ligne 80 modifiée (transport-udp)
- [ ] Ligne 84 modifiée (transport-wss)
- [ ] Fichier sauvegardé

### Étape 4 : Lancement Docker

```bash
docker-compose up -d
```

- [ ] Commande exécutée sans erreur
- [ ] 3 conteneurs démarrés (asterisk, db, api)
- [ ] Vérification : `docker-compose ps`

### Étape 5 : Vérification

```bash
cd ..
./verify-install.sh
```

- [ ] Script de vérification exécuté
- [ ] Tous les tests en vert ✅
- [ ] Pas d'erreurs critiques ⚠️

---

## 🔍 Vérifications détaillées

### PostgreSQL

```bash
docker exec -it asterisk-pgsql_db_1 psql -U asterisk -d asterisk
```

**Requêtes SQL :**

```sql
-- Vérifier tenants
SELECT * FROM tenants;
```
- [ ] 2 tenants affichés (Client A, Client B)

```sql
-- Vérifier endpoints
SELECT id, context FROM ps_endpoints;
```
- [ ] 4+ endpoints (101, 102, 201, 202, trunk_operateur_endpoint)

```sql
-- Vérifier queues
SELECT name, strategy FROM queues;
```
- [ ] 2 queues (support_queue, sales_queue)

```sql
-- Vérifier queue members
SELECT queue_name, interface FROM queue_members;
```
- [ ] 2 membres (PJSIP/101, PJSIP/102 dans support_queue)

```sql
-- Vérifier dialplan
SELECT COUNT(*) FROM extensions;
```
- [ ] 30+ lignes de dialplan

```sql
\q  -- Quitter
```

### Asterisk CLI

```bash
docker exec -it asterisk-pgsql_asterisk_1 asterisk -rvvv
```

**Commandes Asterisk :**

```
odbc show all
```
- [ ] Affiche : `asterisk  [Connected]`

```
pjsip show endpoints
```
- [ ] 101 : Unavailable (normal si non enregistré)
- [ ] 102 : Unavailable
- [ ] trunk_operateur_endpoint : Unavailable/Available

```
pjsip show transports
```
- [ ] transport-udp : UDP 0.0.0.0:5060
- [ ] transport-wss : WSS 0.0.0.0:8089

```
pjsip show registrations
```
- [ ] trunk_operateur_reg affiché

```
queue show
```
- [ ] support_queue : 0 calls, 2 members
- [ ] sales_queue : 0 calls, 0 members

```
dialplan show client-a-context
```
- [ ] Extensions _1XX, 800, 801, *65, *66, *67, *68 affichées

```
core show channels
```
- [ ] 0 active channels (normal au démarrage)

```
exit  -- Quitter CLI
```

### API Node.js

```bash
# Health check
curl http://localhost:3000/api/health
```
- [ ] Réponse : `{"status":"ok",...}`

```bash
# Tenants
curl http://localhost:3000/api/tenants
```
- [ ] Réponse : JSON avec 2 tenants

```bash
# Endpoints
curl http://localhost:3000/api/endpoints
```
- [ ] Réponse : JSON avec endpoints

### Réseau

```bash
# Ports en écoute
netstat -tuln | grep -E ':(5060|8089|3000|5432)'
```
- [ ] 5060 UDP en écoute
- [ ] 8089 TCP en écoute
- [ ] 3000 TCP en écoute
- [ ] 5432 TCP en écoute

```bash
# Firewall (si configuré)
sudo ufw status
```
- [ ] 5060/udp ALLOW
- [ ] 8089/tcp ALLOW
- [ ] 10000:10200/udp ALLOW
- [ ] 3000/tcp ALLOW (si API publique)

---

## 🧪 Tests fonctionnels

### Test 1 : Enregistrement WebRTC (Extension 101)

1. Ouvrir `web_phone.html` dans Chrome/Firefox
2. Configurer :
   - **WebSocket URI** : `wss://VOTRE_IP:8089/ws`
   - **SIP URI** : `sip:101@VOTRE_IP`
   - **Password** : `password101`
3. Cliquer "Register"

- [ ] Statut : "Registered" affiché
- [ ] Pas d'erreurs dans la console navigateur
- [ ] Dans Asterisk CLI : `pjsip show contacts` affiche 101

### Test 2 : Enregistrement Extension 102

1. Ouvrir une deuxième fenêtre/onglet `web_phone.html`
2. Configurer :
   - **WebSocket URI** : `wss://VOTRE_IP:8089/ws`
   - **SIP URI** : `sip:102@VOTRE_IP`
   - **Password** : `password102`
3. Cliquer "Register"

- [ ] Statut : "Registered" affiché
- [ ] Dans Asterisk CLI : `pjsip show contacts` affiche 101 et 102

### Test 3 : Appel interne 101 → 102

1. Depuis fenêtre 101, composer `102`
2. Cliquer "Call"
3. Dans fenêtre 102, bouton "Answer" apparaît
4. Cliquer "Answer"

- [ ] Appel établi
- [ ] Audio bidirectionnel fonctionnel
- [ ] Pas de coupure après 3 secondes
- [ ] Dans Asterisk CLI : `core show channels` affiche 2 channels

### Test 4 : Appel vers file d'attente

1. Depuis 101, raccrocher appel en cours
2. Composer `800`
3. Cliquer "Call"
4. Le téléphone 102 sonne

- [ ] Message d'attente joué (queue-thankyou)
- [ ] 102 reçoit l'appel
- [ ] 102 peut répondre
- [ ] Conversation établie

### Test 5 : Codes spéciaux

**Test *66 (Pause agent) :**
1. Depuis 101, composer `*66`
- [ ] Message "agent-paused" joué

**Test *67 (Reprise service) :**
1. Depuis 101, composer `*67`
- [ ] Message "agent-unpaused" joué

**Test *68 (Statistiques) :**
1. Depuis 101, composer `*68`
- [ ] Nombre d'appels en attente annoncé

### Test 6 : Appel entrant du trunk (SI CONFIGURÉ)

1. Depuis un téléphone externe, appeler `+22954150000`
2. Observer comportement

- [ ] Asterisk reçoit l'appel (logs)
- [ ] Appel entre dans contexte `from-trunk`
- [ ] Redirection vers `support_queue`
- [ ] Les agents 101 et 102 sonnent
- [ ] Un agent peut répondre

---

## 🔐 Sécurité (PRODUCTION)

### Mots de passe

- [ ] Mot de passe PostgreSQL changé (`Obelix` → fort)
- [ ] Mot de passe AMI changé (`Sp33Dd14L` → fort)
- [ ] Passwords endpoints changés (password101, password102 → forts)
- [ ] Secrets JWT/Session générés (`.env`)

### Certificats SSL

- [ ] Let's Encrypt configuré (production)
- [ ] Renouvellement automatique activé
- [ ] Certificats auto-signés supprimés (production)

### Firewall

```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 5060/udp     # SIP
sudo ufw allow 8089/tcp     # WSS
sudo ufw allow 10000:10200/udp  # RTP
sudo ufw enable
```

- [ ] Firewall configuré
- [ ] Règles appliquées
- [ ] Connexion SSH toujours accessible

### Fail2ban

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

- [ ] Fail2ban installé
- [ ] Jail Asterisk configuré
- [ ] Service démarré

---

## 📊 Monitoring

### Logs

```bash
# Logs Asterisk en temps réel
docker logs -f asterisk-pgsql_asterisk_1
```
- [ ] Pas d'erreurs critiques
- [ ] Connexions PJSIP visibles
- [ ] Appels enregistrés

```bash
# Logs PostgreSQL
docker logs -f asterisk-pgsql_db_1
```
- [ ] Connexions ODBC visibles
- [ ] Requêtes SQL correctes

```bash
# Logs API
docker logs -f asterisk-pgsql_api_1
```
- [ ] API démarrée sur port 3000
- [ ] Connexion DB OK

### Ressources système

```bash
docker stats
```
- [ ] CPU < 50% (en charge normale)
- [ ] RAM < 80%
- [ ] Pas de restart continu

---

## 💾 Sauvegarde

### Backup PostgreSQL

```bash
# Créer backup
docker exec asterisk-pgsql_db_1 pg_dump -U asterisk asterisk > backup_$(date +%Y%m%d).sql
```
- [ ] Fichier backup créé
- [ ] Taille cohérente (> 50KB)

### Backup configuration

```bash
# Archiver configuration
tar -czf config_backup_$(date +%Y%m%d).tar.gz asterisk-pgsql/etc/asterisk/
```
- [ ] Archive créée
- [ ] Tous les fichiers inclus

### Planification sauvegardes

```bash
# Cron quotidien à 2h du matin
crontab -e
# Ajouter : 0 2 * * * /path/to/backup_script.sh
```
- [ ] Cron configuré
- [ ] Script de backup testé
- [ ] Rétention configurée (30 jours)

---

## 📝 Documentation

### Fichiers présents

- [ ] `README.md` - Documentation principale
- [ ] `DEPLOIEMENT_RAPIDE.md` - Guide déploiement
- [ ] `CORRECTIONS_APPLIQUEES.md` - Détails techniques
- [ ] `RESUME_FINAL.md` - Résumé complet
- [ ] `CHECKLIST_DEPLOIEMENT.md` - Cette checklist
- [ ] `.env.example` - Template variables

### Procédures documentées

- [ ] Procédure ajout tenant
- [ ] Procédure ajout extension
- [ ] Procédure configuration trunk
- [ ] Procédure backup/restore
- [ ] Procédure mise à jour

---

## ✅ VALIDATION FINALE

### Système opérationnel

- [ ] Tous les conteneurs Docker UP
- [ ] PostgreSQL connecté (ODBC)
- [ ] Endpoints chargés depuis DB
- [ ] Trunk configuré et identifié
- [ ] Queues opérationnelles
- [ ] Dialplan chargé
- [ ] API REST accessible

### Tests réussis

- [ ] Enregistrement WebRTC 101 ✅
- [ ] Enregistrement WebRTC 102 ✅
- [ ] Appel interne 101 → 102 ✅
- [ ] Appel vers queue 800 ✅
- [ ] Codes spéciaux (*66, *67, *68) ✅
- [ ] Appels entrants trunk ✅

### Sécurité appliquée

- [ ] Mots de passe changés
- [ ] Firewall configuré
- [ ] Certificats SSL valides
- [ ] Fail2ban actif

### Documentation complète

- [ ] Guide déploiement lu
- [ ] Procédures comprises
- [ ] Scripts testés
- [ ] Équipe formée

---

## 🎉 SYSTÈME PRÊT POUR PRODUCTION

Si toutes les cases sont cochées ✅, le système est **OPÉRATIONNEL** !

**Date de mise en production** : _______________

**Validé par** : _______________

**Prochaine revue** : _______________

---

## 📞 CONTACT SUPPORT

En cas de problème :

1. Consulter `DEPLOIEMENT_RAPIDE.md` - Section Dépannage
2. Vérifier les logs : `docker logs -f asterisk-pgsql_asterisk_1`
3. Lancer : `./verify-install.sh`
4. Vérifier PostgreSQL : `odbc show all` dans CLI Asterisk

---

**Bonne chance pour votre déploiement ! 🚀**
