# Tests du module TENANTS

Ce dossier contient tous les tests pour le module de gestion des Tenants.

## Fichiers

- **test-tenants.sh** : Script de test automatisé pour tous les endpoints du module
- **verify-asterisk.md** : Commandes CLI Asterisk à exécuter sur le VPS pour vérifier le realtime
- **verify-sql.sql** : Requêtes SQL à exécuter sur PostgreSQL pour vérifier les données

## Endpoints testés

- ✅ `GET /tenants` - Liste tous les tenants
- ✅ `GET /tenants/me` - Obtenir le tenant de l'utilisateur courant
- ✅ `POST /tenants` - Créer un nouveau tenant
- ✅ `GET /tenants/:id` - Obtenir un tenant par ID
- ✅ `PATCH /tenants/:id` - Mettre à jour un tenant
- ✅ `GET /tenants/:id/endpoints` - Obtenir les endpoints du tenant
- ✅ `GET /tenants/:id/queues` - Obtenir les queues du tenant
- ✅ `DELETE /tenants/:id` - Soft delete d'un tenant
- ✅ `PATCH /tenants/:id/restore` - Restaurer un tenant supprimé

## Utilisation

### 1. Exécuter les tests

```bash
./test-tenants.sh
```

### 2. Vérifier dans Asterisk (sur le VPS)

Copiez les commandes depuis `verify-asterisk.md` et exécutez-les sur le VPS :

```bash
# Exemple
asterisk -rx "odbc show"
asterisk -rx "realtime show config"
```

### 3. Vérifier dans PostgreSQL (sur le VPS)

```bash
PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api -f verify-sql.sql
```

## Résultat attendu

Le script devrait afficher :

```
==========================================
  RAPPORT FINAL - MODULE TENANTS
==========================================

Total de tests      : 10
Tests réussis       : 10
Tests échoués       : 0

✅ TOUS LES TESTS SONT PASSÉS !
```

## Variables d'environnement

- `API_URL` : URL de l'API (défaut: `http://localhost:3001/api/v1`)

## Notes

- Les tenants sont créés et supprimés automatiquement pendant les tests
- Le tenant de test est restauré après soft delete pour tester la restauration
- À la fin, le tenant de test est définitivement supprimé
