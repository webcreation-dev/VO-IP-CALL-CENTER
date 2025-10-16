# 🚀 GUIDE DE DÉPLOIEMENT COMPLET - AUTOMATISÉ

## ✅ **CE QUI A ÉTÉ AUTOMATISÉ**

Toute la configuration se fait automatiquement au démarrage des conteneurs :

- ✅ Création des répertoires (moh, sounds, monitor)
- ✅ Permissions automatiques
- ✅ Queues créées en base de données
- ✅ Tables d'enregistrement créées
- ✅ Vues SQL pour statistiques

**VOUS N'AVEZ PLUS RIEN À FAIRE MANUELLEMENT !**

---

## 📦 **DÉPLOIEMENT EN 3 COMMANDES**

### **1️⃣ Sur votre Mac (local)**

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk
git add .
git commit -m "Configuration complète automatisée"
git push origin release-tenant
```

### **2️⃣ Sur le VPS**

```bash
cd ~/VO-IP-CALL-CENTER/asterisk-pgsql
git pull origin release-tenant
```

### **3️⃣ Rebuild et Redémarrage**

```bash
# Rebuild le conteneur Asterisk avec les nouvelles configs
sudo docker compose build asterisk

# Redémarrer tout
sudo docker compose down
sudo docker compose up -d

# Attendre 15 secondes que tout démarre
sleep 15
```

**✨ C'EST TOUT ! Le système est opérationnel.**

---

## 🧪 **TESTS - COMMENT ÇA MARCHE**

### **Test 1 : Appel Direct (101 → 102)**

**Scénario :**

1. Ouvrir `https://pishon.kabou.bj/web_phone.html` - Onglet 1
2. Se connecter : User `101` / Password `password101`
3. Ouvrir un 2ème onglet - Onglet 2
4. Se connecter : User `102` / Password `password102`

**Action :** 5. Depuis l'onglet 1 (101), appeler `102`

**Résultats attendus :**

- ✅ **101 (appelant)** entend une **tonalité de retour** (bip long toutes les 4 sec)
- ✅ **102 (appelé)** voit une **popup "Répondre/Rejeter"**
- ✅ **102 (appelé)** entend une **sonnerie** (2 bips courts toutes les 4 sec)
- ✅ 102 clique sur "Répondre"
- ✅ Les deux peuvent se parler clairement

---

### **Test 2 : File d'Attente 800**

**Scénario :**

1. User `101` connecté sur l'onglet 1
2. User `102` connecté sur l'onglet 2

**Action :** 3. Depuis l'onglet 1 (101), appeler `800`

**Ce qui se passe :**

```
101 appelle 800
    ↓
Extension 800 = File d'attente support_queue
    ↓
Asterisk cherche un agent disponible dans support_queue
    ↓
Agents disponibles : 101 et 102
    ↓
101 est l'appelant, donc il ne peut pas se répondre lui-même
    ↓
Asterisk appelle 102
    ↓
102 reçoit l'appel
```

**Résultats attendus :**

- ✅ **101** entend : "Merci de patienter" (si fichier audio présent) puis SILENCE ou musique d'attente
- ✅ **102** reçoit une **popup "Répondre/Rejeter"** avec sonnerie
- ✅ 102 clique sur "Répondre"
- ✅ 101 et 102 peuvent se parler

**IMPORTANT :**

- Si 101 entend directement la voix de 102, c'est que 102 a déjà répondu
- La file d'attente fonctionne : elle distribue l'appel au premier agent disponible

---

### **Test 3 : File d'Attente avec 2 Appelants**

**Scénario :**

1. Ouvrir 3 onglets :
   - Onglet 1 : User `101`
   - Onglet 2 : User `102`
   - Onglet 3 : User `103` (si configuré) ou utiliser CLI

**Action :**

```bash
# Simuler un appel externe vers la queue depuis le VPS
sudo docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "channel originate Local/800@client-a-context application MusicOnHold"
```

**Pendant que l'appel externe est en attente :** 4. Depuis l'onglet 1 (101), appeler `800`

**Résultats attendus :**

- ✅ Le 1er appelant est mis en attente avec musique
- ✅ Le 2ème appelant (101) est aussi mis en attente
- ✅ Quand 102 décroche, il prend le **premier** appel de la file
- ✅ Le 2ème appelant reste en attente jusqu'à ce qu'un agent se libère

---

### **Test 4 : Transferts d'Appels**

#### **Transfert Aveugle (#1)**

**Scénario :**

1. **101** appelle **102**
2. **102** répond
3. Pendant la conversation, **102** veut transférer à **103**

**Action sur le téléphone de 102 :**

```
Composer : #1103#
```

**Résultat :**

- ✅ L'appel de 101 est immédiatement transféré à 103
- ✅ 102 est déconnecté de l'appel
- ✅ 101 et 103 peuvent maintenant parler

---

#### **Transfert Accompagné (\*2)**

**Scénario :**

1. **101** appelle **102**
2. **102** répond
3. **102** veut parler à **103** avant de transférer

**Action sur le téléphone de 102 :**

```
1. Composer : *2
2. Attendre la tonalité
3. Composer : 103
4. 103 répond
5. 102 parle avec 103 (101 en attente)
6. Composer : *2 à nouveau pour finaliser le transfert
```

**Résultat :**

- ✅ 102 peut expliquer le contexte à 103
- ✅ Après \*2 final, 101 est transféré à 103
- ✅ 102 est déconnecté

---

### **Test 5 : Vérifier les Queues**

```bash
# Voir l'état des queues
sudo docker exec -it asterisk-pgsql-asterisk-1 asterisk -rx "queue show"
```

**Résultat attendu :**

```
support_queue has 0 calls (max unlimited) in 'ringall' strategy (0s holdtime, 0s talktime), W:0, C:0, A:0, SL:0.0%, SL2:0.0% within 0s
   Members:
      PJSIP/101 (ringinuse disabled) (dynamic) (Not in use) has taken no calls yet
      PJSIP/102 (ringinuse disabled) (dynamic) (Not in use) has taken no calls yet
   No Callers
```

✅ Si vous voyez cela, les queues fonctionnent !

---

### **Test 6 : Vérifier les CDR**

```bash
# Se connecter à PostgreSQL
sudo docker exec -it asterisk-pgsql-db-1 psql -U asterisk -d asterisk
```

```sql
-- Voir les derniers appels
SELECT
    caller,
    called,
    start_time,
    billable_duration,
    disposition
FROM v_call_history
ORDER BY start_time DESC
LIMIT 10;
```

**Résultat attendu :**
Vous devez voir tous vos appels de test avec leurs durées.

---

## 🔧 **DÉPANNAGE**

### **Problème : Queue n'existe pas**

```bash
# Vérifier en base de données
sudo docker exec -it asterisk-pgsql-db-1 psql -U asterisk -d asterisk -c "SELECT name FROM queues;"
```

Si vide :

```bash
# Réappliquer le script (conteneur doit tourner)
sudo docker exec -i asterisk-pgsql-db-1 psql -U asterisk -d asterisk < ~/VO-IP-CALL-CENTER/asterisk-pgsql/init_complete.sql
```

---

### **Problème : Pas de son dans la queue**

C'est normal ! Par défaut, il n'y a pas de fichiers audio. Pour ajouter de la musique :

```bash
# Copier un fichier audio dans le conteneur
sudo docker cp musique.wav asterisk-pgsql-asterisk-1:/var/lib/asterisk/moh/

# Vérifier
sudo docker exec -it asterisk-pgsql-asterisk-1 ls -l /var/lib/asterisk/moh/
```

---

### **Problème : WebRTC ne se connecte pas**

1. Vérifier que le port 8089 est ouvert
2. Vérifier les certificats SSL :

```bash
sudo docker exec -it asterisk-pgsql-asterisk-1 ls -l /etc/asterisk/keys/
```

3. Ouvrir la console navigateur (F12) pour voir les erreurs

---

## 📚 **COMPRENDRE LES FILES D'ATTENTE**

### **Comment ça marche ?**

```
┌─────────────────────────────────────────┐
│  Appel entrant vers extension 800      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Dialplan: exten => 800                  │
│  - Answer()                              │
│  - Queue(support_queue,t)                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  File d'attente: support_queue           │
│  - Stratégie: ringall (tous sonnent)    │
│  - Musique d'attente: default            │
│  - Membres: 101, 102                     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Distribution aux agents disponibles     │
│  - Si 101 et 102 libres → sonnent tous  │
│  - Le premier qui répond prend l'appel  │
│  - L'autre arrête de sonner              │
└──────────────────────────────────────────┘
```

### **Stratégies de distribution**

- **ringall** : Tous les agents sonnent en même temps (par défaut)
- **rrmemory** : Round-robin (chacun son tour)
- **leastrecent** : L'agent qui a le moins récemment pris un appel
- **fewestcalls** : L'agent avec le moins d'appels

---

## 🎯 **RÉSUMÉ : CE QUE VOUS DEVEZ FAIRE**

### **Après git pull + docker-compose up -d :**

**RIEN ! Tout est automatique.**

### **Pour tester :**

1. ✅ Ouvrir web_phone.html
2. ✅ Se connecter avec 101 et 102
3. ✅ Appeler 800
4. ✅ L'agent disponible reçoit l'appel

---

## 📞 **EXTENSIONS DISPONIBLES**

| Extension   | Fonction             | Exemple                   |
| ----------- | -------------------- | ------------------------- |
| **101-199** | Appels directs       | 101 appelle 102           |
| **800**     | File support         | Entre dans support_queue  |
| **801**     | File ventes          | Entre dans sales_queue    |
| **\*65**    | Messagerie vocale    | Consulter sa boîte vocale |
| **\*66**    | Pause agent          | Se mettre en pause        |
| **\*67**    | Reprise agent        | Reprendre le service      |
| **#1**      | Transfert aveugle    | #1103#                    |
| **\*2**     | Transfert accompagné | \*2 puis 103 puis \*2     |

---

**🎉 TOUT EST PRÊT ! Bon appel ! 📞**
