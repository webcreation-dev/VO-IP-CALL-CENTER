# Automatic Extension Creation Analysis - VO-IP Call Center Backend

## Executive Summary

The backend system implements automatic extension creation through a multi-layered approach triggered by tenant creation and SIP trunk configuration. Extensions are automatically generated based on dialplan configurations and are fully integrated with Asterisk's Realtime system for dynamic dialplan management.

---

## 1. Extension Creation Mechanisms

### 1.1 Primary Trigger: Tenant Creation

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/tenants/tenants.service.ts`

When a new tenant is created, extensions are **automatically provisioned** as part of a transactional operation:

```typescript
// Lines 98-191 in tenants.service.ts
async create(dto: CreateTenantDto): Promise<Tenant> {
  // 1. Create tenant entity
  const savedTenant = await queryRunner.manager.save(Tenant, tenant);

  // 2. Create primary context within the transaction
  const contextName = `t${savedTenant.id}_default`;
  const savedContext = await queryRunner.manager.save(TenantContext, context);

  // 3. Create default dialplan extensions within the transaction
  // Automatic extension creation for:
  // - _1XXX pattern (internal calls 1000-1999)
  // - 999 extension (echo test)
  
  await queryRunner.manager.save(Extension, [
    { exten: '_1XXX', priority: 1, app: 'NoOp', ... },
    { exten: '_1XXX', priority: 2, app: 'Dial', ... },
    { exten: '_1XXX', priority: 3, app: 'Hangup', ... },
    { exten: '999', priority: 1, app: 'Answer', ... },
    { exten: '999', priority: 2, app: 'Echo', ... },
    { exten: '999', priority: 3, app: 'Hangup', ... },
  ]);
}
```

**Key Characteristics:**
- Database transaction ensures atomicity
- Happens automatically with zero manual intervention
- Created during POST /tenants endpoint call
- All extensions belong to the newly created tenant

### 1.2 Secondary Trigger: Context Creation

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/tenant-contexts/tenant-contexts.service.ts`

When a secondary context is created for a tenant, default extensions are automatically provisioned:

```typescript
// Lines 22-64 in tenant-contexts.service.ts
async create(tenantId: number, name: string, ...): Promise<TenantContext> {
  const context = this.tenantContextRepo.create({...});
  const savedContext = await this.tenantContextRepo.save(context);
  
  // Create default dialplan extensions for this context
  await this.createDefaultDialplan(tenantId, contextName);
  
  // Add context to Asterisk extensions.conf
  await this.asteriskConfigService.addContext(contextName);
}

// Lines 110-167: Default dialplan generation
private async createDefaultDialplan(tenantId: number, contextName: string): Promise<void> {
  // Creates _1XXX and 999 extensions automatically
  await this.extensionsService.create(tenantId, {
    context: contextName,
    exten: '_1XXX',
    priority: 1,
    app: 'NoOp',
    appdata: 'Internal call to ${EXTEN}',
  });
  // ... additional priorities and extensions
}
```

### 1.3 Tertiary Trigger: SIP Trunk Routing

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/registrations/registrations.service.ts`

When a SIP trunk is created with routing destination configured, extensions are automatically generated:

```typescript
// Lines 144-218 in registrations.service.ts
async create(dto: CreateRegistrationDto, tenantId: number): Promise<SipTrunkRegistration> {
  const sipTrunk = this.sipTrunkRepository.create({...});
  const saved = await this.sipTrunkRepository.save(sipTrunk);
  
  // Create routing extensions if destination is configured
  if (saved.destinationType && saved.destinationId) {
    try {
      await this.createRoutingExtensions(saved);
      this.logger.log(`Created routing extensions for trunk ${dto.name}`);
    } catch (error) {
      this.logger.warn(`Failed to create routing extensions: ${error.message}`);
    }
  }
}

// Lines 582-633: Routing extension creation
private async createRoutingExtensions(trunk: SipTrunk): Promise<any[]> {
  // Determines app and appdata based on destination type
  switch (trunk.destinationType) {
    case 'queue':
      app = 'Queue';
      appdata = `t${trunk.tenantId}_${trunk.destinationId}`;
      break;
    case 'extension':
      app = 'Goto';
      appdata = `${trunk.context},${trunk.destinationId},1`;
      break;
    case 'ivr':
      app = 'Goto';
      appdata = `ivr-${trunk.destinationId},s,1`;
      break;
  }
  
  const extension = await this.extensionsService.create(trunk.tenantId, {
    context: trunk.context,
    exten: trunk.didPattern || '_X.',
    priority: 1,
    app,
    appdata,
  });
}
```

---

## 2. Database Models/Schemas

### 2.1 Extension Entity

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/core/database/entities/extension.entity.ts`

```typescript
@Entity('extensions')
@Unique(['tenantId', 'context', 'exten', 'priority'])
@Index(['tenantId'])
@Index(['context'])
@Index(['exten'])
export class Extension {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'tenant_id', type: 'integer' })
  tenantId: number;

  @Column({ length: 40 })
  context: string;

  @Column({ length: 40 })
  exten: string;

  @Column({ type: 'integer' })
  priority: number;

  @Column({ length: 40 })
  app: string;

  @Column({ length: 256 })
  appdata: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
```

**Key Constraints:**
- Composite unique constraint: `(tenant_id, context, exten, priority)`
- Automatic cascade delete when tenant is deleted
- Indexed for quick lookups by tenant, context, and extension number

### 2.2 Tenant Context Entity

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/core/database/entities/tenant-context.entity.ts`

Provides multi-context isolation within a tenant. Each context has its own dialplan configuration.

### 2.3 Tenant Entity

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/core/database/entities/tenant.entity.ts`

```typescript
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'dialplan_config', type: 'jsonb', nullable: true })
  dialplanConfig: DialplanConfig;
  
  // ... other fields
  
  @OneToMany(() => TenantContext, (context) => context.tenant)
  contexts: TenantContext[];
}
```

---

## 3. API Endpoints

### 3.1 Extension Creation Endpoint

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/extensions/extensions.controller.ts`

```typescript
@Post()
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
@ApiOperation({ summary: 'Create a new dialplan extension' })
async create(
  @CurrentTenant() tenantId: number,
  @Body() dto: CreateExtensionDto,
) {
  return await this.extensionsService.create(tenantId, dto);
}
```

**API Endpoints:**
- `GET /extensions` - List all extensions (paginated, filtered)
- `GET /extensions/contexts` - List available contexts for tenant
- `GET /extensions/context/:context` - Get extensions by context
- `GET /extensions/:id` - Get extension by ID
- `POST /extensions` - Create extension (Admin/TenantAdmin only)
- `PUT /extensions/:id` - Update extension (Admin/TenantAdmin only)
- `DELETE /extensions/:id` - Delete extension (Admin/TenantAdmin only)

### 3.2 Tenant Creation Endpoint

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/tenants/tenants.controller.ts`

```
POST /tenants
```

Creates a tenant AND automatically provisions:
- Primary context named `t{tenantId}_default`
- Default extensions (_1XXX for internal calls, 999 for echo test)

### 3.3 Context Creation Endpoint

```
POST /tenants/:id/contexts
```

Creates a secondary context AND automatically provisions default extensions.

### 3.4 SIP Trunk Routing Endpoint

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/registrations/registrations.controller.ts`

```
POST /registrations
PUT /registrations/:name/routing
```

---

## 4. Services and Controllers

### 4.1 ExtensionsService

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/extensions/extensions.service.ts`

Core service for extension management:

```typescript
@Injectable()
export class ExtensionsService {
  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantContext)
    private readonly tenantContextRepository: Repository<TenantContext>,
    private readonly cacheService: CacheService,
  ) {}

  async create(tenantId: number, dto: CreateExtensionDto): Promise<Extension> {
    // Validate context belongs to tenant
    await this.validateContextOwnership(tenantId, dto.context);

    // Auto-calculate priority if not provided
    if (!dto.priority) {
      dto.priority = await this.getNextPriority(tenantId, dto.context, dto.exten);
    }

    // Check for duplicate
    const existing = await this.extensionRepository.findOne({
      where: { tenantId, context: dto.context, exten: dto.exten, priority: dto.priority },
    });

    if (existing) {
      throw new ConflictException(`Extension already exists`);
    }

    // Create and save
    const extension = this.extensionRepository.create({
      tenantId,
      context: dto.context,
      exten: dto.exten,
      priority: dto.priority,
      app: dto.app,
      appdata: dto.appdata,
    });

    const saved = await this.extensionRepository.save(extension);

    // Invalidate cache
    await this.invalidateCache(tenantId, dto.context);

    return saved;
  }

  private async getNextPriority(
    tenantId: number,
    context: string,
    exten: string,
  ): Promise<number> {
    const result = await this.extensionRepository
      .createQueryBuilder('extension')
      .select('MAX(extension.priority)', 'maxPriority')
      .where('extension.tenantId = :tenantId', { tenantId })
      .andWhere('extension.context = :context', { context })
      .andWhere('extension.exten = :exten', { exten })
      .getRawOne();

    const maxPriority = result?.maxPriority || 0;
    return maxPriority + 1;
  }
}
```

### 4.2 TenantsService

Orchestrates tenant creation with automatic extension provisioning.

### 4.3 TenantContextsService

Manages context creation with automatic default extension generation.

### 4.4 RegistrationsService

Manages SIP trunks with automatic routing extension creation.

---

## 5. Automatic Triggers and Hooks

### 5.1 Database Transaction Safety

**Trigger Location:** `tenants.service.ts` lines 98-232

All automatic extension creation is wrapped in a database transaction:

```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 1. Create tenant
  // 2. Create context
  // 3. Create extensions
  // 4. COMMIT transaction
  await queryRunner.commitTransaction();
  
  // 5. Add context to Asterisk AFTER commit
  try {
    await this.asteriskConfigService.addContext(contextName);
  } catch (asteriskError) {
    // Log error but don't rollback - data is already committed
  }
} catch (error) {
  // ROLLBACK on any error
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

### 5.2 Cache Invalidation Hooks

Extensions service automatically invalidates related caches after CRUD operations:

```typescript
private async invalidateCache(tenantId: number, context?: string): Promise<void> {
  await this.cacheService.del(
    CacheService.generateKey('extensions', 'contexts', String(tenantId)),
  );
  if (context) {
    await this.cacheService.del(
      CacheService.generateKey('extensions', String(tenantId), context),
    );
  }
}
```

### 5.3 Asterisk Configuration Hooks

After creating contexts, the system automatically adds them to Asterisk:

```typescript
try {
  await this.asteriskConfigService.addContext(contextName);
  this.logger.log(`Added context ${contextName} to Asterisk`);
} catch (asteriskError) {
  this.logger.error(`Failed to add context ${contextName} to Asterisk`);
}
```

---

## 6. Configuration and Rules

### 6.1 Default Dialplan Configuration

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/common/interfaces/dialplan-config.interface.ts`

```typescript
export const DEFAULT_DIALPLAN_CONFIG: DialplanConfig = {
  internalDialPattern: '_1XXX',      // Extension range 1000-1999
  internalDialTimeout: 20,           // 20 second call timeout
  queuePattern: '_5XXX',             // Queue pattern 5000-5999
  voicemailPattern: '*XXX',          // Voicemail pattern
  testExtension: '999',              // Echo test extension
  allowExternal: false,              // No external calls by default
};
```

### 6.2 Auto-Generated Extensions

When tenant is created, these extensions are automatically provisioned:

**Internal Dial Pattern (_1XXX):**
```
Priority 1: app=NoOp, appdata='Internal call to ${EXTEN}'
Priority 2: app=Dial, appdata='PJSIP/t{tenantId}_${EXTEN},20,TtWw'
Priority 3: app=Hangup, appdata=''
```

**Test Extension (999):**
```
Priority 1: app=Answer, appdata=''
Priority 2: app=Echo, appdata=''
Priority 3: app=Hangup, appdata=''
```

### 6.3 Validation Rules

**CreateExtensionDto Validation:**
```typescript
- context: Required, max 40 chars, lowercase alphanumeric + underscore/hyphen
- exten: Required, max 40 chars, Asterisk pattern format
- priority: Optional (auto-calculated if not provided), min 1
- app: Required, max 40 chars, valid Asterisk app name
- appdata: Required (can be empty), max 256 chars
```

### 6.4 Context Naming Convention

Contexts are automatically named with tenant prefix:
- Primary context: `t{tenantId}_default`
- Secondary context: `t{tenantId}_{contextName}`

Example: For tenant ID 5:
- Primary: `t5_default`
- Secondary: `t5_sales`, `t5_support`, etc.

---

## 7. Tenant-User-Extension Relationships

### 7.1 Tenant to Extension Mapping

```
Tenant (1) -----> (many) TenantContext (1) -----> (many) Extension
  ID=5              ID=10, name=t5_default      exten=_1XXX
                    ID=11, name=t5_sales        exten=999
```

**Database Relationships:**
- Tenant.id = Foreign key in TenantContext.tenant_id
- Tenant.id = Foreign key in Extension.tenant_id
- TenantContext.name = Foreign key constraint in Extension.context

### 7.2 User to Tenant Binding

**File:** `/home/kamgoko/Projects2025/VO-IP-CALL-CENTER/asterisk-api-v2/src/core/database/entities/app-user.entity.ts`

Users are associated with tenants:
```typescript
@Column({ name: 'tenant_id', type: 'integer', nullable: true })
tenantId: number | null;
```

- SUPER_ADMIN: tenantId = null
- TENANT_ADMIN: tenantId = specific tenant
- AGENT: tenantId = specific tenant

### 7.3 Extension Access Control

**Authorization Rules:**
```typescript
// In extensions.controller.ts
@UseGuards(JwtAuthGuard, RolesGuard)

// Create extension: SUPER_ADMIN or TENANT_ADMIN only
@Post()
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)

// Read extensions: All authenticated users (tenant-isolated)
@Get()

// Update extension: SUPER_ADMIN or TENANT_ADMIN only
@Put(':id')
@Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
```

**Tenant Isolation:**
- User's tenantId automatically injected via `@CurrentTenant()` decorator
- All queries filtered by tenant: `where: { tenantId }`
- Prevents cross-tenant access

---

## 8. Extension Creation Data Parameters

### 8.1 From Tenant Creation

When creating a tenant, these parameters control extension generation:

```typescript
CreateTenantDto {
  name: string;                        // Used for context naming
  dialplanConfig?: DialplanConfigDto;  // Defines patterns
  maxEndpoints?: number;
  maxQueues?: number;
  timezone?: string;
}

DialplanConfigDto {
  internalDialPattern?: string;        // e.g., "_1XXX"
  internalDialTimeout?: number;        // e.g., 20
  queuePattern?: string;               // e.g., "_5XXX"
  voicemailPattern?: string;           // e.g., "*XXX"
  testExtension?: string;              // e.g., "999"
  allowExternal?: boolean;
  externalPattern?: string;
  externalPrefix?: string;
}
```

### 8.2 Auto-Calculated Parameters

```typescript
// Extension priority auto-calculated
priority = (await MAX(priority) for context+exten) + 1

// Context name auto-generated
contextName = `t${tenantId}_${providedName || 'default'}`

// Appdata substitution
appdata = `PJSIP/t${tenantId}_${EXTEN},${timeout}`
```

---

## 9. Templates and Patterns

### 9.1 Internal Call Extension Template

```typescript
// Template for internal dial pattern
{
  context: contextName,
  exten: '_1XXX',           // Pattern for 1000-1999
  priority: 1,
  app: 'NoOp',
  appdata: 'Internal call to ${EXTEN}',
},
{
  context: contextName,
  exten: '_1XXX',
  priority: 2,
  app: 'Dial',
  appdata: `PJSIP/t${tenantId}_\${EXTEN},${timeout}`,  // Route to endpoint
},
{
  context: contextName,
  exten: '_1XXX',
  priority: 3,
  app: 'Hangup',
  appdata: '',
}
```

### 9.2 Test Extension Template (Echo)

```typescript
{
  context: contextName,
  exten: '999',
  priority: 1,
  app: 'Answer',
  appdata: '',
},
{
  context: contextName,
  exten: '999',
  priority: 2,
  app: 'Echo',
  appdata: '',
},
{
  context: contextName,
  exten: '999',
  priority: 3,
  app: 'Hangup',
  appdata: '',
}
```

### 9.3 Queue Routing Template

```typescript
{
  context: trunkContext,
  exten: didPattern,       // e.g., '_X.'
  priority: 1,
  app: 'Queue',
  appdata: `t${tenantId}_${queueName}`,
}
```

### 9.4 IVR Routing Template

```typescript
{
  context: trunkContext,
  exten: didPattern,
  priority: 1,
  app: 'Goto',
  appdata: `ivr-${ivrId},s,1`,
}
```

---

## 10. Implementation Files Summary

| File | Purpose | Automatic Creation |
|------|---------|-------------------|
| `tenants.service.ts` | Tenant lifecycle | Primary trigger: creates tenant + context + 2 extensions |
| `tenant-contexts.service.ts` | Context management | Secondary trigger: creates context + 2 extensions |
| `extensions.service.ts` | Extension CRUD | Core service for all extension operations |
| `extensions.controller.ts` | API endpoints | HTTP endpoints for extension management |
| `registrations.service.ts` | SIP trunk management | Tertiary trigger: creates routing extensions |
| `extension.entity.ts` | Database model | Defines extension table schema |
| `tenant.entity.ts` | Database model | Defines tenant with dialplan config |
| `dialplan-config.interface.ts` | Configuration | Default patterns and settings |

---

## 11. Key Flow: Tenant Creation → Automatic Extensions

```
1. User calls POST /tenants with CreateTenantDto
   ↓
2. TenantsService.create() starts transaction
   ↓
3. Insert Tenant record → ID assigned (e.g., ID=5)
   ↓
4. Insert TenantContext record with name=t5_default
   ↓
5. Insert 6 Extension records automatically:
   - _1XXX priority 1-3 (internal dial pattern)
   - 999 priority 1-3 (echo test)
   ↓
6. Transaction COMMITS (all-or-nothing)
   ↓
7. AsteriskConfigService.addContext(t5_default)
   ↓
8. Cache invalidated
   ↓
9. Response sent: { id: 5, name: "tenant1", ... }
```

---

## 12. Security and Isolation

### 12.1 Multi-Tenant Isolation

- Database level: All extensions filtered by `tenant_id`
- API level: User's `tenantId` from JWT token
- Context level: Context name prefixed with tenant ID
- Validation: All context ownership validated before extension creation

### 12.2 Access Control

- Extension creation: SUPER_ADMIN or TENANT_ADMIN only
- Extension deletion: SUPER_ADMIN or TENANT_ADMIN only
- Extension read: All authenticated users (within their tenant)

### 12.3 Data Integrity

- Unique constraint: `(tenant_id, context, exten, priority)`
- Cascade delete: Removing tenant removes all extensions
- Transaction safety: All-or-nothing creation
- Validation: Input validation on all DTOs

---

## 13. Monitoring and Logging

Extensions service logs:
```
"Created extension: context/exten/priority (Tenant: ID)"
"Updated extension: ID (Tenant: ID)"
"Deleted extension: ID (Tenant: ID)"
```

Tenant contexts service logs:
```
"Created primary context with default dialplan: contextName"
"Created secondary context: contextName"
"Default dialplan created for context: contextName"
```

Registrations service logs:
```
"Created routing extensions for trunk: trunkName"
"Removed N routing extensions for trunk: trunkName"
"Updated routing for trunk: trunkName"
```

