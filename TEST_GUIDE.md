# Guide de test - Création d'agents avec génération automatique

## Prérequis

### Backend
```bash
cd asterisk-api-v2
npm install
npm run start:dev
```
Backend doit être accessible sur `http://localhost:3000`

### Frontend
```bash
cd call-center
npm install
npm run dev
```
Frontend accessible sur `http://localhost:5173` (ou port Vite)

### Base de données
- PostgreSQL en cours d'exécution
- Base `asterisk` créée
- Migrations appliquées
- Au moins un tenant créé avec `dialplanConfig.internalDialPattern` défini

---

## Scénarios de test

### Test 1: Création du premier agent (pattern _1XXX)

**Étapes**:
1. Ouvrir le frontend
2. Se connecter avec un utilisateur du tenant 1
3. Aller à la page "Agents"
4. Cliquer sur "Créer un agent" / "Nouvel endpoint"
5. Remplir uniquement:
   - Mot de passe: `TestPassword123`
   - Laisser displayName vide
6. Cliquer "Créer"

**Résultat attendu**:
- ✅ Dialogue "Agent créé avec succès" s'affiche
- ✅ Numéro d'agent: `1000` (premier numéro du pattern _1XXX)
- ✅ Username SIP: chaîne aléatoire de 32 caractères (ex: `a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3`)
- ✅ Mot de passe: `TestPassword123`
- ✅ Boutons "Copier" fonctionnels pour chaque champ
- ✅ Bouton "Copier tout" fonctionne

**Base de données**:
```sql
-- Vérifier dans ps_endpoints
SELECT id, tenant_id, context FROM ps_endpoints WHERE id = 't1_1000';
-- Résultat: t1_1000 | 1 | t1_default (ou votre context)

-- Vérifier dans ps_auths
SELECT id, username, realm FROM ps_auths WHERE id = 't1_1000';
-- Résultat: t1_1000 | a7k9m2p8... | asterisk
```

---

### Test 2: Création du deuxième agent (incrémentation)

**Étapes**:
1. Fermer le dialogue des credentials du test 1
2. Le modal se ferme automatiquement
3. La liste se rafraîchit → voir agent 1000
4. Cliquer à nouveau sur "Créer un agent"
5. Remplir:
   - Mot de passe: `AnotherPass456`
   - Display Name: `Agent Commercial 2`
6. Cliquer "Créer"

**Résultat attendu**:
- ✅ Numéro d'agent: `1001` (incrémentation automatique)
- ✅ Username SIP: différent du premier (nouvelle chaîne aléatoire)
- ✅ Mot de passe: `AnotherPass456`
- ✅ Dans la liste: affiche "1001" ou "Agent Commercial 2" (selon displayName)

**Vérification**:
```sql
SELECT id, display_name FROM ps_endpoints WHERE tenant_id = 1 ORDER BY id;
-- Résultat:
-- t1_1000 | 1000
-- t1_1001 | Agent Commercial 2
```

---

### Test 3: Création pour un autre tenant (pattern _2XXX)

**Prérequis**: Avoir un tenant 2 avec pattern `_2XXX`

**Étapes**:
1. Se connecter en tant que SUPER_ADMIN ou utilisateur du tenant 2
2. Aller à la page "Agents"
3. Si SUPER_ADMIN: sélectionner Tenant 2 dans le dropdown
4. Créer un agent avec mot de passe: `Tenant2Pass789`

**Résultat attendu**:
- ✅ Numéro d'agent: `2000` (premier numéro du pattern _2XXX)
- ✅ ID préfixé: `t2_2000`
- ✅ Username SIP: chaîne aléatoire unique
- ✅ Les agents du tenant 1 ne sont pas affectés

**Vérification**:
```sql
SELECT id, tenant_id FROM ps_endpoints WHERE tenant_id = 2;
-- Résultat: t2_2000 | 2
```

---

### Test 4: Copie des credentials

**Étapes**:
1. Créer un agent
2. Dans le dialogue des credentials:
   - Cliquer sur le bouton "Copier" du numéro d'agent
   - Vérifier le toast "Copié"
   - Coller dans un éditeur de texte → vérifier le contenu
3. Répéter pour username SIP et mot de passe
4. Cliquer "Copier tout"
   - Coller dans un éditeur de texte

**Résultat attendu "Copier tout"**:
```
Identifiants de l'agent créé
========================
Numéro d'agent: 1002
Nom d'utilisateur SIP: x3j5k7m9p2q4r6s8t0u2v4w6x8y0z2a4
Mot de passe: TestPassword123
========================
⚠️ Sauvegardez ces informations en lieu sûr!
```

---

### Test 5: Modification d'un agent existant

**Étapes**:
1. Dans la liste des agents, cliquer sur "Modifier" pour un agent existant
2. Changer le mot de passe: `NewPassword999`
3. Changer le Caller ID: `Agent Support <1000>`
4. Cliquer "Modifier"

**Résultat attendu**:
- ✅ Toast "Endpoint modifié"
- ✅ **PAS de dialogue des credentials** (ne s'affiche qu'à la création)
- ✅ Modal se ferme immédiatement
- ✅ Liste se rafraîchit avec les nouvelles valeurs

---

### Test 6: WebRTC endpoint

**Étapes**:
1. Créer un agent
2. Sélectionner Transport: `transport-wss` (WebRTC)
3. Mot de passe: `WebRTCPass123`
4. Créer

**Résultat attendu**:
- ✅ Agent créé avec numéro incrémenté (ex: 1003)
- ✅ Credentials affichés normalement
- ✅ Dans la base, `ps_endpoints.webrtc = 'yes'`

**Vérification**:
```sql
SELECT id, transport, webrtc, media_encryption
FROM ps_endpoints
WHERE id = 't1_1003';
-- Résultat: t1_1003 | transport-wss | yes | dtls
```

---

### Test 7: Pattern exhaustion (test de limite)

**Prérequis**: Créer un tenant avec pattern court (ex: `_1XX` pour 100-199)

**Étapes**:
1. Créer 100 agents pour ce tenant (scripts ou boucle)
2. Tenter de créer le 101e agent

**Résultat attendu**:
- ✅ Erreur backend: "Agent number range exhausted for pattern _1XX"
- ✅ Toast d'erreur dans le frontend
- ✅ Pas de création en base de données

---

### Test 8: Validation du formulaire

**Étapes**:
1. Créer un agent
2. Laisser le mot de passe vide
3. Cliquer "Créer"

**Résultat attendu**:
- ✅ Message d'erreur: "Le mot de passe doit contenir au moins 6 caractères"
- ✅ Pas d'envoi de la requête

**Étapes 2**:
1. Entrer un mot de passe de 5 caractères
2. Cliquer "Créer"

**Résultat attendu**:
- ✅ Message d'erreur de validation
- ✅ Pas d'envoi de la requête

---

### Test 9: Unicité du username SIP

**Prérequis**: Extrêmement rare, mais testable en mockant

**Simulation** (modifier temporairement `random-username.util.ts`):
```typescript
export function generateRandomUsername(): string {
  return "fixed_username_for_test"; // Force collision
}
```

**Étapes**:
1. Créer premier agent → OK
2. Créer deuxième agent → Devrait retry et générer un nouveau

**Résultat attendu**:
- ✅ Warning dans les logs: "Username collision detected"
- ✅ Retry automatique (max 5 fois)
- ✅ Si échec après 5 retries: erreur "Failed to generate unique username"

**⚠️ Remettre le code normal après test!**

---

### Test 10: Affichage dans la liste

**Étapes**:
1. Créer plusieurs agents avec et sans displayName
2. Recharger la page "Agents"

**Résultat attendu**:
- ✅ Colonne "Nom" affiche:
  - Le numéro d'agent (ex: 1000) si pas de displayName
  - Le displayName si fourni
- ✅ Les agents sont triés par ID
- ✅ Device State et Contact Status affichés correctement

---

## Tests de régression

### Backend déjà implémenté
- ✅ Vérifier que l'API retourne bien `generatedUsername` et `agentNumber`
- ✅ Vérifier que le backend crée bien 3 tables (ps_endpoints, ps_auths, ps_aors)
- ✅ Vérifier PJSIP reload après création

### Frontend
- ✅ Pas d'erreurs console JavaScript
- ✅ Pas d'erreurs TypeScript à la compilation
- ✅ Toasts fonctionnent correctement
- ✅ Navigation reste fluide

---

## Checklist de validation finale

### Fonctionnel
- [ ] Agent ID est auto-incrémenté (1000, 1001, 1002...)
- [ ] Agent ID respecte le pattern du tenant (_1XXX, _2XXX)
- [ ] Username SIP est aléatoire et < 40 caractères
- [ ] Username SIP est unique (pas de collision)
- [ ] Username SIP est NON préfixé (pas de `t1_`)
- [ ] Endpoint ID est préfixé (`t1_1000`)
- [ ] Le username généré est retourné dans la réponse
- [ ] Dialogue des credentials s'affiche après création
- [ ] Copie des credentials fonctionne
- [ ] Multiple créations successives incrémentent correctement
- [ ] Tenants différents ont des numérotations indépendantes
- [ ] Modification d'agent n'affiche pas le dialogue credentials

### UI/UX
- [ ] Formulaire clair et intuitif
- [ ] Dialogue credentials bien formaté
- [ ] Avertissement visible et compréhensible
- [ ] Boutons de copie réactifs (icône change)
- [ ] Toasts informatifs
- [ ] Responsive (mobile, tablet, desktop)

### Technique
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs console
- [ ] API calls correctes (POST /endpoints)
- [ ] Gestion d'erreurs backend appropriée
- [ ] Transactions atomiques (3 tables)
- [ ] PJSIP reload après création

---

## Commandes utiles

### Vérifier un agent en base
```sql
-- Voir l'endpoint
SELECT * FROM ps_endpoints WHERE id = 't1_1000';

-- Voir l'auth associé
SELECT * FROM ps_auths WHERE id = 't1_1000';

-- Voir l'AoR associé
SELECT * FROM ps_aors WHERE id = 't1_1000';

-- Compter les agents par tenant
SELECT tenant_id, COUNT(*)
FROM ps_endpoints
GROUP BY tenant_id;

-- Voir les numéros d'agents d'un tenant
SELECT id, display_name, context
FROM ps_endpoints
WHERE tenant_id = 1
ORDER BY id;
```

### Nettoyer la base pour retester
```sql
-- ATTENTION: Supprime tous les endpoints du tenant 1
DELETE FROM ps_aors WHERE tenant_id = 1;
DELETE FROM ps_auths WHERE tenant_id = 1;
DELETE FROM ps_endpoints WHERE tenant_id = 1;
```

### Vérifier Asterisk
```bash
# Connecter au CLI Asterisk
docker exec -it asterisk asterisk -rx "pjsip show endpoints"

# Vérifier un endpoint spécifique
docker exec -it asterisk asterisk -rx "pjsip show endpoint t1_1000"

# Vérifier les authentifications
docker exec -it asterisk asterisk -rx "pjsip show auths"
```

---

## En cas de problème

### Erreur: "Failed to create endpoint"
**Cause possible**:
- Backend non accessible
- Base de données déconnectée
- Tenant inexistant

**Solution**:
1. Vérifier que le backend tourne: `curl http://localhost:3000/api/v1/health`
2. Vérifier les logs backend
3. Vérifier la connexion PostgreSQL

### Erreur: "Agent number range exhausted"
**Cause**: Le pattern est plein

**Solution**:
1. Supprimer des anciens agents
2. Modifier le pattern du tenant (ex: `_1XXX` → `_[1-2]XXX`)
3. Créer un nouveau tenant avec un pattern différent

### Dialogue credentials ne s'affiche pas
**Cause possible**:
- Backend ne retourne pas `generatedUsername` ou `agentNumber`
- Erreur JavaScript

**Solution**:
1. Ouvrir DevTools Console
2. Vérifier la réponse de l'API (Network tab)
3. Vérifier que `response.generatedUsername` et `response.agentNumber` existent

### Copie ne fonctionne pas
**Cause**: Clipboard API non disponible (HTTPS requis)

**Solution**:
1. Utiliser HTTPS en production
2. En dev: configurer Vite pour HTTPS ou utiliser localhost (autorisé)

---

**Bon test! 🚀**
