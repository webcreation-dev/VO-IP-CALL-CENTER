# Documentation - Flux de création d'un Context Tenant

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Flux détaillé étape par étape](#flux-détaillé-étape-par-étape)
4. [Tables de base de données affectées](#tables-de-base-de-données-affectées)
5. [Propagation vers Asterisk](#propagation-vers-asterisk)
6. [Validations effectuées](#validations-effectuées)
7. [Exemples](#exemples)

---

## Vue d'ensemble

Un **Tenant Context** est un espace isolé dans le dialplan Asterisk qui permet à chaque tenant (organisation/entreprise) d'avoir son propre ensemble d'extensions et de règles d'appel.

### Caractéristiques clés

- **Préfixe automatique** : Tous les contexts sont préfixés par `t{tenantId}_` (ex: `t17_sales`)
- **Isolation multi-tenant** : Chaque tenant ne peut pas accéder aux contexts des autres
- **Dialplan dynamique** : Les extensions sont stockées en base de données et chargées par Asterisk via Realtime
- **Gestion des rôles** : Support optionnel de hiérarchies (FLAT ou HIERARCHICAL)
- **Fichier de configuration** : Un fichier `extensions_dynamic.conf` est généré avec `switch => Realtime`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT HTTP                                                 │
│  POST /api/v1/contexts                                       │
│  Body: { tenantId, name, roleStrategy, presetId, ... }       │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  CONTROLLER (tenant-contexts.controller.ts)                  │
│  - Validation JWT + Rôles (SUPER_ADMIN / TENANT_ADMIN)      │
│  - Validation DTO (class-validator)                          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICE (tenant-contexts.service.ts)                        │
│  - Génération du nom: t{tenantId}_{name}                    │
│  - Vérification d'unicité                                    │
│  - Création en DB                                            │
│  - Application des rôles (si context-specific)               │
│  - Génération du dialplan                                    │
│  - Écriture du fichier extensions_dynamic.conf              │
│  - Reload Asterisk via AMI                                   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ASTERISK (Realtime)                                         │
│  - Relit extensions_dynamic.conf                             │
│  - Détecte le nouveau context                                │
│  - Charge les extensions depuis PostgreSQL                   │
│  - Context actif immédiatement                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Flux détaillé étape par étape

### ÉTAPE 1 : Réception de la requête HTTP

**Fichier** : `tenant-contexts.controller.ts:171-181`

**Endpoint** : `POST /api/v1/contexts`

**Validation des droits** :
- Seuls les rôles `SUPER_ADMIN` et `TENANT_ADMIN` peuvent créer des contexts
- Décorateur `@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)` (ligne 137)

**DTO validé** : `CreateTenantContextDto`
```typescript
{
  tenantId: number;           // Requis
  name: string;               // Requis (min 1 caractère)
  description?: string;       // Optionnel
  dialplanConfig?: object;    // Optionnel
  roleStrategy?: 'context-specific' | 'use-tenant-roles';  // Optionnel
  presetId?: string;          // Optionnel (requis si roleStrategy='context-specific')
  customRoles?: CustomRoleDto[];  // Optionnel
}
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3001/api/v1/contexts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 17,
    "name": "sales",
    "description": "Département des ventes",
    "roleStrategy": "context-specific",
    "presetId": "call_center_standard"
  }'
```

---

### ÉTAPE 2 : Génération du nom du context

**Fichier** : `tenant-contexts.service.ts:142`

**Logique** :
```typescript
const contextName = `t${tenantId}_${name}`;
```

**Exemple** :
- Input : `tenantId=17`, `name="sales"`
- Output : `contextName="t17_sales"`

---

### ÉTAPE 3 : Vérification de l'existence

**Fichier** : `tenant-contexts.service.ts:144-151`

**Requête SQL** :
```sql
SELECT * FROM tenant_contexts WHERE name = 't17_sales';
```

**Si existe** → Lève une `ConflictException` avec message :
```
Context with name 't17_sales' already exists
```

---

### ÉTAPE 4 : Création de l'entité en base de données

**Fichier** : `tenant-contexts.service.ts:153-166`

**Table affectée** : `tenant_contexts`

**Colonnes insérées** :
```typescript
{
  id: auto-généré,
  tenantId: 17,
  name: "t17_sales",
  description: "Département des ventes",
  isPrimary: false,
  dialplanConfig: {
    allowInbound: true,
    allowOutbound: true,
    allowInternal: true,
    allowInterContext: false
  },
  createdAt: NOW(),
  updatedAt: NOW()
}
```

**Requête SQL équivalente** :
```sql
INSERT INTO tenant_contexts (tenant_id, name, description, is_primary, dialplan_config)
VALUES (17, 't17_sales', 'Département des ventes', false, '{"allowInbound":true,...}'::jsonb)
RETURNING *;
```

---

### ÉTAPE 5 : Application du preset de rôles (conditionnel)

**Condition** : Si `roleStrategy === 'context-specific' && presetId` existe

**Fichier** : `tenant-contexts.service.ts:168-194`

**Service appelé** : `RolesService.applyPresetToContext()`
**Fichier** : `roles/roles.service.ts:452-499`

#### Sous-étapes :

1. **Récupération du preset** (ligne 458)
   ```typescript
   const preset = await this.getPreset(presetId);
   ```

   Requête SQL :
   ```sql
   SELECT rp.*, rpr.*
   FROM role_presets rp
   LEFT JOIN role_preset_roles rpr ON rpr.preset_id = rp.id
   WHERE rp.preset_id = 'call_center_standard';
   ```

2. **Vérification des rôles existants** (lignes 464-473)
   ```sql
   SELECT COUNT(*) FROM endpoint_roles
   WHERE tenant_id = 17 AND context_id = {savedContext.id};
   ```

3. **Création des rôles** (lignes 476-491)

   **Table affectée** : `endpoint_roles`

   Pour chaque rôle du preset :
   ```sql
   INSERT INTO endpoint_roles (tenant_id, context_id, name, display_name, level, ...)
   VALUES (17, {contextId}, 'agent', 'Agent', 1, ...);
   ```

   **Exemple pour `call_center_standard`** :
   - 5 rôles insérés : agent (level 1), team_leader (3), supervisor (5), manager (8), director (10)

---

### ÉTAPE 6 : Création du dialplan par défaut

**Fichier** : `tenant-contexts.service.ts:307-434`

**Méthode** : `createDefaultDialplan()`

#### 6.1 Détection du type d'organisation

**Fichier** : `tenant-contexts.service.ts:261-294`

**Méthode** : `isFlatOrganization()`

**Logique de détection** :
```sql
SELECT * FROM endpoint_roles
WHERE tenant_id = 17 AND context_id = {contextId}
ORDER BY level ASC;
```

**Organisation FLAT si** :
- Aucun rôle context-specific OU
- Tous les rôles au même level OU
- Tous les rôles avec permissions illimitées (can_call_same/lower/higher = true)

**Organisation HIERARCHICAL sinon**

#### 6.2 Génération des extensions

**Table affectée** : `extensions`

##### A. Si organisation FLAT

**3 priorités pour l'extension `_1XXX`** (appels internes 1000-1999) :

```sql
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) VALUES
(17, 't17_sales', '_1XXX', 1, 'NoOp', 'Internal call to ${EXTEN} [FLAT ORG - No validation]'),
(17, 't17_sales', '_1XXX', 2, 'Dial', 'PJSIP/t17_${EXTEN},20,TtWw'),
(17, 't17_sales', '_1XXX', 3, 'Hangup', '');
```

**Flux d'appel** : NoOp → Dial direct → Hangup

##### B. Si organisation HIERARCHICAL

**5 priorités pour l'extension `_1XXX`** (avec validation ARI) :

```sql
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) VALUES
(17, 't17_sales', '_1XXX', 1, 'NoOp', 'Internal call from ${CALLERID(num)} to ${EXTEN} [HIERARCHICAL - Validation required]'),
(17, 't17_sales', '_1XXX', 2, 'Set', '__CALLED_ENDPOINT=t17_${EXTEN}'),
(17, 't17_sales', '_1XXX', 3, 'Stasis', 'call-validator,validate'),
(17, 't17_sales', '_1XXX', 4, 'Dial', 'PJSIP/t17_${EXTEN},20,TtWw'),
(17, 't17_sales', '_1XXX', 5, 'Hangup', '');
```

**Flux d'appel** : NoOp → Set variable → Validation ARI → Dial → Hangup

##### C. Extension 999 (Echo Test) - Identique pour les deux types

```sql
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) VALUES
(17, 't17_sales', '999', 1, 'Answer', ''),
(17, 't17_sales', '999', 2, 'Echo', ''),
(17, 't17_sales', '999', 3, 'Hangup', '');
```

**Total d'insertions** :
- **FLAT** : 6 lignes (3 pour _1XXX + 3 pour 999)
- **HIERARCHICAL** : 8 lignes (5 pour _1XXX + 3 pour 999)

---

### ÉTAPE 7 : Génération du fichier de configuration

**Fichier** : `tenant-contexts.service.ts:45-94`

**Méthode** : `generateDynamicContexts()`

**Chemin du fichier** : `/etc/asterisk/extensions_dynamic.conf`

**Contenu généré** :
```ini
; Auto-generated dynamic contexts for multitenancy
; Generated at: 2025-01-19T10:30:00.000Z
; Total contexts: 3
; DO NOT EDIT MANUALLY - Changes will be overwritten

[tenant_template](!)
switch => Realtime

; Tenant 17 contexts
[t17_default](tenant_template)
; Primary context for tenant 17
; PRIMARY CONTEXT

[t17_sales](tenant_template)
; Département des ventes
```

**IMPORTANT** :
- Le fichier contient UNIQUEMENT les déclarations de contexts avec `switch => Realtime`
- Les extensions ne sont PAS dans ce fichier
- Les extensions sont chargées DYNAMIQUEMENT depuis PostgreSQL

---

### ÉTAPE 8 : Propagation vers Asterisk

**Fichier** : `tenant-contexts.service.ts:197`

**Service appelé** : `AsteriskConfigService.reloadDialplan()`

#### Méthode : AMI (Asterisk Manager Interface)

**Fichier** : `core/asterisk/ami/ami.service.ts:575-581`

**Commande AMI envoyée** :
```
Action: Command
Command: dialplan reload
```

**Réponse attendue** :
```
Response: Success
Message: Command output follows
Output: Dialplan reloaded.
```

#### Effet dans Asterisk

1. Asterisk relit `extensions_dynamic.conf`
2. Détecte le nouveau context `[t17_sales]`
3. Configure `switch => Realtime` pour ce context
4. Charge les extensions depuis PostgreSQL via Realtime
5. Le context est actif **immédiatement**

---

### ÉTAPE 9 : Retour de la réponse

**Fichier** : `tenant-contexts.service.ts:201`

**Status HTTP** : `201 Created`

**Objet retourné** :
```json
{
  "id": 42,
  "tenantId": 17,
  "name": "t17_sales",
  "description": "Département des ventes",
  "isPrimary": false,
  "dialplanConfig": {
    "allowInbound": true,
    "allowOutbound": true,
    "allowInternal": true,
    "allowInterContext": false
  },
  "createdAt": "2025-01-19T10:30:00.000Z",
  "updatedAt": "2025-01-19T10:30:00.000Z"
}
```

---

## Tables de base de données affectées

### 1. `tenant_contexts`

**Opération** : 1 INSERT

**Schéma** :
```sql
CREATE TABLE tenant_contexts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  dialplan_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Index** :
- `idx_tenant_contexts_primary` (UNIQUE sur tenant_id WHERE is_primary = true)
- `idx_tenant_contexts_tenant_id`
- `idx_tenant_contexts_name` (UNIQUE)

---

### 2. `endpoint_roles` (si roleStrategy = 'context-specific')

**Opération** : N INSERTs (selon le nombre de rôles dans le preset)

**Schéma** :
```sql
CREATE TABLE endpoint_roles (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id INTEGER REFERENCES tenant_contexts(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  can_call_same_level BOOLEAN NOT NULL DEFAULT true,
  can_call_lower_level BOOLEAN NOT NULL DEFAULT false,
  can_call_higher_level BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Point important** : `context_id` peut être NULL (rôles tenant-wide) ou un ID (rôles context-specific)

---

### 3. `extensions`

**Opération** :
- 6 INSERTs pour organisation FLAT
- 8 INSERTs pour organisation HIERARCHICAL

**Schéma** :
```sql
CREATE TABLE extensions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  context VARCHAR(40) NOT NULL,
  exten VARCHAR(40) NOT NULL,
  priority INTEGER NOT NULL,
  app VARCHAR(40) NOT NULL,
  appdata VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, context, exten, priority)
);
```

**Index** :
- `idx_extensions_tenant_id`
- `idx_extensions_context`

**Contrainte d'unicité** : `(tenant_id, context, exten, priority)`

---

## Propagation vers Asterisk

### Méthode utilisée : AMI + Realtime

#### 1. AMI (Asterisk Manager Interface)

**Rôle** : Recharger le dialplan après création du context

**Connexion AMI** :
- Host : configuré via `ami.host` (ex: asterisk)
- Port : 5038
- User : configuré via `ami.user`
- Password : configuré via `ami.password`

**Commande** : `dialplan reload`

#### 2. Realtime

**Directive dans extensions_dynamic.conf** :
```ini
[t17_sales](tenant_template)
```

**Template** :
```ini
[tenant_template](!)
switch => Realtime
```

**Effet** : Asterisk charge les extensions depuis PostgreSQL **à la demande** (lazy loading)

**Configuration Asterisk** (`extconfig.conf`) :
```ini
[settings]
extensions => odbc,asterisk,extensions
```

**Lorsqu'un appel arrive dans `t17_sales`** :

1. Asterisk détecte `switch => Realtime`
2. Exécute une requête SQL :
   ```sql
   SELECT * FROM extensions
   WHERE context = 't17_sales' AND exten LIKE '%'
   ORDER BY priority ASC;
   ```
3. Charge les extensions en mémoire
4. Exécute le dialplan

#### 3. ARI (Asterisk REST Interface)

**Rôle** : Validation hiérarchique pour les organisations HIERARCHICAL

**Application ARI** : `call-validator`

**Déclenchement** :
```
Dialplan: Stasis(call-validator,validate)
```

**Service ARI** : Valide que l'appelant a le droit d'appeler le destinataire selon les rôles hiérarchiques

---

## Validations effectuées

### 1. Au niveau Controller

**Fichier** : `tenant-contexts.controller.ts:137`

**Validation des rôles** :
```typescript
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
```

**Validation du DTO** (via `class-validator`) :
- `tenantId` : doit être un nombre
- `name` : chaîne d'au moins 1 caractère
- `roleStrategy` : doit être `'context-specific'` ou `'use-tenant-roles'`
- `presetId` : doit être `'call_center_standard'`, `'technical_support'` ou `'flat_organization'`

---

### 2. Au niveau Service

**Fichier** : `tenant-contexts.service.ts`

**Validations** :

1. **Nom unique** (lignes 144-151)
   ```typescript
   const existing = await this.tenantContextRepo.findOne({ where: { name: contextName } });
   if (existing) throw new ConflictException(...);
   ```

2. **isPrimary forcé à false** (ligne 157)
   ```typescript
   isPrimary: false  // Never create additional primary contexts
   ```

3. **dialplanConfig par défaut** (lignes 158-163)
   ```typescript
   dialplanConfig: dialplanConfig || {
     allowInbound: true,
     allowOutbound: true,
     allowInternal: true,
     allowInterContext: false
   }
   ```

---

### 3. Au niveau RolesService

**Fichier** : `roles/roles.service.ts`

**Validations** :

1. **Preset existe** (lignes 458-462)
   ```typescript
   const preset = await this.getPreset(presetId);
   if (!preset) throw new NotFoundException(...);
   ```

2. **Aucun rôle existant** (lignes 464-473)
   ```typescript
   const existingRoles = await this.roleRepository.count({ where: { tenantId, contextId } });
   if (existingRoles > 0) throw new BadRequestException(...);
   ```

3. **Validation des rôles** (méthode `validateRoles()`, lignes 606-629)
   - Noms uniques
   - Niveaux uniques
   - Niveaux entre 1 et 10

---

### 4. Au niveau ExtensionsService

**Fichier** : `extensions/extensions.service.ts`

**Validations** :

1. **Ownership du context** (ligne 70)
   ```typescript
   await this.validateContextOwnership(tenantId, dto.context);
   ```

2. **Contrainte d'unicité en base**
   ```sql
   UNIQUE (tenant_id, context, exten, priority)
   ```

---

## Exemples

### Exemple 1 : Créer un context FLAT

**Requête** :
```bash
curl -X POST http://localhost:3001/api/v1/contexts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 17,
    "name": "support",
    "description": "Équipe support client",
    "roleStrategy": "use-tenant-roles"
  }'
```

**Résultat** :
- Context créé : `t17_support`
- Aucun rôle context-specific (utilise les rôles du tenant)
- 6 lignes dans `extensions` (3 pour _1XXX + 3 pour 999)
- Appels directs sans validation ARI

---

### Exemple 2 : Créer un context HIERARCHICAL

**Requête** :
```bash
curl -X POST http://localhost:3001/api/v1/contexts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 17,
    "name": "sales",
    "description": "Équipe commerciale",
    "roleStrategy": "context-specific",
    "presetId": "call_center_standard"
  }'
```

**Résultat** :
- Context créé : `t17_sales`
- 5 rôles context-specific insérés dans `endpoint_roles` :
  - agent (level 1)
  - team_leader (level 3)
  - supervisor (level 5)
  - manager (level 8)
  - director (level 10)
- 8 lignes dans `extensions` (5 pour _1XXX + 3 pour 999)
- Appels validés via ARI avant d'être connectés

**Validation hiérarchique** :
- Un agent (level 1) peut appeler d'autres agents (same level)
- Un agent NE peut PAS appeler un manager (level 8)
- Un manager peut appeler les agents et autres managers
- Un directeur peut appeler tout le monde

---

### Exemple 3 : Vérifier le context dans Asterisk

```bash
# Connexion CLI Asterisk
docker exec -it asterisk asterisk -rx "dialplan show t17_sales"

# Sortie attendue:
# [ Context 't17_sales' created by 'pbx_config' ]
#   '_1XXX' =>        1. NoOp(Internal call from ${CALLERID(num)} to ${EXTEN} [HIERARCHICAL - Validation required])
#                     2. Set(__CALLED_ENDPOINT=t17_${EXTEN})
#                     3. Stasis(call-validator,validate)
#                     4. Dial(PJSIP/t17_${EXTEN},20,TtWw)
#                     5. Hangup()
#   '999' =>          1. Answer()
#                     2. Echo()
#                     3. Hangup()
```

---

## Résumé

**Flux complet** :
1. Requête HTTP → Controller → Service
2. Génération du nom préfixé (`t{tenantId}_{name}`)
3. Insertion dans `tenant_contexts`
4. Si `roleStrategy='context-specific'` → Insertion dans `endpoint_roles`
5. Détection du type d'organisation (FLAT vs HIERARCHICAL)
6. Insertion dans `extensions` (6 ou 8 lignes)
7. Génération de `extensions_dynamic.conf`
8. Reload Asterisk via AMI
9. Context actif immédiatement

**Fichiers modifiés** :
- Base de données : `tenant_contexts`, `endpoint_roles`, `extensions`
- Fichier Asterisk : `/etc/asterisk/extensions_dynamic.conf`

**Communication Asterisk** :
- AMI : `dialplan reload`
- Realtime : Chargement dynamique des extensions depuis PostgreSQL
- ARI : Validation hiérarchique lors des appels (organisations HIERARCHICAL uniquement)

**Point clé** : Les extensions ne sont JAMAIS dans un fichier statique, elles sont toujours en base de données et chargées dynamiquement par Asterisk grâce à `switch => Realtime`.
