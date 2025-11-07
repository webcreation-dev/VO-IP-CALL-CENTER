# Guide de test complet - Asterisk Call Center API

## ✅ Ce qui a été fait

### Phase 1 : Nettoyage du volume PostgreSQL - TERMINÉ

1. ✅ Dossier `api-pgdata` supprimé localement
2. ✅ Retiré du tracking Git (commit b7d0b3bb créé)
3. ✅ Guide VPS créé : `api-tests/VPS-GIT-CLEANUP.md`

**Prochaine étape pour toi :**
- Va sur ton VPS
- Ouvre le fichier `api-tests/VPS-GIT-CLEANUP.md`
- Exécute les commandes listées pour synchroniser le VPS

---

### Phase 2 : Scripts de test automatisés - EN COURS

#### ✅ Modules COMPLETS

1. **00-setup** - Authentification JWT
   - `get-token.sh` : Obtient un token JWT
   - Utilisé automatiquement par tous les autres scripts

2. **01-tenants** - Gestion des tenants
   - `test-tenants.sh` : Teste les 10 endpoints du module
   - `verify-asterisk.md` : Commandes CLI Asterisk
   - `verify-sql.sql` : Requêtes SQL de vérification
   - README avec documentation complète

3. **02-contexts** - Gestion des contexts
   - `test-contexts.sh` : Teste les 6 endpoints du module
   - `verify-asterisk.md` : Commandes CLI Asterisk
   - `verify-sql.sql` : Requêtes SQL
   - Prêt à être testé

4. **RUN-ALL-TESTS.sh** - Script principal
   - Lance tous les modules séquentiellement
   - Rapport global avec compteurs
   - Interface visuelle avec couleurs

#### 🚧 Modules À CRÉER (tu peux le faire ou me demander)

5. **03-endpoints** - Endpoints PJSIP (CRITIQUE)
6. **04-queues** - Files d'attente (CRITIQUE)
7. **05-registrations** - Trunks SIP
8. **06-ivr** - Menus IVR

---

## 🚀 Comment tester maintenant

### Option 1 : Tester tous les modules disponibles

```bash
cd api-tests
./RUN-ALL-TESTS.sh
```

### Option 2 : Tester module par module

```bash
# 1. Tenants
cd api-tests/01-tenants
./test-tenants.sh

# 2. Contexts
cd api-tests/02-contexts
./test-contexts.sh
```

### Option 3 : Tester un seul endpoint manuellement

```bash
# 1. Obtenir le token
cd api-tests
source 00-setup/get-token.sh

# 2. Faire une requête
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/tenants
```

---

## 📋 Vérifications Asterisk après chaque test

Après avoir exécuté un module de test, tu dois vérifier sur le **VPS** que les données sont bien en realtime dans Asterisk.

### Exemple pour le module Tenants

1. **Exécute le test** :
   ```bash
   ./api-tests/01-tenants/test-tenants.sh
   ```

2. **Sur le VPS, ouvre le fichier de vérification** :
   ```bash
   cat api-tests/01-tenants/verify-asterisk.md
   ```

3. **Tape les commandes listées**, par exemple :
   ```bash
   asterisk -rx "odbc show"
   asterisk -rx "realtime show config"
   ```

4. **Envoie-moi les retours** et j'analyserai si le realtime fonctionne correctement

---

## 🔄 Workflow de test recommandé

```
┌─────────────────────────────────────────────────────────────┐
│  1. TESTS (sur ta machine locale)                           │
├─────────────────────────────────────────────────────────────┤
│  ./api-tests/01-tenants/test-tenants.sh                     │
│  ✅ 10/10 tests passés                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. VÉRIFICATION ASTERISK (sur le VPS)                      │
├─────────────────────────────────────────────────────────────┤
│  asterisk -rx "odbc show"                                    │
│  asterisk -rx "realtime show config"                         │
│  asterisk -rx "pjsip show endpoints"  (après endpoints)     │
│  asterisk -rx "queue show"  (après queues)                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. VÉRIFICATION SQL (sur le VPS)                           │
├─────────────────────────────────────────────────────────────┤
│  PGPASSWORD='ApiSecurePass2025!' psql \                     │
│    -h localhost -U api_user -d asterisk_api \               │
│    -f api-tests/01-tenants/verify-sql.sql                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. ANALYSE                                                  │
├─────────────────────────────────────────────────────────────┤
│  Tu m'envoies les retours, j'analyse et confirme            │
│  que le realtime fonctionne correctement                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. MODULE SUIVANT                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Structure des dossiers de test

```
api-tests/
├── 00-setup/
│   ├── get-token.sh          ✅ Authentification JWT
│   └── README.md
├── 01-tenants/
│   ├── test-tenants.sh       ✅ Tests automatisés
│   ├── verify-asterisk.md    ✅ Commandes CLI Asterisk
│   ├── verify-sql.sql        ✅ Requêtes SQL
│   └── README.md
├── 02-contexts/
│   ├── test-contexts.sh      ✅ Tests automatisés
│   ├── verify-asterisk.md    ✅ Commandes CLI Asterisk
│   ├── verify-sql.sql        ✅ Requêtes SQL
│   └── README.md
├── 03-endpoints/             🚧 À créer
├── 04-queues/                🚧 À créer
├── 05-registrations/         🚧 À créer
├── 06-ivr/                   🚧 À créer
├── RUN-ALL-TESTS.sh          ✅ Script principal
└── VPS-GIT-CLEANUP.md        ✅ Commandes VPS
```

---

## 🎯 Prochaines étapes

### Immédiatement (TOI)

1. **Nettoyer le VPS** :
   ```bash
   # Sur le VPS
   cd /path/to/your/project
   cat api-tests/VPS-GIT-CLEANUP.md
   # Suivre les instructions
   ```

2. **Tester les modules disponibles** :
   ```bash
   # Sur ta machine locale
   cd api-tests
   ./RUN-ALL-TESTS.sh
   ```

3. **Vérifier sur Asterisk** :
   - Ouvrir `api-tests/01-tenants/verify-asterisk.md`
   - Taper les commandes sur le VPS
   - M'envoyer les retours

### Ensuite (MOI ou TOI)

4. **Créer les modules manquants** :
   - 03-endpoints (CRITIQUE - endpoints PJSIP)
   - 04-queues (CRITIQUE - files d'attente)
   - 05-registrations (trunks SIP)
   - 06-ivr (menus IVR)

Tu peux me demander de créer ces modules ou les créer toi-même en suivant le même pattern que tenants/contexts.

---

## 💡 Astuces

### Débugger un test qui échoue

```bash
# Activer le mode verbose
set -x
./api-tests/01-tenants/test-tenants.sh
```

### Changer l'URL de l'API

```bash
# Si ton API n'est pas sur localhost:3001
API_URL="http://192.168.1.100:3001/api/v1" ./api-tests/01-tenants/test-tenants.sh
```

### Tester avec un autre utilisateur

```bash
EMAIL="autre@email.com" PASSWORD="MotDePasse" ./api-tests/01-tenants/test-tenants.sh
```

---

## ❓ Questions fréquentes

**Q: Les tests échouent avec "Unauthorized"**
R: Vérifie que l'API tourne et que les credentials sont corrects dans `00-setup/get-token.sh`

**Q: Comment je sais si le realtime fonctionne ?**
R: Après avoir créé des endpoints, exécute `asterisk -rx "pjsip show endpoints"` sur le VPS. Tu devrais voir les endpoints avec le préfixe `t{tenantId}_`.

**Q: Dois-je créer manuellement les tenants ?**
R: Non ! Les scripts de test créent et suppriment automatiquement les données de test.

**Q: Puis-je lancer les tests plusieurs fois ?**
R: Oui, les scripts nettoient automatiquement les données créées.

---

## 🆘 Besoin d'aide ?

Si tu rencontres un problème :
1. Vérifie que l'API est démarrée : `curl http://localhost:3001/api/v1/metadata/health`
2. Vérifie les logs de l'API
3. Exécute le test avec `bash -x` pour voir les détails
4. Envoie-moi les logs d'erreur

---

## 📊 Résumé global

| Module | Script | Vérif Asterisk | Vérif SQL | Status |
|--------|--------|----------------|-----------|--------|
| 00-setup | ✅ | N/A | N/A | ✅ COMPLET |
| 01-tenants | ✅ | ✅ | ✅ | ✅ COMPLET |
| 02-contexts | ✅ | ✅ | ✅ | ✅ COMPLET |
| 03-endpoints | 🚧 | 🚧 | 🚧 | 🚧 À FAIRE |
| 04-queues | 🚧 | 🚧 | 🚧 | 🚧 À FAIRE |
| 05-registrations | 🚧 | 🚧 | 🚧 | 🚧 À FAIRE |
| 06-ivr | 🚧 | 🚧 | 🚧 | 🚧 À FAIRE |

**Progression : 3/7 modules (43%)**

---

Bonne chance avec les tests ! 🚀
