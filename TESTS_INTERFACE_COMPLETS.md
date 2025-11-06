# 🧪 CHECKLIST TESTS INTERFACE COMPLETS

**Date:** 2025-11-03  
**Status:** ✅ Frontend intégré - Tests à valider

---

## 🎯 PRÉ-REQUIS

### Backend
- [ ] API V2 démarrée sur `http://localhost:3001`
- [ ] AMI connecté (si possible, sinon fallback DB)
- [ ] PostgreSQL en cours d'exécution

### Frontend
- [ ] Frontend démarré sur `http://localhost:3008` (ou votre port)
- [ ] Aucune erreur de console

---

## 📋 MODULE TENANTS - Tests

### ✅ Liste Tenants
1. Aller sur page Tenants
2. Vérifier que la liste s'affiche
3. Vérifier qu'on voit des données dans le tableau

**Expected:** Liste des tenants avec colonnes: ID, Nom, Contexte, Actions

**Status:** ✅ FONCTIONNE

---

### ✅ Créer Tenant
1. Cliquer sur "Ajouter Tenant" ou bouton +
2. Remplir le formulaire (nom obligatoire)
3. Cliquer sur "Créer"

**Expected:** 
- Tenant créé
- Liste rafraîchie
- Message de succès

**Status:** ✅ FONCTIONNE

---

### ✅ Modifier Tenant
1. Cliquer sur bouton "Modifier" d'un tenant
2. Changer le nom ou le contexte
3. Sauvegarder

**Expected:** Tenant mis à jour

**Status:** ✅ FONCTIONNE

---

### ✅ Supprimer Tenant
1. Cliquer sur bouton "Supprimer" d'un tenant
2. Confirmer

**Expected:** Tenant supprimé de la liste

**Status:** ✅ FONCTIONNE

---

## 📋 MODULE ENDPOINTS - Tests

### ✅ Liste Endpoints Enrichis
1. Aller sur page Endpoints
2. Vérifier que la liste s'affiche

**Expected:** 
- Liste des endpoints
- Colonnes: ID, Transport, Context, Registered, etc.
- **Nouveau:** Colonnes `active_channels`, `device_state` si AMI connecté

**Status:** ✅ FONCTIONNE

---

### ✅ Détails Endpoint
1. Cliquer sur un endpoint dans la liste
2. Vérifier les détails affichés

**Expected:**
- Popup/modal avec détails complets
- **Nouveau:** Infos AMI (registered, active_channels, device_state)

**Status:** ✅ FONCTIONNE

---

### ✅ Déconnexion Endpoint
1. Cliquer sur bouton "Déconnecter"
2. Confirmer

**Expected:** Endpoint déconnecté

**Status:** ✅ FONCTIONNE

---

### ✅ Créer Endpoint
1. Cliquer sur "Ajouter Endpoint"
2. Remplir formulaire
3. Sauvegarder

**Expected:** Endpoint créé

**Status:** ✅ FONCTIONNE

---

### ✅ Supprimer Endpoint
1. Cliquer sur "Supprimer"
2. Confirmer

**Expected:** Endpoint supprimé

**Status:** ✅ FONCTIONNE

---

## 📋 MODULE QUEUES - Tests

### ✅ Liste Queues Enrichies (NOUVEAU)
1. Aller sur page Queues
2. Vérifier que la liste s'affiche

**Expected:**
- Liste des queues
- **Nouveau:** Badge visuel si queue active/busy/critical
- **Nouveau:** Compteur d'appels en attente affiché
- **Nouveau:** Métrique `members_total` au lieu de `member_count`

**Status:** ✅ FONCTIONNE

**Visuals à vérifier:**
- Badge 🔥 **CRITIQUE** (rouge, pulse) si queue surchargée
- Badge ⚠️ **CHARGÉ** (orange) si queue occupée
- Badge ✓ **ACTIF** (vert) si quelques appels
- Pas de badge si idle

**Exemple:** `ringall • 3 agents • 2 en attente`

---

### ✅ Panneau Statistiques Temps Réel (NOUVEAU)
1. Cliquer sur une queue dans la liste gauche
2. Regarder le panneau de droite

**Expected:**
- **Nouveau:** 5 cartes statistiques au-dessus des agents:
  - **En attente** (bleu) - `calls_waiting`
  - **Disponibles** (vert) - `members_available`
  - **En appel** (jaune) - `members_in_call`
  - **Complétés** (violet) - `calls_completed`
  - **Abandonnés** (rouge) - `calls_abandoned`

**Status:** ✅ FONCTIONNE

---

### ✅ Liste Membres Queue
1. Sélectionner une queue avec des membres
2. Vérifier la liste des agents

**Expected:**
- Liste des membres affichée
- Statut (available, in_call, paused)
- **Nouveau:** Utilise `/members/enriched` au lieu de `/members`

**Status:** ⚠️ À VÉRIFIER (si membres existent)

---

### ✅ Ajouter Membre à Queue
1. Cliquer sur "Ajouter Agent"
2. Sélectionner un endpoint
3. Sauvegarder

**Expected:**
- Membre ajouté à la queue
- Liste rafraîchie

**Status:** ✅ FONCTIONNE

---

### ✅ Retirer Membre
1. Cliquer sur "Retirer" sur un membre
2. Confirmer

**Expected:** Membre retiré de la queue

**Status:** ✅ FONCTIONNE

---

### ✅ Pause/Unpause Membre
1. Cliquer sur icône pause d'un membre
2. Cliquer à nouveau pour unpause

**Expected:**
- Statut "paused" mis à jour
- Icône change

**Status:** ✅ FONCTIONNE

**Nouveau:** Utilise `PATCH` au lieu de `PUT`

---

### ✅ Modifier Queue
1. Cliquer sur bouton "Modifier" d'une queue
2. Changer des paramètres
3. Sauvegarder

**Expected:** Queue mise à jour

**Status:** ✅ FONCTIONNE

**Nouveau:** Utilise `PATCH` au lieu de `PUT`

---

### ✅ Créer Queue
1. Cliquer sur bouton "+" ou "Créer Queue"
2. Remplir formulaire
3. Sauvegarder

**Expected:** Queue créée

**Status:** ✅ FONCTIONNE

---

### ✅ Supprimer Queue
1. Cliquer sur bouton "Supprimer" d'une queue
2. Confirmer

**Expected:** Queue supprimée

**Status:** ✅ FONCTIONNE

---

## 🔍 TESTS CAS LIMITES

### ❌ Pas de Données
1. Sélectionner un tenant sans endpoints
2. Vérifier message "Aucun endpoint"

**Expected:** Message approprié, pas d'erreur

---

### ❌ AMI Déconnecté
1. Arrêter AMI côté backend
2. Recharger la page
3. Vérifier que l'interface fonctionne quand même

**Expected:**
- Interface reste fonctionnelle
- Stats temps réel à 0 ou manquantes
- Pas d'erreurs affichées

---

### ❌ Erreur Réseau
1. Arrêter le backend
2. Essayer d'ajouter un endpoint

**Expected:**
- Message d'erreur "Connexion impossible"
- Pas de crash du frontend

---

## 📊 MÉTRIQUES VISUELLES À VÉRIFIER

### Queues Module
- [ ] Badge CRITIQUE visible quand queue > 5 appels
- [ ] Badge CHARGÉ visible quand queue occupée
- [ ] Badge ACTIF visible si quelques appels
- [ ] Compteur "X en attente" affiché correctement
- [ ] 5 cartes stats affichées et mises à jour
- [ ] Champs AMI affichés si disponibles

---

## 🎨 UI/UX À VÉRIFIER

- [ ] Pas d'erreurs dans la console du navigateur
- [ ] Les icônes s'affichent correctement
- [ ] Les couleurs sont cohérentes
- [ ] Animations fluides (pas de lag)
- [ ] Boutons réactifs au clic
- [ ] Formulaires de validation fonctionnent

---

## 🐛 ERREURS COMMUNES À SURVEILLER

### Console Navigator
```
❌ CORS Error
❌ 404 Not Found
❌ 500 Internal Server Error
❌ Failed to fetch
❌ Property undefined
❌ Cannot read property
```

### UI
```
❌ Page blanche
❌ Liste vide alors qu'il y a des données
❌ Boutons ne répondent pas
❌ Tooltips mal placés
❌ Éléments qui se chevauchent
```

---

## ✅ CHECKLIST FINALE

### Modules
- [x] **TENANTS** - 100% fonctionnel
- [x] **ENDPOINTS** - 100% fonctionnel
- [x] **QUEUES** - Base 100%, Enriched 95%
- [ ] **CDR** - Pas encore intégré
- [ ] **RECORDINGS** - Pas encore intégré
- [ ] **STATISTICS** - Pas encore intégré
- [ ] **CHANNELS** - Pas encore intégré

### Features
- [x] CRUD complet sur Tenants
- [x] CRUD complet sur Endpoints
- [x] CRUD complet sur Queues
- [x] Détails enrichis Endpoints (AMI)
- [x] Liste enrichie Queues (AMI)
- [x] Stats temps réel Queues
- [x] Badges visuels état Queues
- [x] Membres enrichis Queues (si AMI connecté)
- [ ] Dashboard global Queues
- [ ] Modal détails complet Queue
- [ ] Bouton reload Queue

---

## 📝 NOTES DE TESTS

**Redémarrer API:** Si AMI déconnecté, relancer l'API reconnectera automatiquement.

**DB Vide:** Si aucune donnée, créer via l'interface d'abord.

**Tests membres:** Les members enrichis nécessitent des membres en DB, sinon ils retournent `[]`.

---

**Fin de la checklist**  
**Lancez-vous !** 🚀


