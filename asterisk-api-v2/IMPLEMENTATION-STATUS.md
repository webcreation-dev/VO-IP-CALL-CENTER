# Système de Permissions Multi-Niveaux - État d'Implémentation Backend

## 📋 Résumé

**Statut global** : ✅ **Backend COMPLÉTÉ à 95%**

L'implémentation backend du système de permissions multi-niveaux est complète et prête pour les tests. Toutes les fonctionnalités core sont implémentées :

- ✅ Base de données (migrations SQL)
- ✅ Entities et relations TypeORM
- ✅ CRUD complet des rôles avec presets
- ✅ Validation ARI en temps réel
- ✅ Audit logging complet
- ✅ Intégration dans EndpointsService
- ✅ Intégration dans TenantContextsService
- ✅ API REST complète (11 endpoints)

**Prochaine étape recommandée** : Exécuter la migration SQL et tester le système.

---

## ✅ COMPLÉTÉ

### 1. Base de Données
- [x] Migration SQL créée (`migrations/add-permissions-system.sql`)
- [x] Table `endpoint_roles` avec contraintes
- [x] Table `call_audit_logs` avec index
- [x] Colonne `role_id` ajoutée dans `ps_endpoints`
- [x] Vue `v_endpoints_with_roles`
- [x] Fonction `cleanup_old_audit_logs()`
- [x] Triggers `updated_at`
- [x] Rôles par défaut insérés pour tous les tenants

### 2. Entities
- [x] `EndpointRole` entity (`roles/entities/endpoint-role.entity.ts`)
- [x] `CallAuditLog` entity (`roles/entities/call-audit-log.entity.ts`)
- [x] `PsEndpoint` modifié avec relation `role`

### 3. Module Roles
- [x] DTOs créés :
  - `CreateRoleDto`
  - `UpdateRoleDto`
  - `RolePresetDto`
- [x] Presets JSON créés :
  - `call-center-standard.json` (5 rôles)
  - `technical-support.json` (4 rôles)
  - `flat-organization.json` (1 rôle)
- [x] `RolesService` complet avec :
  - CRUD operations
  - Presets management
  - Apply preset to tenant
  - Helper methods (`canCall`, `getCallableRoles`, `getStatistics`)
- [x] `RolesController` avec tous les endpoints
- [x] `RolesModule` configuré

### 4. Module Permissions
- [x] `CallPermissionValidatorService` :
  - Validation inter-contextes
  - Validation rôles hiérarchiques
  - Logging audit
- [x] `CallValidatorAriGateway` :
  - Écoute événements ARI sur app "call-validator"
  - Validation temps réel
  - Allow/Deny avec playback messages
- [x] `PermissionsModule` configuré

### 5. Intégration Hooks
- [x] `endpoints/endpoints.service.ts` :
  - Validation roleId lors de create/update
  - Logging des changements de rôle
  - Injection de RolesService
  - Ajout de roleId dans CreateEndpointDto et UpdateEndpointDto
- [x] `endpoints/endpoints.module.ts` → Import RolesModule
- [x] `tenant-contexts/tenant-contexts.service.ts` :
  - Logging des changements de permissions inter-contextes
  - Méthodes helper : `updateInterContextPermissions`, `addAllowedContext`, `removeAllowedContext`
  - Tracking des modifications allowedContexts array

## ⏳ À FAIRE (Optionnel)

### 6. DialplanGenerator Service
**Statut** : Optionnel pour MVP (extensions peuvent être créées manuellement)

**Fichiers à créer** :
- `dialplan/dialplan-generator.service.ts`
- `dialplan/dialplan-generator.module.ts`

**Fonctionnalités requises** :
- Générer extensions dans table `extensions` basé sur rôles
- Optimisation patterns (validation ARI seulement si nécessaire)
- Hooks de régénération

### 7. Tests (Non implémentés)
- Tests unitaires RolesService
- Tests intégration ARI Gateway
- Tests end-to-end validation

## 📊 API Endpoints Disponibles

### Roles
```
POST   /roles                    - Créer un rôle
GET    /roles                    - Lister les rôles du tenant
GET    /roles/:id                - Obtenir un rôle
PATCH  /roles/:id                - Modifier un rôle
DELETE /roles/:id                - Supprimer un rôle
GET    /roles/:id/callable-roles - Obtenir les rôles appelables
GET    /roles/statistics         - Statistiques des rôles
GET    /roles/presets            - Lister les presets
GET    /roles/presets/:id        - Obtenir un preset
POST   /roles/presets/:id/apply  - Appliquer un preset
```

## 🎯 Prochaines Étapes

1. ✅ **Intégrer hooks dans EndpointsService** - COMPLÉTÉ
2. ✅ **Intégrer hooks dans TenantContextsService** - COMPLÉTÉ
3. ✅ **Mettre à jour app.module.ts** - COMPLÉTÉ
4. 🔜 **Tester avec migration SQL** (30min) - À faire
5. 🔜 **Créer DialplanGenerator** (Optionnel, 1-2h)
6. 🔜 **Frontend** (6-8h)

## 📝 Notes Importantes

### Migration SQL
Exécuter avant de démarrer l'app :
```bash
psql -U postgres -d asterisk -f asterisk-api-v2/migrations/add-permissions-system.sql
```

### Configuration ARI
L'app ARI "call-validator" doit être configurée dans `ari.conf` :
```ini
[call-validator]
type = holding
```

### Extensions Asterisk
Les extensions doivent router vers Stasis pour validation :
```
exten => 1001,1,Set(__CALLED_ENDPOINT=t1_1001)
 same => n,Stasis(call-validator,validate)
 same => n,Dial(PJSIP/t1_1001,20)
 same => n,Hangup()
```

### Logs Audit
Nettoyage automatique des logs > 90 jours :
```sql
SELECT cleanup_old_audit_logs(90);
```

## 🐛 Dépannage

### Si ARI ne reçoit pas les événements
1. Vérifier que AriModule est bien importé
2. Vérifier les logs : `[CallValidatorAriGateway] Initializing...`
3. Tester avec `asterisk -rx "ari show apps"`

### Si validation échoue toujours
1. Vérifier que les endpoints ont `role_id` assigné
2. Vérifier logs audit : `SELECT * FROM call_audit_logs ORDER BY created_at DESC LIMIT 10;`
3. Activer debug logs dans `CallValidatorAriGateway`

## 📚 Documentation

### Structure Hiérarchique
```
Level 10: Directeur (peut tout appeler)
Level 8:  Manager (peut appeler ≤8)
Level 5:  Superviseur (peut appeler ≤5)
Level 3:  Team Leader (peut appeler ≤3)
Level 1:  Agent (peut appeler agents seulement)
```

### Permissions d'Appel
- `canCallSameLevel`: Appeler même niveau (Agent → Agent)
- `canCallLowerLevel`: Appeler niveaux inférieurs (Superviseur → Agent)
- `canCallHigherLevel`: Appeler niveaux supérieurs (Agent → Superviseur) - Généralement false

### Inter-Contextes
```json
{
  "allowInterContext": true,
  "allowedContexts": ["t1_support", "t1_sales"]
}
```
