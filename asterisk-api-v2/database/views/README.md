# Database Views for Asterisk Soft Delete Synchronization

## 🎯 Objectif

Synchroniser automatiquement les suppressions PostgreSQL avec Asterisk en utilisant des **vues de base de données** qui filtrent les enregistrements supprimés (soft delete).

## ❓ Problème Résolu

### Problème Avant

```
1. Suppression d'un endpoint via l'API
   → UPDATE ps_endpoints SET deleted_at = NOW() WHERE id = 't1_101'

2. Asterisk Realtime lit DIRECTEMENT la table ps_endpoints
   → SELECT * FROM ps_endpoints

3. Résultat : Asterisk voit TOUJOURS l'endpoint supprimé ❌
   → L'endpoint "supprimé" reste enregistrable
   → Il apparaît dans "pjsip show endpoints"
```

### Solution Avec les Vues

```
1. Création de vues qui filtrent deleted_at IS NULL
   → CREATE VIEW ps_endpoints_active AS SELECT * FROM ps_endpoints WHERE deleted_at IS NULL

2. Asterisk lit la VUE au lieu de la TABLE
   → extconfig.conf: ps_endpoints => odbc,asterisk,ps_endpoints_active

3. Quand on soft-delete dans la table
   → UPDATE ps_endpoints SET deleted_at = NOW() WHERE id = 't1_101'

4. Asterisk relit la vue
   → SELECT * FROM ps_endpoints_active
   → La vue ne retourne plus l'endpoint supprimé ✅
   → Asterisk ne voit plus l'endpoint automatiquement !
```

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS API Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Endpoints  │  │   Queues    │  │ Extensions  │        │
│  │   Service   │  │   Service   │  │   Service   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │ Soft Delete    │                 │                │
│         │ (deleted_at)   │                 │                │
└─────────┼────────────────┼─────────────────┼────────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│                                                             │
│  ┌──────────────────────┬──────────────────────────────┐  │
│  │  Base Tables         │  Views (*_active)            │  │
│  │  (with deleted_at)   │  (WHERE deleted_at IS NULL)  │  │
│  ├──────────────────────┼──────────────────────────────┤  │
│  │  ps_endpoints        │  ps_endpoints_active         │  │
│  │  ps_auths            │  ps_auths_active             │  │
│  │  ps_aors             │  ps_aors_active              │  │
│  │  queues              │  queues_active               │  │
│  │  queue_members       │  queue_members_active        │  │
│  │  extensions          │  extensions_active           │  │
│  │  sip_trunks          │  sip_trunks_active           │  │
│  └──────┬───────────────┴──────────┬───────────────────┘  │
│         │                          │                        │
│         │ All records              │ Active only            │
│         │ (for reports)            │ (for Asterisk)         │
└─────────┼──────────────────────────┼────────────────────────┘
          │                          │
          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  Statistics API     │    │  Asterisk Realtime          │
│  (historical data)  │    │  (extconfig.conf)           │
│                     │    │                             │
│  SELECT * FROM      │    │  ps_endpoints =>            │
│  v_cdr_enriched     │    │    odbc,asterisk,           │
│                     │    │    ps_endpoints_active      │
└─────────────────────┘    └─────────────────────────────┘
```

## 🚀 Installation

### Étape 1 : Exécuter la Migration

La migration ajoute les colonnes `deleted_at`, `deleted_by`, et `deletion_reason` à toutes les tables.

```bash
cd /Users/macbookpro/Documents/BACKEND\ APPS/ManageAppBack/asterisk/asterisk-api-v2

# Générer les migrations compilées
npm run build

# Exécuter la migration
npm run migration:run

# Ou avec TypeScript directement
TS_NODE_PROJECT=tsconfig-migrations.json npm run migration:run
```

**Vérification :**
```bash
docker exec postgres-container psql -U asterisk_user -d asterisk_db -c "\d ps_endpoints"

# Vous devriez voir les nouvelles colonnes :
# - deleted_at | timestamp with time zone
# - deleted_by | integer
# - deletion_reason | text
```

### Étape 2 : Créer les Vues PostgreSQL

```bash
# Depuis le serveur Asterisk
docker exec postgres-container psql -U asterisk_user -d asterisk_db < /path/to/create-asterisk-views.sql

# Ou si PostgreSQL est dans Docker :
docker exec -i postgres-container psql -U asterisk_user -d asterisk_db < database/views/create-asterisk-views.sql
```

**Vérification :**
```sql
-- Liste toutes les vues créées
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE '%_active';

-- Test : Comparer table vs vue
SELECT COUNT(*) as total FROM ps_endpoints;
SELECT COUNT(*) as active FROM ps_endpoints_active;
```

### Étape 3 : Mettre à Jour extconfig.conf

Le fichier a déjà été modifié dans cette implémentation. Vérifiez le contenu :

```bash
cat /path/to/asterisk-pgsql/etc/asterisk/extconfig.conf
```

Devrait contenir :
```ini
[settings]
ps_endpoints => odbc,asterisk,ps_endpoints_active
ps_auths => odbc,asterisk,ps_auths_active
ps_aors => odbc,asterisk,ps_aors_active
extensions => odbc,asterisk,extensions_active
queues => odbc,asterisk,queues_active
queue_members => odbc,asterisk,queue_members_active
```

### Étape 4 : Recharger Asterisk

```bash
# Recharger ODBC et PJSIP
docker exec asterisk asterisk -rx "module reload res_odbc"
docker exec asterisk asterisk -rx "pjsip reload"

# Ou redémarrer complètement Asterisk
docker restart asterisk
```

### Étape 5 : Vérifier la Configuration

```bash
# Vérifier que les vues sont utilisées
docker exec asterisk asterisk -rx "pjsip show endpoints"

# Créer un endpoint de test
curl -X POST http://localhost:3001/api/v1/endpoints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "test999",
    "password": "test123",
    "context": "default",
    "transport": "transport-wss",
    "tenantId": 1
  }'

# Vérifier dans Asterisk
docker exec asterisk asterisk -rx "pjsip show endpoint t1_test999"

# Supprimer l'endpoint (soft delete)
curl -X DELETE http://localhost:3001/api/v1/endpoints/t1_test999 \
  -H "Authorization: Bearer $TOKEN"

# Recharger PJSIP
docker exec asterisk asterisk -rx "pjsip reload"

# Vérifier que l'endpoint a disparu d'Asterisk
docker exec asterisk asterisk -rx "pjsip show endpoint t1_test999"
# Devrait retourner : "Endpoint t1_test999 not found"

# Mais l'endpoint existe toujours dans la base
docker exec postgres-container psql -U asterisk_user -d asterisk_db -c \
  "SELECT id, deleted_at FROM ps_endpoints WHERE id = 't1_test999';"
# Devrait retourner : t1_test999 | 2024-11-24 15:30:00+00
```

## 🧪 Tests

Un script de test complet est disponible :

```bash
chmod +x scripts/test-soft-delete-sync.sh
./scripts/test-soft-delete-sync.sh
```

Le script teste :
1. ✅ Création d'endpoint via API
2. ✅ Endpoint visible dans Asterisk
3. ✅ Endpoint actif en base (deleted_at = NULL)
4. ✅ Soft delete via API
5. ✅ Endpoint invisible dans Asterisk
6. ✅ Endpoint toujours en base avec deleted_at
7. ✅ Vue ps_endpoints_active ne contient pas l'endpoint
8. ✅ Table de base conserve les données historiques

## 📊 Vues Disponibles

### Configuration Asterisk (Filtrage Active Records)

| Vue | Source | Utilisation |
|-----|--------|-------------|
| `ps_endpoints_active` | ps_endpoints | Asterisk PJSIP endpoints |
| `ps_auths_active` | ps_auths | Asterisk PJSIP authentication |
| `ps_aors_active` | ps_aors | Asterisk PJSIP AORs |
| `queues_active` | queues | Asterisk queues |
| `queue_members_active` | queue_members | Asterisk queue members |
| `extensions_active` | extensions | Asterisk dialplan |
| `sip_trunks_active` | sip_trunks | SIP trunks (wizard config) |

### Vues de Reporting (Données Historiques)

| Vue | Description |
|-----|-------------|
| `v_cdr_enriched` | CDR avec détails endpoints (même supprimés) |
| `v_queue_call_stats` | Statistiques queues (incluant queues supprimées) |
| `v_endpoint_activity` | Activité endpoints (actifs + supprimés) |
| `v_deletion_audit` | Audit trail de toutes les suppressions |
| `v_tenant_overview` | Vue d'ensemble par tenant (compteurs) |

## 💡 Utilisation dans l'API

### Soft Delete

```typescript
// endpoints.service.ts
async remove(tenantId: number, displayName: string, userId: number, reason?: string): Promise<void> {
  const endpoint = await this.findOne(tenantId, displayName);

  // Soft delete
  endpoint.deletedAt = new Date();
  endpoint.deletedBy = userId;
  endpoint.deletionReason = reason || 'User requested deletion';

  await this.endpointRepository.save(endpoint);

  // Reload PJSIP (Asterisk will use ps_endpoints_active view)
  await this.asteriskService.reloadPJSIP();

  this.logger.log(`Soft deleted endpoint: ${displayName}`);
}
```

### Restaurer un Record

```typescript
async restore(tenantId: number, displayName: string): Promise<PsEndpoint> {
  const endpoint = await this.endpointRepository.findOne({
    where: { tenantId, displayName },
    withDeleted: true, // TypeORM: include soft-deleted
  });

  if (!endpoint) {
    throw new NotFoundException('Endpoint not found');
  }

  endpoint.deletedAt = null;
  endpoint.deletedBy = null;
  endpoint.deletionReason = null;

  const restored = await this.endpointRepository.save(endpoint);
  await this.asteriskService.reloadPJSIP();

  return restored;
}
```

### Queries avec Soft Delete

```typescript
// Trouver seulement les actifs (défaut)
const activeEndpoints = await this.endpointRepository.find({
  where: {
    tenantId,
    deletedAt: IsNull(),
  },
});

// Trouver TOUS (incluant supprimés)
const allEndpoints = await this.endpointRepository.find({
  where: { tenantId },
  withDeleted: true,
});

// Utiliser les vues de reporting
const enrichedCdr = await this.dataSource.query(`
  SELECT * FROM v_cdr_enriched
  WHERE tenant_id = $1
  AND calldate >= $2
`, [tenantId, startDate]);
```

## 🔍 Troubleshooting

### Problème : Endpoint supprimé toujours visible dans Asterisk

**Solution :**
```bash
# 1. Vérifier que la vue filtre correctement
docker exec postgres-container psql -U asterisk_user -d asterisk_db -c \
  "SELECT COUNT(*) FROM ps_endpoints_active WHERE deleted_at IS NOT NULL;"
# Devrait retourner : 0

# 2. Vérifier extconfig.conf
docker exec asterisk cat /etc/asterisk/extconfig.conf | grep ps_endpoints
# Devrait contenir : ps_endpoints => odbc,asterisk,ps_endpoints_active

# 3. Recharger Asterisk
docker exec asterisk asterisk -rx "module reload res_odbc"
docker exec asterisk asterisk -rx "pjsip reload"
```

### Problème : Rapports ne montrent pas les données historiques

**Solution :**
```typescript
// Utiliser les vues de reporting, pas les vues *_active
const stats = await this.dataSource.query(`
  SELECT * FROM v_endpoint_activity
  WHERE tenant_id = $1
`, [tenantId]);

// Ou inclure soft-deleted dans les queries TypeORM
const allEndpoints = await this.endpointRepository.find({
  where: { tenantId },
  withDeleted: true,  // ← Important !
});
```

### Problème : Migration échoue

**Solution :**
```bash
# Vérifier les migrations existantes
npm run typeorm migration:show

# Révertir la dernière migration si nécessaire
npm run typeorm migration:revert

# Réexécuter
npm run migration:run
```

## 📈 Performance

### Index Partiels (Optimisation)

Les index créés par la migration sont **partiels** pour optimiser les queries les plus courantes :

```sql
CREATE INDEX idx_ps_endpoints_deleted_at
ON ps_endpoints(deleted_at)
WHERE deleted_at IS NULL;  -- Index partiel !
```

**Avantages :**
- Index plus petit (seulement les records actifs)
- Queries plus rapides sur records actifs
- Overhead minimal lors de soft delete

### Vues Matérialisées (Pour Rapports Lourds)

Si les vues de reporting sont trop lentes :

```sql
-- Créer une vue matérialisée
CREATE MATERIALIZED VIEW mv_tenant_statistics AS
SELECT /* requête complexe */ FROM v_tenant_overview;

-- Créer un index
CREATE INDEX idx_mv_tenant_statistics_tenant_id
ON mv_tenant_statistics(tenant_id);

-- Rafraîchir périodiquement (cron)
REFRESH MATERIALIZED VIEW mv_tenant_statistics;
```

## 🎓 Exemples Concrets

### Exemple 1 : Employé Quitte l'Entreprise

```bash
# Jour 1 : Employé actif
# - Endpoint : t1_205
# - 5,000 appels sur 2 ans

# Jour 2 : Employé quitte, admin supprime l'endpoint
curl -X DELETE http://localhost:3001/api/v1/endpoints/t1_205 \
  -H "Authorization: Bearer $TOKEN"

# Jour 3 : Génération de rapport mensuel
curl http://localhost:3001/api/v1/statistics/calls?tenantId=1 \
  -H "Authorization: Bearer $TOKEN"

# Résultat :
# ✅ Rapport montre "John Smith (supprimé)" avec 5,000 appels
# ✅ Asterisk ne voit plus l'endpoint (impossible de s'enregistrer)
# ✅ Données historiques préservées pour compliance
```

### Exemple 2 : Suppression Accidentelle

```bash
# Admin supprime une queue par erreur
curl -X DELETE http://localhost:3001/api/v1/queues/support_queue \
  -H "Authorization: Bearer $TOKEN"

# 10 minutes plus tard, réalise l'erreur

# Restaurer la queue
curl -X POST http://localhost:3001/api/v1/queues/support_queue/restore \
  -H "Authorization: Bearer $TOKEN"

# ✅ Queue réapparaît dans Asterisk
# ✅ Toutes les statistiques sont préservées
# ✅ Audit trail conserve l'historique de suppression/restauration
```

## 📝 Conclusion

Les vues PostgreSQL permettent de :

✅ **Synchroniser automatiquement** PostgreSQL ↔ Asterisk
✅ **Préserver les données historiques** pour les rapports
✅ **Audit trail complet** (qui, quand, pourquoi)
✅ **Restauration possible** en cas d'erreur
✅ **Configuration Asterisk propre** (seulement records actifs)
✅ **Performance optimisée** (index partiels)

**Sans les vues**, vous auriez :
❌ Perte de données historiques sur suppression
❌ Rapports incomplets (endpoints "Unknown")
❌ Compliance impossible (aucun audit trail)
❌ Configuration Asterisk polluée par records supprimés
❌ Impossible de restaurer un record supprimé

**Avec les vues**, vous avez :
✅ Le meilleur des deux mondes : configuration propre + données historiques
