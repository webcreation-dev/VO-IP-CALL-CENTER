# SIP Trunk Management Implementation - Comprehensive Analysis

## Executive Summary

The NestJS backend implements a comprehensive SIP trunk management system integrated with Asterisk's PJSIP module. Trunks are configured via the `pjsip_wizard.conf` file and stored in the PostgreSQL database, allowing both global (tenant-agnostic) and tenant-specific trunk management with automatic routing capabilities.

---

## File Structure & Locations

### Core Trunk Management Module
- **Location**: `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/registrations/`
- **Key Files**:
  - `registrations.controller.ts` - REST API endpoints
  - `registrations.service.ts` - Business logic (814 lines)
  - `config-file.service.ts` - pjsip_wizard.conf file management
  - `entities/sip-trunk.entity.ts` - TypeORM database entity
  - `interfaces/registration.interface.ts` - TypeScript interfaces
  - `dto/` - Data transfer objects
  - `registrations.module.ts` - NestJS module configuration

### Database Migrations
- `1762588463699-InitialSchema.ts` - Creates `sip_trunks` table
- `1762619657000-AddTrunkRoutingFields.ts` - Adds routing columns
- `1762776202000-MakeTrunkTenantOptional.ts` - Makes tenantId nullable

### Frontend Integration
- **Location**: `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/call-center/src/api/trunks.ts`
- TypeScript service for frontend trunk API calls

---

## Database Schema - SIP Trunks Table

### Table Structure: `sip_trunks`

```sql
CREATE TABLE "sip_trunks" (
  id SERIAL PRIMARY KEY,
  
  -- Identification
  name VARCHAR(40) NOT NULL UNIQUE,
  tenant_id INTEGER NULLABLE (FK to tenants),
  display_name VARCHAR(100),
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  
  -- SIP Server Configuration
  remote_host VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  
  -- Transport & Context
  transport VARCHAR(40) DEFAULT 'transport-udp',
  context VARCHAR(100) DEFAULT 'from-trunk',
  
  -- Registration Options
  sends_registrations BOOLEAN DEFAULT true,
  sends_auth BOOLEAN DEFAULT true,
  client_uri VARCHAR(255),
  server_uri VARCHAR(255),
  retry_interval INTEGER DEFAULT 60,
  expiration INTEGER DEFAULT 3600,
  max_retries INTEGER DEFAULT 10,
  forbidden_retry_interval INTEGER DEFAULT 0,
  line BOOLEAN DEFAULT false,
  outbound_proxy VARCHAR(255),
  support_path BOOLEAN DEFAULT false,
  
  -- Routing Configuration
  destination_type VARCHAR(20) -- 'queue', 'extension', 'ivr'
  destination_id VARCHAR(100),
  did_pattern VARCHAR(100) DEFAULT '_X.',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);
```

---

## Entity Definition - SipTrunk

### File: `/registrations/entities/sip-trunk.entity.ts`

```typescript
@Entity('sip_trunks')
export class SipTrunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  name: string;

  @Column({ name: 'tenant_id', type: 'integer', nullable: true })
  tenantId: number | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  // SIP Configuration
  @Column({ type: 'varchar', length: 255 })
  remoteHost: string;
  
  @Column({ type: 'varchar', length: 100 })
  username: string;
  
  @Column({ type: 'varchar', length: 100 })
  password: string;

  @Column({ type: 'varchar', length: 40, default: 'transport-udp' })
  transport: string;

  @Column({ type: 'varchar', length: 100, default: 'from-trunk' })
  context: string;

  // Registration Options
  @Column({ name: 'sends_registrations', type: 'boolean', default: true })
  sendsRegistrations: boolean;

  @Column({ name: 'sends_auth', type: 'boolean', default: true })
  sendsAuth: boolean;

  @Column({ name: 'client_uri', type: 'varchar', length: 255, nullable: true })
  clientUri: string | null;

  @Column({ name: 'server_uri', type: 'varchar', length: 255, nullable: true })
  serverUri: string | null;

  @Column({ name: 'retry_interval', type: 'integer', default: 60 })
  retryInterval: number;

  @Column({ type: 'integer', default: 3600 })
  expiration: number;

  @Column({ name: 'max_retries', type: 'integer', default: 10 })
  maxRetries: number;

  @Column({ name: 'forbidden_retry_interval', type: 'integer', default: 0 })
  forbiddenRetryInterval: number;

  @Column({ type: 'boolean', default: false })
  line: boolean;

  @Column({ name: 'outbound_proxy', type: 'varchar', length: 255, nullable: true })
  outboundProxy: string | null;

  @Column({ name: 'support_path', type: 'boolean', default: false })
  supportPath: boolean;

  // Routing Configuration
  @Column({
    name: 'destination_type',
    type: 'varchar',
    length: 20,
    nullable: true
  })
  destinationType: string | null;

  @Column({
    name: 'destination_id',
    type: 'varchar',
    length: 100,
    nullable: true
  })
  destinationId: string | null;

  @Column({
    name: 'did_pattern',
    type: 'varchar',
    length: 100,
    nullable: true,
    default: '_X.'
  })
  didPattern: string | null;

  // Metadata
  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Data Transfer Objects (DTOs)

### CreateRegistrationDto
**File**: `dto/create-registration.dto.ts`

```typescript
export class CreateRegistrationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  name: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9.-]+(:\d{1,5})?$/)
  remote_host: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password: string;

  @IsString()
  transport?: string = 'transport-udp';

  @IsString()
  context?: string = 'from-trunk';

  @IsBoolean()
  sends_registrations?: boolean = true;

  @IsBoolean()
  sends_auth?: boolean = true;

  @IsString()
  @IsOptional()
  client_uri?: string;

  @IsString()
  @IsOptional()
  server_uri?: string;

  @IsInt()
  @Min(10)
  @Max(3600)
  retry_interval?: number = 60;

  @IsInt()
  @Min(60)
  @Max(7200)
  expiration?: number = 3600;

  @IsInt()
  @Min(1)
  @Max(50)
  max_retries?: number = 10;

  // ... other optional fields
  
  // Routing (only applicable after tenant association)
  @IsString()
  @IsOptional()
  destination_type?: string; // 'queue', 'extension', 'ivr'

  @IsString()
  @IsOptional()
  destination_id?: string;

  @IsString()
  @IsOptional()
  did_pattern?: string = '_X.';
}
```

### UpdateRegistrationDto
**File**: `dto/update-registration.dto.ts`

```typescript
export class UpdateRegistrationDto extends PartialType(
  OmitType(CreateRegistrationDto, ['name'] as const),
) {}
```

### UpdateRoutingDto
**File**: `dto/update-routing.dto.ts`

```typescript
export class UpdateRoutingDto {
  @IsString()
  @IsOptional()
  @IsIn(['queue', 'extension', 'ivr'])
  destination_type?: string | null;

  @IsString()
  @IsOptional()
  destination_id?: string | null;

  @IsString()
  @IsOptional()
  did_pattern?: string;
}
```

---

## API Endpoints - Registrations Controller

### Base Route: `/registrations`

#### 1. Create SIP Trunk
```
POST /registrations
Query Params:
  - tenantId?: number (optional)

Request Body: CreateRegistrationDto
Response: 201 Created - SipTrunkRegistration
```

#### 2. Get All SIP Trunks
```
GET /registrations
Query Params:
  - with_status?: 'true' | '1' (include AMI status)

Response: 200 OK - SipTrunkRegistration[]
```

#### 3. Get Single SIP Trunk
```
GET /registrations/:id
Query Params:
  - with_status?: 'true' | '1'

Response: 200 OK - SipTrunkRegistration
```

#### 4. Update SIP Trunk
```
PATCH /registrations/:id
Request Body: UpdateRegistrationDto
Response: 200 OK - SipTrunkRegistration
```

#### 5. Delete SIP Trunk
```
DELETE /registrations/:id
Response: 204 No Content
```

#### 6. Force Registration Attempt
```
POST /registrations/:id/register
Response: 200 OK - { message: string }
```

#### 7. Configure Trunk Routing
```
PATCH /registrations/:id/routing
Request Body: UpdateRoutingDto
Response: 200 OK - {
  message: string,
  trunk: { id, destination_type, destination_id, did_pattern },
  extensions_created: Extension[]
}
```

#### 8. Get Trunk Routing
```
GET /registrations/:id/routing
Response: 200 OK - {
  destination_type: string,
  destination_id: string,
  did_pattern: string,
  context: string,
  extensions: Extension[]
}
```

#### 9. Get Registration Statuses (AMI)
```
GET /registrations/status/ami
Response: 200 OK - RegistrationStatus[]
```

#### 10. Get All Registration Statuses (Metadata Format)
```
GET /registrations/status/all
Query Params:
  - lang?: 'en' | 'fr'

Response: 200 OK - MetadataEntry[]
```

#### 11. Associate Trunk with Tenant
```
POST /registrations/:id/associate-tenant
Request Body: { tenantId: number }
Response: 200 OK - SipTrunkRegistration
```

#### 12. Dissociate Trunk from Tenant
```
DELETE /registrations/:id/dissociate-tenant
Response: 200 OK - SipTrunkRegistration
```

---

## Service Classes & Methods

### RegistrationsService (registrations.service.ts)

**Key Dependencies**:
- TypeORM Repository<SipTrunk>
- TypeORM Repository<Queue>
- TypeORM Repository<Tenant>
- ConfigFileService
- AmiService
- ExtensionsService

**Key Methods**:

#### Lifecycle Methods
1. **create(dto, tenantId?)**
   - Creates new trunk (globally or tenant-specific)
   - Validates tenant if provided
   - Checks for duplicates
   - Saves to database
   - Generates pjsip_wizard.conf from DB
   - Reloads Asterisk

2. **findAll(tenantId?)**
   - Returns all enabled trunks (optionally filtered by tenant)
   - Loads tenant relations

3. **findOne(name, tenantId?)**
   - Gets single trunk by name
   - Returns entity converted to interface

4. **findAllWithStatus(tenantId?)**
   - Gets all trunks with current AMI registration status
   - Queries Asterisk via AMI for real-time status

5. **findOneWithStatus(name, tenantId?)**
   - Gets single trunk with registration status

6. **update(name, dto, tenantId?)**
   - Updates trunk configuration
   - Regenerates config file
   - Reloads Asterisk

7. **remove(name, tenantId?)**
   - Deletes trunk from database
   - Regenerates config
   - Reloads Asterisk

#### Registration Control
8. **forceRegister(name, tenantId?)**
   - Executes `pjsip send register {regId}` via AMI
   - Forces immediate registration attempt

#### Tenant Management
9. **associateTenant(trunkId, tenantId)**
   - Associates global trunk with specific tenant
   - Only works if trunk isn't already associated
   - Regenerates config and reloads

10. **dissociateTenant(trunkId)**
    - Removes tenant association from trunk
    - Cleans up routing configuration
    - Regenerates config and reloads

#### Routing Management
11. **updateRouting(name, dto, tenantId?)**
    - Updates trunk routing configuration
    - Validates destination exists
    - Creates dialplan extensions
    - Supports routing to: queue, extension, IVR

12. **getRouting(name, tenantId?)**
    - Retrieves trunk's routing configuration
    - Gets associated extensions from database

#### Status & Monitoring
13. **getRegistrationStatus(id)**
    - Queries AMI for current trunk registration status
    - Returns normalized status object

14. **getAllRegistrationStatusesFromAMI()**
    - Gets all registrations from Asterisk AMI
    - Direct query without database access

#### Helper Methods
15. **entityToInterface(entity)**
    - Converts SipTrunk entity to SipTrunkRegistration interface
    - Maps database field names to API field names

16. **validateDestination(type, destinationId, tenantId)**
    - Validates that destination exists for tenant
    - Supports: queue, extension, IVR

17. **createRoutingExtensions(trunk)**
    - Creates dialplan extensions for routing
    - Determines app/appdata based on destination type
    - Calls ExtensionsService

18. **removeRoutingExtensions(trunk)**
    - Removes old routing extensions

19. **isRoutingToDestination(extension, type, destinationId, tenantId)**
    - Checks if extension routes to specific destination

---

### ConfigFileService (config-file.service.ts)

**Purpose**: Manages pjsip_wizard.conf file synchronization

**Key Methods**:

1. **readConfigFile()**
   - Copies pjsip_wizard.conf from Docker container to temp file
   - Returns file content as string

2. **parseWizardConfig(content)**
   - Parses pjsip_wizard.conf ini-style format
   - Returns Map<string, SipTrunkRegistration>

3. **generateWizardSection(registration)**
   - Converts SipTrunkRegistration to ini section format
   - Returns formatted string

4. **writeConfigFile(registrations)**
   - Acquires file lock
   - Creates backup
   - Writes registrations map to temp file
   - Copies to Docker container
   - Releases lock

5. **backupConfig()**
   - Creates backup of pjsip_wizard.conf in Docker

6. **getAllRegistrations()**
   - Reads file and returns all registrations

7. **generateFromDatabase()**
   - **IMPORTANT**: Regenerates entire pjsip_wizard.conf from database
   - Reads all enabled trunks from DB
   - Generates config file
   - Used after create/update/delete operations

8. **generateFileHeader()**
   - Returns file header comments

9. **generateTrunkSection(trunk)**
   - Generates complete [trunk] section for pjsip_wizard.conf
   - Includes all SIP configuration

---

## pjsip_wizard.conf Format

Each trunk is configured as a wizard section:

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
endpoint/allow = alaw
endpoint/allow = ulaw
endpoint/from_user = 62908521
endpoint/direct_media = no
aor/qualify_frequency = 60
server_uri = sip:197.234.218.195:25060
client_uri = sip:62908521@197.234.218.195:25060
registration/retry_interval = 60
registration/expiration = 3600
registration/max_retries = 10
```

---

## Business Logic Flow

### 1. Create Trunk Flow

```
POST /registrations
  ↓
RegistrationsController.create()
  ↓
RegistrationsService.create(dto, tenantId?)
  ├─ Validate tenant (if provided)
  ├─ Check for duplicate trunk name
  ├─ Create SipTrunk entity
  ├─ Save to database
  ├─ ConfigFileService.generateFromDatabase()
  │  ├─ Read all enabled trunks from DB
  │  ├─ Generate complete pjsip_wizard.conf
  │  └─ Write to Docker container
  ├─ AmiService.executeCommand('module reload res_pjsip_wizard.conf')
  └─ Return SipTrunkRegistration
```

### 2. Associate Tenant Flow

```
POST /registrations/:id/associate-tenant
  ↓
RegistrationsService.associateTenant(trunkId, tenantId)
  ├─ Load trunk from DB
  ├─ Verify not already associated
  ├─ Verify tenant exists
  ├─ Update tenant_id field
  ├─ Save to DB
  ├─ ConfigFileService.generateFromDatabase()
  ├─ Reload Asterisk
  └─ Return updated trunk
```

### 3. Update Routing Flow

```
PATCH /registrations/:id/routing
  ↓
RegistrationsService.updateRouting(name, dto, tenantId?)
  ├─ Load trunk from DB
  ├─ Verify trunk is tenant-associated
  ├─ Validate destination exists
  ├─ Remove old routing extensions
  ├─ Update destination_type, destination_id, did_pattern
  ├─ Save to DB
  ├─ createRoutingExtensions(trunk)
  │  ├─ Determine app and appdata based on type
  │  ├─ ExtensionsService.create()
  │  └─ Create dialplan extension
  └─ Return result with created extensions
```

### 4. Get Registrations with Status Flow

```
GET /registrations?with_status=true
  ↓
RegistrationsService.findAllWithStatus()
  ├─ findAll() - load from database
  ├─ For each trunk:
  │  ├─ AmiService.getPJSIPRegistrations()
  │  ├─ Match registration by ID
  │  └─ Parse status
  └─ Return array of [trunk + status]
```

### 5. Reload Configuration Flow

```
ConfigFileService.generateFromDatabase()
  ↓
  ├─ Acquire file lock (max 5 seconds)
  ├─ Read all enabled trunks from DB
  ├─ For each trunk, generate [section] format
  ├─ Write to temp file
  ├─ docker cp temp-file asterisk:pjsip_wizard.conf
  ├─ Cleanup temp file
  ├─ Release file lock
  └─ Log success
  
Then:
  ↓
AmiService.executeCommand('module reload res_pjsip_wizard.conf')
  ├─ Connect to AMI
  ├─ Send reload command
  └─ Wait 1 second
```

---

## Asterisk Integration

### AMI Commands Used

1. **Get PJSIP Registrations**
   ```
   Command: pjsip show registrations
   Parsed Output: Array of RegistrationInfo
   ```

2. **Reload PJSIP Configuration**
   ```
   Command: module reload res_pjsip_wizard.conf
   ```

3. **Force Registration**
   ```
   Command: pjsip send register {registration-id}
   Example: pjsip send register operator_trunk-reg-0
   ```

### Registration Status Parsing

Example output parsing from `pjsip show registrations`:

```
Registration/ServerUri                Auth                     Status
==============================================================================
 operator_trunk-reg-0/sip:197.234.218.195:25060  operator_trunk-oauth    Registered  (exp. 3589s)
 trunk2-reg-0/sip:example.com:5060     trunk2-oauth            Unregistered
```

**Parsed Fields**:
- `registration`: "operator_trunk-reg-0"
- `serverUri`: "sip:197.234.218.195:25060"
- `auth`: "operator_trunk-oauth"
- `status`: "Registered"
- `expiration`: "exp. 3589s"

---

## Frontend Integration (call-center)

### File: `/call-center/src/api/trunks.ts`

**TrunksService Class**:

Methods map directly to backend endpoints:

```typescript
class TrunksService {
  async getAll(withStatus = false): Promise<Trunk[]>
  async getAllWithStatus(): Promise<TrunkWithStatus[]>
  async getById(id: string, withStatus = false): Promise<Trunk>
  async create(data: CreateTrunkDto): Promise<Trunk>
  async update(id: string, data: UpdateTrunkDto): Promise<Trunk>
  async delete(id: string): Promise<void>
  async forceRegister(id: string): Promise<{ message: string }>
  async updateRouting(id: string, data: UpdateRoutingDto): Promise<any>
  async getRouting(id: string): Promise<any>
  async getRegistrationStatuses(): Promise<RegistrationStatus[]>
  async associateTenant(id: string, data: AssociateTenantDto): Promise<Trunk>
  async dissociateTenant(id: string): Promise<Trunk>
  
  // Helper methods
  getDisplayName(trunk: Trunk): string
  getStatusBadgeVariant(status?: string): 'default' | 'secondary' | 'destructive'
  validateRemoteHost(value: string): boolean
  validateTrunkName(value: string): boolean
  formatExpiration(expiration?: string): string
}
```

**Data Transformation**:
- Backend uses snake_case (remote_hosts, sends_registrations)
- Frontend uses camelCase (remoteHost, sendsRegistrations)
- Nested objects flattened (endpoint.transport → transport)

---

## Key Features & Constraints

### 1. Global vs Tenant-Associated Trunks

- **Global Trunks**: tenantId = NULL
  - Can be created directly
  - Must be associated with tenant before routing configuration
  
- **Tenant-Associated Trunks**: tenantId = specific tenant ID
  - Can have routing configuration
  - Routing creates extensions in tenant's context
  - When dissociated, routing is automatically removed

### 2. Routing Configuration

**Supported Destination Types**:
1. **Queue**
   - App: Queue
   - AppData: t{tenantId}_{queueName}
   - Channels route to queue

2. **Extension**
   - App: Goto
   - AppData: {context},{extension},1
   - Channels go to extension

3. **IVR**
   - App: Goto
   - AppData: ivr-{ivr-id},s,1
   - Channels route to IVR menu

### 3. DID Pattern Matching

- Default pattern: `_X.` (matches any number)
- Asterisk dialplan syntax
- Created as extension with priority 1

### 4. File Synchronization

- Database is source of truth
- pjsip_wizard.conf regenerated from DB after each change
- File lock prevents concurrent writes (5-second timeout)
- Backup created before each write
- Docker container file operations

### 5. Registration Status

- Real-time status from Asterisk AMI
- Not stored in database
- Normalized to: Registered, Rejected, Unregistered, Unknown
- Expiration time parsed from status string

### 6. Asterisk Module Reloading

- `module reload res_pjsip_wizard.conf` reloads PJSIP wizard
- 1-second wait after reload for completion
- All trunks processed atomically

---

## Error Handling

**Common Exceptions**:

1. **NotFoundException** (404)
   - Trunk not found
   - Tenant not found
   - Queue not found

2. **ConflictException** (409)
   - Trunk already exists
   - Trunk already associated with tenant

3. **BadRequestException** (400)
   - Invalid input data
   - Cannot configure routing without tenant
   - Invalid destination type
   - Trunk not associated with tenant

4. **InternalServerErrorException** (500)
   - Failed to reload Asterisk
   - Failed to read/write config file
   - File lock timeout
   - AMI communication failure

---

## Validation Rules

**Trunk Name**:
- 3-40 characters
- Alphanumeric, hyphens, underscores only
- Pattern: `^[a-zA-Z0-9_-]+$`

**Remote Host**:
- IP:PORT or hostname:PORT format
- Port: 1-65535
- Pattern: `^[a-zA-Z0-9.-]+(:\d{1,5})?$`

**Username/Password**:
- 1-100 characters each

**Retry Interval**:
- 10-3600 seconds (default: 60)

**Expiration**:
- 60-7200 seconds (default: 3600)

**Max Retries**:
- 1-50 attempts (default: 10)

---

## Security Considerations

1. **Password Storage**
   - Stored in plaintext in database (SECURITY: should use encryption)
   - Transmitted over HTTPS only (via guard)
   - Not masked in API responses (SECURITY: should mask)

2. **Authentication**
   - All endpoints require JWT authentication
   - JwtAuthGuard applied globally

3. **Authorization**
   - RolesGuard checks user roles
   - Tenant-based filtering in queries

---

## File Locations Summary

```
asterisk-api-v2/
├── src/
│   ├── registrations/
│   │   ├── registrations.controller.ts       (API endpoints)
│   │   ├── registrations.service.ts          (Business logic)
│   │   ├── config-file.service.ts            (pjsip_wizard.conf management)
│   │   ├── registrations.module.ts           (Module definition)
│   │   ├── entities/
│   │   │   └── sip-trunk.entity.ts           (Database entity)
│   │   ├── interfaces/
│   │   │   └── registration.interface.ts     (Type definitions)
│   │   └── dto/
│   │       ├── create-registration.dto.ts    (Create DTO)
│   │       ├── update-registration.dto.ts    (Update DTO)
│   │       ├── update-routing.dto.ts         (Routing DTO)
│   │       └── associate-tenant.dto.ts       (Tenant association DTO)
│   │
│   ├── core/database/migrations/
│   │   ├── 1762588463699-InitialSchema.ts
│   │   ├── 1762619657000-AddTrunkRoutingFields.ts
│   │   └── 1762776202000-MakeTrunkTenantOptional.ts
│   │
│   ├── core/asterisk/ami/
│   │   ├── ami.service.ts                    (PJSIP registrations queries)
│   │   └── ami.types.ts                      (Registration info types)
│   │
│   └── app.module.ts                         (RegistrationsModule imported)
│
└── call-center/src/api/
    └── trunks.ts                             (Frontend service)
```

---

## Summary of Key Classes

| Class | Purpose | Methods |
|-------|---------|---------|
| **RegistrationsController** | REST API endpoints | 12 public endpoints |
| **RegistrationsService** | Business logic | 19 public methods |
| **ConfigFileService** | Config file management | 8 public methods |
| **SipTrunk** | Database entity | TypeORM entity |
| **SipTrunkRegistration** | API interface | Type definition |
| **TrunksService** | Frontend API client | 13 public methods |

---

## End-to-End Example: Create and Configure Trunk

### Step 1: Create Global Trunk
```typescript
POST /registrations
{
  "name": "operator_trunk",
  "remote_host": "197.234.218.195:25060",
  "username": "62908521",
  "password": "167d458f-8"
}
```
**Result**: Global trunk created, config generated, Asterisk reloaded

### Step 2: Associate with Tenant
```typescript
POST /registrations/operator_trunk/associate-tenant
{
  "tenantId": 1
}
```
**Result**: Trunk now belongs to tenant 1

### Step 3: Configure Routing
```typescript
PATCH /registrations/operator_trunk/routing
{
  "destination_type": "queue",
  "destination_id": "support",
  "did_pattern": "_X."
}
```
**Result**: Extension created in from-trunk context:
- exten: _X.
- app: Queue
- appdata: t1_support (tenant-prefixed queue name)

### Step 4: Get Current Status
```typescript
GET /registrations/operator_trunk?with_status=true
```
**Result**: Returns trunk config + live AMI status

---

## References

- **Asterisk PJSIP Wizard**: https://wiki.asterisk.org/wiki/display/AST/PJSIP+Wizard
- **AMI Commands**: https://wiki.asterisk.org/wiki/display/AST/AMI+Commands
- **Dialplan Patterns**: https://wiki.asterisk.org/wiki/display/AST/Dialplan
