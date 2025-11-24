# SIP Trunk Management - Quick Reference Guide

## File Locations
- **Backend**: `/asterisk-api-v2/src/registrations/`
- **Frontend**: `/call-center/src/api/trunks.ts`
- **Database**: `sip_trunks` table (PostgreSQL)
- **Asterisk Config**: `pjsip_wizard.conf` (in Docker container)

## Core Files
| File | Lines | Purpose |
|------|-------|---------|
| registrations.service.ts | 814 | Main business logic |
| config-file.service.ts | 636 | pjsip_wizard.conf management |
| registrations.controller.ts | 507 | REST API endpoints |
| sip-trunk.entity.ts | 119 | TypeORM entity |

## Database Columns (sip_trunks table)

### SIP Configuration
- name (VARCHAR 40, UNIQUE) - trunk identifier
- remote_host (VARCHAR 255) - server IP:PORT
- username (VARCHAR 100) - SIP username
- password (VARCHAR 100) - SIP password
- transport (VARCHAR 40) - default: 'transport-udp'
- context (VARCHAR 100) - default: 'from-trunk'

### Registration Options
- sends_registrations (BOOLEAN) - default: true
- sends_auth (BOOLEAN) - default: true
- client_uri, server_uri (VARCHAR 255)
- retry_interval (INTEGER) - seconds, default: 60
- expiration (INTEGER) - seconds, default: 3600
- max_retries (INTEGER) - default: 10
- forbidden_retry_interval (INTEGER) - default: 0
- line, support_path (BOOLEAN)
- outbound_proxy (VARCHAR 255)

### Tenant & Routing
- tenant_id (INTEGER, NULLABLE FK) - NULL = global trunk
- destination_type (VARCHAR 20) - 'queue', 'extension', 'ivr'
- destination_id (VARCHAR 100) - queue name, extension #, IVR ID
- did_pattern (VARCHAR 100) - default: '_X.'

### Metadata
- display_name, description, enabled, created_at, updated_at

## Key APIs (REST Endpoints)

### Create
```
POST /registrations
  Query: tenantId? (number)
  Body: { name, remote_host, username, password, ... }
  Response: 201 - SipTrunkRegistration
```

### Read
```
GET /registrations
  Query: with_status? ('true'|'1')
  Response: 200 - SipTrunkRegistration[]

GET /registrations/:id
  Query: with_status? ('true'|'1')
  Response: 200 - SipTrunkRegistration
```

### Update
```
PATCH /registrations/:id
  Body: { remote_host?, username?, ... }
  Response: 200 - SipTrunkRegistration
```

### Delete
```
DELETE /registrations/:id
  Response: 204 No Content
```

### Registration Control
```
POST /registrations/:id/register
  Response: 200 - { message }
  (Forces registration attempt via AMI)
```

### Tenant Association
```
POST /registrations/:id/associate-tenant
  Body: { tenantId }
  Response: 200 - SipTrunkRegistration

DELETE /registrations/:id/dissociate-tenant
  Response: 200 - SipTrunkRegistration
```

### Routing
```
PATCH /registrations/:id/routing
  Body: { destination_type?, destination_id?, did_pattern? }
  Response: 200 - { message, trunk, extensions_created }

GET /registrations/:id/routing
  Response: 200 - { destination_type, destination_id, did_pattern, extensions }
```

### Status
```
GET /registrations/status/ami
  Response: 200 - RegistrationStatus[]

GET /registrations/status/all
  Query: lang? ('en'|'fr')
  Response: 200 - MetadataEntry[]
```

## Service Methods (RegistrationsService)

### CRUD
- `create(dto, tenantId?)` - Create trunk
- `findAll(tenantId?)` - Get all trunks
- `findOne(name, tenantId?)` - Get single trunk
- `update(name, dto, tenantId?)` - Update trunk
- `remove(name, tenantId?)` - Delete trunk

### Status & AMI
- `getRegistrationStatus(id)` - Get current status
- `getAllRegistrationStatusesFromAMI()` - Query Asterisk
- `forceRegister(name, tenantId?)` - Force registration attempt

### Tenant Management
- `associateTenant(trunkId, tenantId)` - Assign to tenant
- `dissociateTenant(trunkId)` - Remove tenant

### Routing
- `updateRouting(name, dto, tenantId?)` - Configure routing
- `getRouting(name, tenantId?)` - Get routing config
- `createRoutingExtensions(trunk)` - Create extensions
- `removeRoutingExtensions(trunk)` - Delete extensions
- `validateDestination(type, id, tenantId)` - Validate destination

### Helpers
- `entityToInterface(entity)` - Convert entity to interface
- `parseRegistrationStatus(regInfo)` - Parse AMI output

## Service Methods (ConfigFileService)

- `readConfigFile()` - Read pjsip_wizard.conf from Docker
- `parseWizardConfig(content)` - Parse ini format
- `writeConfigFile(registrations)` - Write to Docker
- `generateFromDatabase()` - Regenerate from DB (KEY METHOD)
- `generateTrunkSection(trunk)` - Generate [trunk] section
- `generateWizardSection(registration)` - Convert to ini
- `backupConfig()` - Create backup

## Database Migrations

1. `1762588463699-InitialSchema.ts`
   - Creates sip_trunks table
   - FK to tenants table

2. `1762619657000-AddTrunkRoutingFields.ts`
   - Adds destination_type, destination_id, did_pattern

3. `1762776202000-MakeTrunkTenantOptional.ts`
   - Makes tenant_id NULLABLE
   - Allows global trunks (tenantId = NULL)

## pjsip_wizard.conf Format Example

```ini
[operator_trunk]
type = wizard
sends_registrations = yes
sends_auth = yes
accepts_registrations = no
remote_hosts = 197.234.218.195:25060
outbound_auth/username = 62908521
outbound_auth/password = 167d458f-8
endpoint/transport = transport-udp
endpoint/context = from-trunk
endpoint/disallow = all
endpoint/allow = alaw,ulaw
endpoint/from_user = 62908521
endpoint/direct_media = no
aor/qualify_frequency = 60
server_uri = sip:197.234.218.195:25060
client_uri = sip:62908521@197.234.218.195:25060
registration/retry_interval = 60
registration/expiration = 3600
registration/max_retries = 10
```

## Data Flow

### Create Trunk
```
POST /registrations (global trunk)
  ↓
Create SipTrunk entity
  ↓
Save to DB
  ↓
ConfigFileService.generateFromDatabase()
  ↓
Regenerate entire pjsip_wizard.conf
  ↓
module reload res_pjsip_wizard.conf (AMI)
```

### Associate & Route
```
POST /associate-tenant
  ↓
Update tenant_id in DB
  ↓
Regenerate config
  ↓
PATCH /routing
  ↓
Create dialplan extension
  ↓
Extension routes to destination (queue/extension/IVR)
```

## Frontend (TrunksService)

**Location**: `/call-center/src/api/trunks.ts`

**Methods**: 13 public methods
- getAll(), getById()
- create(), update(), delete()
- forceRegister()
- associateTenant(), dissociateTenant()
- updateRouting(), getRouting()
- getRegistrationStatuses()

**Data Transformation**:
- Backend: snake_case (remote_hosts, sends_registrations)
- Frontend: camelCase (remoteHost, sendsRegistrations)

## Key Constraints

1. **Global Trunks** (tenantId = NULL)
   - Can be created directly
   - Cannot have routing
   - Must associate with tenant to enable routing

2. **Tenant-Associated Trunks** (tenantId = specific ID)
   - Can have routing configuration
   - Routing creates extensions in from-trunk context
   - Routing auto-removed on dissociation

3. **Routing Destinations**
   - Queue: App=Queue, AppData=t{tenantId}_{queueName}
   - Extension: App=Goto, AppData={context},{extension},1
   - IVR: App=Goto, AppData=ivr-{id},s,1

4. **Validation**
   - Name: 3-40 chars, ^[a-zA-Z0-9_-]+$
   - Remote Host: IP:PORT format
   - Retry: 10-3600 seconds
   - Expiration: 60-7200 seconds

## Asterisk Integration

### AMI Commands
- `pjsip show registrations` - Get all registrations
- `module reload res_pjsip_wizard.conf` - Reload config
- `pjsip send register {id}` - Force registration

### Registration Status
Parsed from AMI output:
- registration ID: {name}-reg-0
- server_uri: sip:host:port
- auth: {name}-oauth
- status: Registered | Rejected | Unregistered | Unknown
- expiration: "exp. 3600s" or "exp. 5000s ago"

## File Synchronization

- **Source of Truth**: Database
- **Config File**: pjsip_wizard.conf in Docker
- **Sync Method**: generateFromDatabase()
- **Lock**: 5-second timeout
- **Backup**: Created before each write
- **Atomic**: All trunks processed together

## Security Notes

1. JWT authentication required (all endpoints)
2. Passwords stored in plaintext (consider encryption)
3. No password masking in responses (consider masking)
4. Role-based access control via RolesGuard
5. Tenant-based filtering in queries

## Common Tasks

### Create Global Trunk
```typescript
POST /registrations
{
  "name": "trunk1",
  "remote_host": "192.168.1.1:5060",
  "username": "user123",
  "password": "pass123"
}
```

### Associate with Tenant
```typescript
POST /registrations/trunk1/associate-tenant
{
  "tenantId": 1
}
```

### Configure Routing
```typescript
PATCH /registrations/trunk1/routing
{
  "destination_type": "queue",
  "destination_id": "support",
  "did_pattern": "_X."
}
```

### Get Status
```typescript
GET /registrations/trunk1?with_status=true
```

### Force Register
```typescript
POST /registrations/trunk1/register
```

### Dissociate (Remove Tenant)
```typescript
DELETE /registrations/trunk1/dissociate-tenant
```

## Error Responses

- 400 - Invalid input, cannot configure routing (not associated), invalid destination
- 404 - Trunk not found, tenant not found
- 409 - Trunk already exists, already associated
- 500 - Asterisk reload failed, file lock timeout, AMI error

