# 🌐 Guide de Configuration WebRTC pour Asterisk

Ce guide explique comment configurer et tester les appels WebRTC avec vos endpoints configurés pour le Tenant 1.

## 📋 Prérequis

Vous avez déjà:
- ✅ 2 endpoints WebRTC configurés (101 et 102) pour le tenant 1
- ✅ Transport WSS configuré sur le port 8089
- ✅ Codecs optimaux (opus, ulaw, alaw, g722)
- ✅ DTLS/SRTP/ICE activés
- ✅ Certificats SSL auto-signés générés dans `/tmp/asterisk-certs/`
- ✅ Script d'installation `install-certificates.sh` créé
- ✅ Interface HTML WebRTC avec JsSIP 3.10.0 prête

## 🔧 Étape 1: Installation des Certificats SSL

Les certificats SSL sont nécessaires pour le transport WSS (WebSocket Secure).

```bash
# Installer les certificats avec sudo
sudo /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/install-certificates.sh
```

**Ce que fait ce script:**
- Crée le dossier `/etc/asterisk/certs/`
- Copie `fullchain.pem` et `privkey.pem`
- Configure les permissions (644 pour fullchain, 600 pour privkey)

**Vérification:**
```bash
ls -la /etc/asterisk/certs/
# Devrait afficher:
# -rw-r--r--  fullchain.pem
# -rw-------  privkey.pem
```

## 🔄 Étape 2: Redémarrage d'Asterisk

Après l'installation des certificats, redémarrez Asterisk pour les charger:

```bash
cd '/Users/macbookpro/Documents/BACKEND APPS/ManageAppBack/asterisk' && docker restart asterisk
```

**Vérification du démarrage:**
```bash
# Vérifier les logs pour confirmer le chargement des certificats
docker logs asterisk | grep -i "tls\|wss"

# Vérifier que le port WSS est bien écouté
docker exec asterisk ss -tlnp | grep 8089
```

**Vous devriez voir:**
- `LISTEN 0.0.0.0:8089` (port WSS actif)
- Messages de chargement des certificats TLS dans les logs

## 🌐 Étape 3: Ouverture de l'Interface WebRTC

### 3.1 Ouvrir le fichier HTML

```bash
# Ouvrir dans votre navigateur par défaut
open /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/webrtc.html

# Ou spécifier Chrome (recommandé pour WebRTC)
open -a "Google Chrome" /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/webrtc.html
```

### 3.2 Accepter le Certificat Auto-signé

**Important:** Les certificats auto-signés génèrent un avertissement de sécurité.

**Dans Chrome:**
1. Vous verrez "Votre connexion n'est pas privée"
2. Cliquez sur **"Paramètres avancés"**
3. Cliquez sur **"Continuer vers localhost (dangereux)"**

**Dans Firefox:**
1. Vous verrez "Avertissement : risque potentiel de sécurité"
2. Cliquez sur **"Avancé"**
3. Cliquez sur **"Accepter le risque et continuer"**

**Dans Safari:**
1. Cliquez sur **"Afficher les détails"**
2. Cliquez sur **"Visiter ce site web"**
3. Confirmez dans la popup

### 3.3 Alternative: Connexion Directe WSS

Si l'avertissement persiste, visitez d'abord directement:
```
https://localhost:8089
```
Acceptez le certificat, puis rechargez webrtc.html.

## 📱 Étape 4: Configuration des Endpoints

L'interface WebRTC a été adaptée avec des **boutons de configuration rapide**.

### 4.1 Configuration Endpoint 101

Au sommet de la page, vous verrez:

```
ℹ️ Configuration WebRTC Tenant 1
Endpoint 101: User: 101 | Password: password101
Endpoint 102: User: 102 | Password: password102
```

**Cliquez sur le bouton vert "👤 Endpoint 101"**

Cela remplira automatiquement:
- **Serveur:** localhost
- **Port:** 8089
- **Utilisateur SIP:** 101
- **Mot de passe:** password101

### 4.2 Configuration Manuelle (Alternative)

Si vous préférez la saisie manuelle:

| Champ | Endpoint 101 | Endpoint 102 |
|-------|--------------|--------------|
| Serveur | localhost | localhost |
| Port | 8089 | 8089 |
| Utilisateur SIP | 101 | 102 |
| Mot de passe | password101 | password102 |

## 🎯 Étape 5: Test d'Appel Entre Endpoints

### 5.1 Préparation: Deux Onglets

Pour tester un appel, vous aurez besoin de **2 onglets de navigateur**:

**Onglet 1 - Endpoint 101:**
1. Ouvrir webrtc.html
2. Cliquer sur "👤 Endpoint 101"
3. Cliquer sur **"Se connecter"**
4. Attendre "🟢 Enregistré"

**Onglet 2 - Endpoint 102:**
1. Ouvrir un nouvel onglet avec webrtc.html
2. Cliquer sur "👤 Endpoint 102"
3. Cliquer sur **"Se connecter"**
4. Attendre "🟢 Enregistré"

### 5.2 Lancer un Appel

**Depuis l'Onglet 1 (Endpoint 101):**
1. Dans le champ "Numéro à appeler", saisir: `102`
2. Cliquer sur **"Appeler"**
3. Vous verrez: "📞 Appel en cours vers 102"

**Dans l'Onglet 2 (Endpoint 102):**
1. Vous entendrez une sonnerie
2. Vous verrez: "📞 Appel entrant de 101"
3. Cliquer sur **"Répondre"**

**Résultat:**
- Les deux onglets affichent "📞 En communication"
- Vous pouvez parler entre les deux endpoints
- Le codec utilisé sera **opus** (optimal pour WebRTC)

### 5.3 Terminer l'Appel

Cliquer sur **"Raccrocher"** dans n'importe quel onglet pour terminer la communication.

## 🔍 Vérification dans Asterisk CLI

Pour voir l'appel en temps réel dans Asterisk:

```bash
# Entrer dans le CLI Asterisk
docker exec -it asterisk asterisk -rvvvv

# Voir les canaux actifs
core show channels

# Voir les endpoints PJSIP
pjsip show endpoints

# Voir les transports
pjsip show transports
```

**Pendant un appel, vous verrez:**
```
Channel                Location              State   Application(Data)
PJSIP/t1_101-00000001  101@client-a-context  Up      AppDial((Outgoing Line))
PJSIP/t1_102-00000002  s@client-a-context    Up      AppDial((Outgoing Line))
```

## 🐛 Dépannage (Troubleshooting)

### Problème 1: "Erreur de connexion WebSocket"

**Causes possibles:**
- Asterisk n'est pas démarré
- Port 8089 non accessible
- Certificats non installés

**Solutions:**
```bash
# Vérifier qu'Asterisk est démarré
docker ps | grep asterisk

# Vérifier que le port 8089 est exposé
docker port asterisk 8089

# Redémarrer Asterisk
docker restart asterisk

# Vérifier les logs
docker logs asterisk --tail 50
```

### Problème 2: "Failed to register"

**Causes possibles:**
- Mauvais identifiants
- Endpoint non configuré dans Asterisk

**Solutions:**
```bash
# Vérifier que les endpoints existent
docker exec asterisk asterisk -rx "pjsip show endpoints" | grep "t1_101\|t1_102"

# Vérifier les logs d'authentification
docker logs asterisk | grep -i "auth\|401"
```

**Vérifier dans le HTML:**
- Utilisateur: `101` (pas `t1_101` - le préfixe est ajouté automatiquement)
- Mot de passe: `password101`

### Problème 3: "No audio" (pas de son)

**Causes possibles:**
- Codec incompatible
- ICE/STUN non fonctionnel
- Problème de permissions micro

**Solutions:**

**Vérifier les codecs:**
```bash
docker exec asterisk asterisk -rx "pjsip show endpoint t1_101" | grep -A5 "codecs"
# Devrait afficher: opus, ulaw, alaw, g722
```

**Autoriser le microphone:**
- Le navigateur demandera l'accès au micro
- Cliquer sur "Autoriser"
- Vérifier dans les paramètres du navigateur

**Vérifier la console du navigateur:**
- Ouvrir DevTools (F12)
- Onglet "Console"
- Chercher les erreurs WebRTC

### Problème 4: Certificat non accepté

**Si le navigateur refuse toujours le certificat:**

```bash
# Régénérer les certificats avec SAN (Subject Alternative Name)
cd /tmp/asterisk-certs

# Créer un fichier de configuration
cat > localhost.conf << EOF
[req]
default_bits = 4096
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF

# Régénérer avec SAN
openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out fullchain.pem \
  -days 365 -nodes -config localhost.conf -extensions v3_req

# Réinstaller
sudo /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/install-certificates.sh

# Redémarrer Asterisk
docker restart asterisk
```

### Problème 5: "RTP Timeout"

**Causes:**
- Problème de pare-feu
- Ports RTP non accessibles

**Solution:**
```bash
# Vérifier les ports RTP configurés
docker exec asterisk grep "rtpstart\|rtpend" /etc/asterisk/rtp.conf

# Vérifier qu'ils sont exposés dans docker-compose.yml
# Devrait contenir:
# ports:
#   - "10000-10099:10000-10099/udp"
```

## 📊 Tests Avancés

### Test avec des Queues

Une fois les appels WebRTC fonctionnels, vous pouvez tester avec vos queues:

```bash
# Ajouter l'endpoint 101 à la queue support
curl -X POST "http://localhost:3000/v2/queues/t1_support/members" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interface": "PJSIP/t1_101",
    "memberName": "Agent 101",
    "penalty": 0
  }'

# Appeler la queue depuis l'endpoint 102
# Dans webrtc.html (endpoint 102), appeler: la queue (selon votre dialplan)
```

### Test avec CDR

Vérifier l'enregistrement des appels:

```bash
# Voir les derniers CDR
curl "http://localhost:3000/v2/cdr?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🎉 Succès!

Si vous avez réussi à:
- ✅ Vous connecter avec les endpoints 101 et 102
- ✅ Passer un appel de 101 vers 102
- ✅ Entendre de l'audio dans les deux sens
- ✅ Voir les canaux actifs dans Asterisk CLI

**Votre configuration WebRTC est opérationnelle!**

## 📚 Ressources

- **JsSIP Documentation:** https://jssip.net/documentation/
- **Asterisk WebRTC Guide:** https://wiki.asterisk.org/wiki/display/AST/WebRTC
- **PJSIP Configuration:** https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip

## 🆘 Support

En cas de problème persistant:

1. **Vérifier les logs Asterisk:**
   ```bash
   docker logs asterisk -f
   ```

2. **Vérifier les logs du navigateur:**
   - Ouvrir DevTools (F12)
   - Onglet "Console"

3. **Vérifier la configuration PJSIP:**
   ```bash
   docker exec asterisk asterisk -rx "pjsip show endpoint t1_101"
   ```

4. **Tester la connectivité WSS:**
   ```bash
   openssl s_client -connect localhost:8089
   ```
