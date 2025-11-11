# 🎯 Guide de Test IVR Complet

Ce guide vous permet de tester l'IVR de bout en bout avec WebRTC.

## 📁 Fichiers créés

- **`setup-ivr-test.sh`** - Configuration automatique de l'IVR
- **`verify-ivr-asterisk.sh`** - Vérification dans Asterisk
- **`setup-webrtc-endpoint.sh`** - Création d'endpoint WebRTC
- **`README-IVR-TEST.md`** - Ce fichier

---

## 🚀 Workflow en 3 Phases

### **PHASE 1: Configuration IVR (Automatique)**

#### Étape 1.1: Obtenir le token JWT

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/api-tests/00-setup
./get-token.sh
source /tmp/asterisk-api-token.sh
```

Vérifiez que le token est chargé:
```bash
echo $TOKEN
# Doit afficher: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Étape 1.2: Lancer la configuration automatique

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/api-tests/11-ivr
./setup-ivr-test.sh "$TOKEN"
```

**Ce script va créer automatiquement:**
- ✅ Un tenant de test (`ivr-test-tenant-TIMESTAMP`)
- ✅ Deux queues (`sales` et `support`)
- ✅ Trois fichiers audio TTS (`welcome`, `invalid`, `timeout`)
- ✅ Un menu IVR avec options (1 = sales, 2 = support)
- ✅ Un mapping DID → Menu (`+33123456789` → menu)
- ✅ Un fichier de config JSON avec tous les IDs

**À la fin, vous verrez:**
```
╔════════════════════════════════════════════════════════╗
║        CONFIGURATION IVR CRÉÉE AVEC SUCCÈS            ║
╚════════════════════════════════════════════════════════╝

📋 Détails de la configuration:
   • TENANT_ID:      123
   • MENU_ID:        999
   • DID:            +33123456789
   • QUEUE SALES:    sales
   • QUEUE SUPPORT:  support

📁 Configuration sauvegardée:
   /path/to/ivr-test-config-TIMESTAMP.json
```

**⚠️ NOTEZ LE TENANT_ID - vous en aurez besoin!**

---

### **PHASE 2: Vérification dans Asterisk**

#### Étape 2.1: Lancer le script de vérification

```bash
./verify-ivr-asterisk.sh 123  # Remplacez 123 par votre TENANT_ID
```

Ce script affiche des commandes à taper. **Tapez chaque commande et notez le résultat.**

#### Étape 2.2: Checklist de vérification

Vérifiez **TOUS** ces points:

| ✅ | Vérification | Commande |
|----|--------------|----------|
| [ ] | Queues existent | `docker exec -it asterisk asterisk -rx "queue show"` |
| [ ] | App Stasis active | `docker exec -it asterisk asterisk -rx "stasis show apps"` |
| [ ] | Contexte existe | `docker exec -it asterisk asterisk -rx "dialplan show t123_default"` |
| [ ] | ARI actif | `docker exec -it asterisk asterisk -rx "http show status"` |
| [ ] | Fichiers audio présents | `docker exec -it asterisk ls -lh /var/lib/asterisk/sounds/ivr/` |
| [ ] | Transport WSS actif | `docker exec -it asterisk asterisk -rx "pjsip show transports"` |

**Si un point échoue, NE PASSEZ PAS à la phase 3!**

---

### **PHASE 3: Test en Temps Réel avec WebRTC**

#### Étape 3.1: Créer un endpoint WebRTC

```bash
./setup-webrtc-endpoint.sh "$TOKEN" 123 200
```
*Remplacez 123 par votre TENANT_ID*

**Le script affiche vos credentials:**
```
📱 Paramètres de connexion:
   • Username:   200
   • Password:   webrtc200
   • Domain:     VOTRE_IP_VPS
   • WebSocket:  wss://VOTRE_IP_VPS:8089/ws
```

#### Étape 3.2: Configurer votre softphone WebRTC

**Option A: Zoiper 5 (recommandé)**
1. Téléchargez: https://www.zoiper.com/
2. Settings → Accounts → Add Account
3. Type: SIP
4. Username: `200`
5. Password: `webrtc200`
6. Domain: `VOTRE_IP_VPS`
7. Advanced → Transport: `WSS`
8. Advanced → WebSocket: `wss://VOTRE_IP_VPS:8089/ws`

**Option B: Linphone**
1. Téléchargez: https://www.linphone.org/
2. Préférences → Comptes → Ajouter
3. Username: `200`
4. Password: `webrtc200`
5. Domain: `VOTRE_IP_VPS`
6. Transport: `WSS`

**Option C: MicroSIP (Windows seulement)**
1. Téléchargez: https://www.microsip.org/
2. Account → Add Account
3. SIP Server: `VOTRE_IP_VPS:8089`
4. SIP Proxy: `wss://VOTRE_IP_VPS:8089/ws`
5. Username: `200`
6. Password: `webrtc200`
7. Cocher "Enable WebRTC"

#### Étape 3.3: Vérifier l'enregistrement

```bash
docker exec -it asterisk asterisk -rx "pjsip show endpoints"
```

**Vous devriez voir:**
```
Endpoint:  200/200                                     Avail   0 of inf
    InAuth:  200-auth/200
    Aor:  200                                          1
```

**Status doit être:** `Avail` ou `Available` (pas `Unavailable`!)

#### Étape 3.4: Tester l'appel IVR

1. **Ouvrez 2 terminaux en parallèle:**

   **Terminal 1 - Logs Asterisk:**
   ```bash
   docker logs -f asterisk
   ```

   **Terminal 2 - Logs API (IVR Orchestrator):**
   ```bash
   docker logs -f asterisk-api-v2 | grep IVR
   ```

2. **Depuis votre softphone, appelez:** `+33123456789`

3. **Vous devriez entendre:**
   > "Bienvenue dans notre système IVR. Appuyez sur 1 pour le service commercial, ou appuyez sur 2 pour le support technique."

4. **Appuyez sur `1` sur votre clavier téléphonique**

5. **Dans les logs, vous devriez voir:**
   ```
   [IvrOrchestratorService] Session created for channel: PJSIP/200-xxx
   [IvrOrchestratorService] Playing welcome sound: welcome
   [IvrOrchestratorService] DTMF received: 1
   [IvrActionExecutorService] Executing action: queue -> sales
   [IvrOrchestratorService] Call transferred to queue: sales
   ```

6. **Vous serez transféré à la queue `sales`**

   Si aucun agent n'est disponible, vous entendrez la musique d'attente.

---

## 🧪 Scénarios de Test

### Test 1: Menu principal
- ✅ Appeler le DID
- ✅ Entendre le message d'accueil
- ✅ Appuyer sur 1 → Queue sales
- ✅ Appuyer sur 2 → Queue support

### Test 2: Timeout
- ✅ Appeler le DID
- ✅ NE PAS appuyer sur de touche
- ✅ Attendre 5 secondes
- ✅ Entendre "Nous n'avons pas reçu votre choix"
- ✅ Menu rejoue

### Test 3: Option invalide
- ✅ Appeler le DID
- ✅ Appuyer sur 9 (option inexistante)
- ✅ Entendre "Option invalide"
- ✅ Menu rejoue

### Test 4: Max retries
- ✅ Appeler le DID
- ✅ Appuyer 3 fois sur des touches invalides
- ✅ Après 3 essais, l'appel raccroche

---

## 🔧 Créer un Agent pour Répondre

Pour tester complètement, créez un 2ème endpoint qui agira comme agent:

```bash
# Créer l'endpoint 201
./setup-webrtc-endpoint.sh "$TOKEN" 123 201

# Ajouter l'endpoint 201 à la queue sales
curl -X POST "http://localhost:3001/api/v1/queue-members" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queue_name": "sales",
    "interface": "PJSIP/201",
    "penalty": 0,
    "tenantId": 123
  }'
```

Ensuite:
1. Enregistrez un 2ème softphone avec les credentials `201/webrtc201`
2. Depuis le softphone 200, appelez `+33123456789`
3. Appuyez sur 1
4. Le softphone 201 devrait sonner!

---

## 🐛 Dépannage

### Problème: "Queue 'sales' not found"

**Cause:** La queue n'est pas chargée dans Asterisk

**Solution:**
```bash
docker logs asterisk | grep "sales"
docker exec -it asterisk asterisk -rx "queue show sales"
```

Si la queue n'existe pas, relancez le script `setup-ivr-test.sh`.

---

### Problème: Le softphone ne s'enregistre pas

**Cause:** Transport WSS non actif ou port 8089 bloqué

**Solution:**
```bash
# Vérifier le transport
docker exec -it asterisk asterisk -rx "pjsip show transports"

# Vérifier que le port est ouvert
sudo ufw allow 8089/tcp
sudo ufw allow 10000:20000/udp

# Vérifier les certificats DTLS
docker exec -it asterisk ls -lh /etc/asterisk/keys/
```

---

### Problème: Pas de son dans l'IVR

**Cause:** Fichiers audio manquants

**Solution:**
```bash
# Vérifier les fichiers audio
docker exec -it asterisk ls -lh /var/lib/asterisk/sounds/ivr/

# Relancer la génération TTS
curl -X POST "http://localhost:3001/api/v1/ivr/audio/generate-tts?tenantId=123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test audio", "name": "test"}'
```

---

### Problème: DTMF non détecté (touches ne fonctionnent pas)

**Cause:** DTMF non transmis correctement

**Solution:**

Dans votre softphone, changez le mode DTMF:
- **RFC 2833** (recommandé)
- **SIP INFO**
- **In-band**

Essayez chaque option jusqu'à ce que les touches fonctionnent.

---

## 📊 Requêtes API Utiles

### Voir tous les menus IVR
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/ivr/menus?tenantId=123"
```

### Voir les options d'un menu
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/ivr/menus/999?tenantId=123"
```

### Voir le DID mapping
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/ivr/did-mappings?tenantId=123"
```

### Valider la configuration IVR
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/ivr/menus/999/validate?tenantId=123"
```

### Supprimer la config de test
```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/tenants/123"
```
*Ceci supprime tout: tenant, queues, endpoints, menus IVR*

---

## 📝 Checklist Finale

Avant de considérer le test réussi, vérifiez:

- [ ] Le script `setup-ivr-test.sh` s'exécute sans erreur
- [ ] Toutes les vérifications Asterisk passent (Phase 2)
- [ ] L'endpoint WebRTC s'enregistre correctement
- [ ] Le DID `+33123456789` est appelable
- [ ] Le message d'accueil est audible
- [ ] La touche 1 transfère vers la queue sales
- [ ] La touche 2 transfère vers la queue support
- [ ] Les touches invalides jouent le message d'erreur
- [ ] Le timeout rejoue le menu après 5 secondes
- [ ] Les logs IVR montrent l'orchestration correcte

---

## 🎉 Succès!

Si tous les points ci-dessus sont ✅, **félicitations!**

Votre système IVR est opérationnel et prêt pour la production.

---

## 📚 Documentation Complémentaire

- Architecture IVR: `/docs/IVR-ARCHITECTURE.md`
- API IVR complète: `/docs/COMPLETE_API_DOCUMENTATION.md`
- Tests automatisés: `/api-tests/11-ivr/test-ivr-menus.sh`

---

**Créé le:** $(date)
**Auteur:** Claude Code
**Version:** 1.0
