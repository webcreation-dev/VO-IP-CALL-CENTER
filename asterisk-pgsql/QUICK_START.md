# 🚀 Guide de Démarrage Rapide

## ⚡ Installation Express (5 minutes)

### 1️⃣ Déployer la Configuration

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/asterisk-pgsql

# Exécuter le script de déploiement
./DEPLOY.sh
```

**C'est tout !** Le script configure automatiquement :

- ✅ Les queues en base de données
- ✅ Les tables d'enregistrement
- ✅ Les répertoires nécessaires
- ✅ Le rechargement Asterisk

---

## 🧪 Tests Rapides

### Test 1 : Appel Direct (30 secondes)

1. Ouvrir `web_phone.html` dans **Chrome** ou **Firefox**
2. Se connecter avec :
   - **Utilisateur** : `101`
   - **Mot de passe** : `password101`
3. Ouvrir un **2ème onglet** avec :
   - **Utilisateur** : `102`
   - **Mot de passe** : `password102`
4. Depuis 101, appeler **102**
5. Une popup apparaît sur 102 avec **sonnerie** 🔔
6. Cliquer sur **"Répondre"**
7. ✅ **Les deux peuvent se parler !**

**Résultat attendu :**

- 📞 Sonnerie audible
- 💬 Conversation claire
- 🎛️ Boutons de contrôle fonctionnels

---

### Test 2 : File d'Attente (1 minute)

**Depuis l'utilisateur 101 :**

1. Appeler l'extension **800**
2. Entendre le message de bienvenue
3. 🎵 Musique d'attente

4. L'appel sonne chez l'agent 102

**Alternative - Depuis CLI Asterisk :**

```bash
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rvvv
```

Puis dans la CLI :

```
originate PJSIP/101 extension 800@client-a-context
```

**Résultat attendu :**

- 🎵 Musique d'attente
- 📊 Position dans la queue annoncée
- 📞 Distribution aux agents disponibles

**Vérifier la queue :**

```bash
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "queue show support_queue"
```

---

### Test 3 : Transfert d'Appel (2 minutes)

1. **101** appelle **102**
2. **102** répond
3. Pendant l'appel, **102** compose **#1** puis **103**
4. L'appel de 101 est transféré à 103 (transfert aveugle)

**Ou transfert accompagné :**

1. **102** compose **\*2** puis **103**
2. **102** parle à 103
3. **102** compose **\*2** à nouveau
4. L'appel est transféré

**Résultat attendu :**

- 🔄 Transfert fonctionnel
- 🎯 Appel arrive au bon destinataire

---

### Test 4 : Appel Entrant du Trunk (avec IVR)

**Appeler le numéro business configuré :**

Le flux devrait être :

1. 🎤 Message d'accueil (IVR)
2. 🔢 Menu :
   - Appuyez sur **1** pour le support
   - Appuyez sur **2** pour les ventes
   - Appuyez sur **3** pour la comptabilité
3. Selon le choix :
   - **1** → `support_queue` (agents 101, 102)
   - **2** → `sales_queue`
   - **3** → Extension 103 directement

**Résultat attendu :**

- 🎤 IVR fonctionnel
- 🔀 Routage correct
- 📞 Appel distribué aux agents

---

### Test 5 : Vérifier les CDR (30 secondes)

```bash
# Se connecter à PostgreSQL
docker exec -it asterisk-pgsql-db-1 psql -U asterisk -d asterisk
```

```sql
-- Voir les 10 derniers appels
SELECT
    caller,
    called,
    start_time,
    billable_duration,
    disposition,
    has_recording
FROM v_call_history
ORDER BY start_time DESC

LIMIT 10;

-- Statistiques du jour
SELECT * FROM v_call_statistics
WHERE call_date = CURRENT_DATE;

-- Statistiques des queues
SELECT * FROM v_queue_statistics
WHERE call_date = CURRENT_DATE;
```

**Résultat attendu :**

- 📊 Tous les appels enregistrés
- ⏱️ Durées correctes
- ✅ Dispositions précises (ANSWERED, NO ANSWER, etc.)

---

## 🐛 Dépannage Express

### Problème : Les queues n'apparaissent pas

```bash
# Vérifier la connexion à la base
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "realtime load queues support_queue"

# Recharger les queues
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "module reload app_queue.so"

# Voir les queues
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "queue show"
```

### Problème : Pas de musique d'attente

```bash
# Vérifier les classes MOH
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "moh show"

# Ajouter un fichier audio test
docker exec -it asterisk-pgsql-asterisk-1 bash
cd /var/lib/asterisk/moh/
# Copier vos fichiers WAV ici (mono, 8000Hz)
```

### Problème : web_phone.html ne se connecte pas

1. Vérifier que le port **8089** est ouvert
2. Vérifier les certificats SSL dans `pjsip.conf`
3. Ouvrir la console navigateur (F12) pour voir les erreurs
4. Vérifier que l'endpoint 101 existe en base :

```sql
SELECT * FROM ps_endpoints WHERE id = '101';
SELECT * FROM ps_auths WHERE id = '101';
SELECT * FROM ps_aors WHERE id = '101';
```

### Problème : CDR ne s'enregistre pas

```bash
# Vérifier le statut CDR
docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "cdr status"

# Recharger le module CDR

docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "module reload cdr_pgsql.so"

# Vérifier les logs
docker logs asterisk-pgsql-asterisk-1 | grep CDR
```

---

## 📱 Scénario Complet (5 minutes)

### Simulation d'un centre d'appels

**Préparation :**

1. Ouvrir 3 onglets `web_phone.html`
   - Onglet 1 : User **101** (Agent Support)
   - Onglet 2 : User **102** (Agent Support)
   - Onglet 3 : User **103** (Comptabilité)

**Scénario :**

1. **Appel entrant** (simulé) :

   ```bash
   docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "channel originate Local/s@from-trunk extension s@from-trunk"
   ```

2. **IVR** joue le message

3. **Client appuie sur 1** (support)

4. **Queue support_queue** :

   - Musique d'attente
   - Annonce de position

5. **Agent 101 ou 102** reçoit l'appel

   - Popup avec sonnerie
   - Clique sur "Répondre"

6. **Conversation** entre client et agent

7. **Agent décide de transférer** :

   - Compose **\*2** (transfert accompagné)
   - Compose **103**
   - Parle avec 103
   - Compose **\*2** à nouveau
   - Appel transféré

8. **Agent se met en pause** :

   - Compose **\*66**
   - Message de confirmation

9. **Vérification finale** :

   ```bash
   # Voir les stats de la queue
   docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "queue show support_queue"

   # Voir les CDR
   docker exec -it asterisk-pgsql-db-1 psql -U asterisk -d asterisk -c "SELECT * FROM v_call_history ORDER BY start_time DESC LIMIT 5;"
   ```

---

## 📊 Dashboard Simple (via SQL)

```sql
-- Vue d'ensemble du jour
SELECT
    'Total Appels' AS metrique,
    COUNT(*)::text AS valeur
FROM cdr
WHERE DATE(calldate) = CURRENT_DATE

UNION ALL

SELECT
    'Appels Répondus',
    COUNT(*)::text
FROM cdr
WHERE DATE(calldate) = CURRENT_DATE
  AND disposition = 'ANSWERED'

UNION ALL

SELECT
    'Appels Manqués',
    COUNT(*)::text
FROM cdr
WHERE DATE(calldate) = CURRENT_DATE
  AND disposition = 'NO ANSWER'

UNION ALL

SELECT
    'Durée Totale (minutes)',
    (SUM(billsec)/60)::text
FROM cdr
WHERE DATE(calldate) = CURRENT_DATE

UNION ALL

SELECT
    'Durée Moyenne (secondes)',
    ROUND(AVG(billsec))::text
FROM cdr
WHERE DATE(calldate) = CURRENT_DATE
  AND disposition = 'ANSWERED';
```

---

## 🎯 Objectifs Atteints

Après ces tests, vous aurez validé :

- ✅ **Appels directs** entre utilisateurs
- ✅ **Files d'attente** avec musique
- ✅ **IVR** avec menu vocal

- ✅ **Transferts** (aveugle et accompagné)
- ✅ **Enregistrement CDR** complet
- ✅ **Sonnerie** sur le client WebRTC
- ✅ **Multi-agents** dans les queues
- ✅ **Statistiques** en temps réel

---

## 🚀 Étapes Suivantes

1. **Personnaliser l'IVR** :

   - Enregistrer vos propres messages
   - Les convertir en WAV (8000Hz, mono)
   - Les placer dans `/var/lib/asterisk/sounds/custom/`

2. **Ajouter plus d'agents** :

   ```sql
   INSERT INTO queue_members (queue_name, interface, uniqueid, membername, penalty, paused)
   VALUES ('support_queue', 'PJSIP/103', 3, 'Agent 103', 0, 0);
   ```

3. **Créer des rapports** :

   - Utiliser les vues SQL
   - Exporter en CSV
   - Intégrer à votre dashboard

4. **Configurer les horaires** :

   - Modifier `extensions.conf`
   - Ajouter des conditions GotoIfTime()

5. **Monitoring en temps réel** :

   ```bash
   watch -n 2 "docker exec asterisk-pgsql-asterisk-1 asterisk -rx 'queue show'"
   ```

---

## 📖 Documentation Complète

- **README_DEPLOYMENT.md** : Guide de déploiement détaillé
- **CONFIGURATION_SUMMARY.md** : Résumé de toute la configuration
- **DEPLOY.sh** : Script de déploiement automatique

---

**🎉 Félicitations ! Votre système est opérationnel ! 🎉**

Pour toute question, consultez les logs :

```bash
docker logs asterisk-pgsql-asterisk-1 -f
```
