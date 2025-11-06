# Test de la Création d'Endpoints avec Auto-génération

## Résumé des changements

### 1. Génération automatique de l'ID d'endpoint
- **Avant**: `t{tenantId}_{username}` (ex: `t1_101`) - basé sur input utilisateur
- **Après**: `t{tenantId}_{agentNumber}` (ex: `t1_1000`, `t1_1001`) - auto-incrémenté

### 2. Génération automatique du username SIP
- **Avant**: Username fourni par l'utilisateur (ex: `101`)
- **Après**: Username aléatoire de 32 caractères (ex: `a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3`)

### 3. Pattern de numérotation
- Basé sur `dialplanConfig.internalDialPattern` du tenant
- Pattern `_1XXX` → commence à 1000 (max: 1999)
- Pattern `_2XXX` → commence à 2000 (max: 2999)
- Pattern `_[1-5]XXX` → commence à 1000 (max: 5999)

## Exemple de requête API

### Avant (ancienne version)
```json
POST /api/v1/endpoints
{
  "username": "101",
  "password": "SecurePassword123",
  "callerid": "John Doe <101>",
  "context": "default",
  "transport": "transport-udp"
}
```

### Après (nouvelle version)
```json
POST /api/v1/endpoints
{
  "password": "SecurePassword123",
  "displayName": "Sales Agent 1",
  "callerid": "Sales Agent <1000>",
  "context": "default",
  "transport": "transport-udp"
}
```

**Note**: Le champ `username` n'est plus nécessaire!

## Exemple de réponse API

```json
{
  "id": "t1_1000",
  "tenantId": 1,
  "transport": "transport-udp",
  "aors": "t1_1000",
  "auth": "t1_1000",
  "context": "default",
  "disallow": "all",
  "allow": "ulaw,alaw",
  "directMedia": "yes",
  "dtmfMode": "rfc4733",
  "callerid": "Sales Agent <1000>",
  "generatedUsername": "a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3",
  "agentNumber": 1000
}
```

**Important**: Le champ `generatedUsername` doit être sauvegardé par le client pour la configuration SIP!

## Structure en base de données

### Table: `ps_endpoints`
| id | tenant_id | transport | aors | auth | context |
|---|---|---|---|---|---|
| t1_1000 | 1 | transport-udp | t1_1000 | t1_1000 | default |
| t1_1001 | 1 | transport-udp | t1_1001 | t1_1001 | default |

### Table: `ps_auths`
| id | tenant_id | auth_type | username | password | realm |
|---|---|---|---|---|---|
| t1_1000 | 1 | userpass | a7k9m2p8... | SecurePass123 | asterisk |
| t1_1001 | 1 | userpass | x3j5k7m9... | AnotherPass456 | asterisk |

**Note**: Le username dans `ps_auths` est aléatoire et NON préfixé!

### Table: `ps_aors`
| id | tenant_id | max_contacts |
|---|---|---|
| t1_1000 | 1 | 1 |
| t1_1001 | 1 | 1 |

## Configuration SIP côté client

Le client doit utiliser le **username généré** pour s'authentifier:

```ini
[SIP Account]
Server: asterisk.example.com
Username: a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3  ; ← Username aléatoire généré
Password: SecurePassword123
Extension: 1000  ; ← Agent number (pour affichage)
```

## Tests à effectuer

### 1. Création du premier agent (tenant 1, pattern _1XXX)
```bash
curl -X POST http://localhost:3000/api/v1/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "password": "TestPassword123",
    "context": "default"
  }'
```

**Résultat attendu**:
- `id`: `t1_1000`
- `agentNumber`: `1000`
- `generatedUsername`: chaîne aléatoire de 32 caractères

### 2. Création du deuxième agent (même tenant)
```bash
curl -X POST http://localhost:3000/api/v1/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "password": "TestPassword456",
    "displayName": "Support Agent 2"
  }'
```

**Résultat attendu**:
- `id`: `t1_1001`
- `agentNumber`: `1001`
- `generatedUsername`: chaîne aléatoire différente

### 3. Création pour un autre tenant (tenant 2, pattern _2XXX)
```bash
curl -X POST http://localhost:3000/api/v1/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 2,
    "password": "AnotherPassword789"
  }'
```

**Résultat attendu**:
- `id`: `t2_2000`
- `agentNumber`: `2000`
- `generatedUsername`: chaîne aléatoire

### 4. Test avec WebRTC
```bash
curl -X POST http://localhost:3000/api/v1/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "password": "WebRTCPass123",
    "transport": "transport-wss",
    "displayName": "WebRTC Agent"
  }'
```

**Résultat attendu**:
- `id`: `t1_1002`
- `webrtc`: `yes`
- Configuration WebRTC complète
- `generatedUsername`: chaîne aléatoire

## Validation

### ✅ Checklist
- [ ] Agent ID est auto-incrémenté (1000, 1001, 1002...)
- [ ] Agent ID respecte le pattern du tenant (_1XXX, _2XXX)
- [ ] Username SIP est aléatoire et < 40 caractères
- [ ] Username SIP est unique (pas de collision)
- [ ] Username SIP est NON préfixé (pas de `t1_`)
- [ ] Endpoint ID est préfixé (`t1_1000`)
- [ ] Le username généré est retourné dans la réponse
- [ ] Multiple créations successives incrémentent correctement
- [ ] Tenants différents ont des numérotations indépendantes

## Compatibilité Asterisk

### SIP Registration
Asterisk utilise `identify_by: 'username'` pour matcher les inscriptions SIP.

**Exemple de registration**:
```
User-Agent → Asterisk
REGISTER sip:asterisk.example.com SIP/2.0
Authorization: Digest username="a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3", ...
```

Asterisk cherche dans `ps_auths` où `username = 'a7k9m2p8n4x6v1b3c5d7e9f2g4h6j1k3'`
→ Trouve l'auth avec `id = 't1_1000'`
→ Authentifie l'utilisateur
→ Associe au endpoint `t1_1000`

## Fichiers modifiés

1. **Nouveaux fichiers**:
   - `src/common/utils/random-username.util.ts` - Génération de username aléatoire
   - `src/common/utils/dialplan-pattern.util.ts` - Parsing du pattern de numérotation

2. **Fichiers modifiés**:
   - `src/endpoints/endpoints.service.ts` - Logique de création avec auto-génération
   - `src/endpoints/dto/create-endpoint.dto.ts` - Suppression du champ `username` requis
