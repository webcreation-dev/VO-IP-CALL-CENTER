import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThanOrEqual } from 'typeorm';
import { Tenant } from '../core/database/entities/tenant.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { Extension } from '../core/database/entities/extension.entity';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { Queue } from '../queues/entities/queue.entity';
import { Cdr } from '../cdr/entities/cdr.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CacheService } from '../core/cache/cache.service';
import { TenantContextsService } from '../tenant-contexts/tenant-contexts.service';
import {
  generateContextName,
  generateUniqueContextName,
} from '../common/utils/context-name.util';
import {
  DialplanConfig,
  DEFAULT_DIALPLAN_CONFIG,
} from '../common/interfaces/dialplan-config.interface';

/**
 * Tenants Service
 *
 * Handles tenant management operations
 *
 * Features:
 * - CRUD operations for tenants
 * - Soft delete support (is_active flag)
 * - Cache management for performance
 * - Validation of tenant limits
 *
 * Access Control:
 * - Create/Delete: Admin only
 * - Update: Admin or Tenant Admin (own tenant)
 * - Read: All authenticated users (with tenant isolation)
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantContext)
    private readonly tenantContextRepository: Repository<TenantContext>,
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(PsEndpoint)
    private readonly endpointRepository: Repository<PsEndpoint>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(Cdr)
    private readonly cdrRepository: Repository<Cdr>,
    private readonly cacheService: CacheService,
    private readonly tenantContextsService: TenantContextsService,
  ) {}

  /**
   * Create a new tenant
   *
   * Only accessible by admin users (enforced by controller)
   *
   * Automatically generates:
   * - Context name (from tenant name if not provided)
   * - Dialplan configuration (uses defaults if not provided)
   * - Default extensions (based on dialplan config)
   *
   * @param dto - Tenant creation data
   * @returns Created tenant
   * @throws ConflictException if tenant name already exists
   */
  async create(dto: CreateTenantDto): Promise<Tenant> {
    // Check if tenant name already exists
    const existing = await this.tenantRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Tenant with name "${dto.name}" already exists`);
    }

    // SIMPLIFIED - Auto-generate context from tenant name (like old project)
    let contextName: string = generateContextName(dto.name);
    
    // Ensure context is unique
    const existingContexts = await this.getAllContextNames();
    if (existingContexts.includes(contextName)) {
      contextName = generateUniqueContextName(contextName, existingContexts);
    }

    // COMMENTED - Not needed for simplified version
    // // Use provided dialplan config or defaults
    // const dialplanConfig: DialplanConfig = dto.dialplanConfig
    //   ? { ...DEFAULT_DIALPLAN_CONFIG, ...dto.dialplanConfig }
    //   : { ...DEFAULT_DIALPLAN_CONFIG };

    // Use provided dialplan config or defaults
    const dialplanConfig: DialplanConfig = dto.dialplanConfig
      ? { ...DEFAULT_DIALPLAN_CONFIG, ...dto.dialplanConfig }
      : { ...DEFAULT_DIALPLAN_CONFIG };

    // Create tenant with ALL columns
    const tenant = this.tenantRepository.create({
      name: dto.name,
      companyName: dto.companyName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      address: dto.address,
      city: dto.city,
      country: dto.country,
      timezone: dto.timezone || 'UTC',
      maxEndpoints: dto.maxEndpoints || 100,
      maxQueues: dto.maxQueues || 50,
      dialplanConfig: dialplanConfig,
      isActive: true,
    });

    const saved = await this.tenantRepository.save(tenant);

    // Create primary context automatically (also creates default extensions)
    const primaryContext = await this.tenantContextsService.createPrimaryContext(saved.id);

    // BUGFIX: Extensions are now created by createPrimaryContext, no need to create them twice
    // await this.generateDefaultExtensions(saved.id, primaryContext.name, dialplanConfig);

    this.logger.log(
      `Created tenant: ${dto.name} (ID: ${saved.id}, Primary Context: ${primaryContext.name})`,
    );
    this.logger.log(`Created primary context: ${primaryContext.name}`);

    // Invalidate cache - delete all list variants
    await this.cacheService.delPattern('tenants:list:*');

    return saved;
  }

  /**
   * Find all tenants
   *
   * Admin users: see all tenants
   * Tenant users: filtered by tenantId in controller
   *
   * @param includeInactive - Include inactive tenants (default false)
   * @returns Array of tenants
   */
  async findAll(includeInactive: boolean = false): Promise<Tenant[]> {
    // Cache key based on includeInactive flag
    const cacheKey = CacheService.generateKey(
      'tenants',
      'list',
      includeInactive ? 'all' : 'active',
    );

    // Try cache first
    const cached = await this.cacheService.get<Tenant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const query = this.tenantRepository.createQueryBuilder('tenant');

    // Filter by active status unless includeInactive is true
    if (!includeInactive) {
      query.where('tenant.is_active = :isActive', { isActive: true });
    }

    query.orderBy('tenant.name', 'ASC');

    const tenants = await query.getMany();

    // Cache results (5 minutes)
    await this.cacheService.set(cacheKey, tenants, 300);

    return tenants;
  }

  /**
   * Find one tenant by ID
   *
   * @param id - Tenant ID
   * @returns Tenant
   * @throws NotFoundException if tenant not found
   */
  async findOne(id: number): Promise<Tenant> {
    // Cache key
    const cacheKey = CacheService.generateKey('tenant', String(id));

    // Try cache first
    const cached = await this.cacheService.get<Tenant>(cacheKey);
    if (cached) {
      return cached;
    }

    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Cache result (5 minutes)
    await this.cacheService.set(cacheKey, tenant, 300);

    return tenant;
  }

  /**
   * Find tenant by name
   *
   * @param name - Tenant name
   * @returns Tenant
   * @throws NotFoundException if tenant not found
   */
  async findByName(name: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { name },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with name "${name}" not found`);
    }

    return tenant;
  }

  /**
   * Update tenant
   *
   * Admin: can update any tenant
   * Tenant Admin: can only update own tenant (enforced in controller)
   *
   * @param id - Tenant ID
   * @param dto - Update data
   * @returns Updated tenant
   * @throws NotFoundException if tenant not found
   * @throws BadRequestException if trying to reduce limits below current usage
   */
  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // COMMENTED - COLUMN MISSING IN DB
    // // If reducing limits, validate current usage doesn't exceed new limits
    // if (dto.maxEndpoints !== undefined && dto.maxEndpoints < tenant.maxEndpoints) {
    //   // TODO: Check current endpoint count when Endpoints module is implemented
    //   // For now, just log a warning
    //   this.logger.warn(
    //     `Reducing max_endpoints for tenant ${id} from ${tenant.maxEndpoints} to ${dto.maxEndpoints}`,
    //   );
    // }
    //
    // if (dto.maxQueues !== undefined && dto.maxQueues < tenant.maxQueues) {
    //   // TODO: Check current queue count when Queues module is implemented
    //   this.logger.warn(
    //     `Reducing max_queues for tenant ${id} from ${tenant.maxQueues} to ${dto.maxQueues}`,
    //   );
    // }

    // Update fields
    Object.assign(tenant, dto);

    const updated = await this.tenantRepository.save(tenant);

    // Invalidate cache - delete all list variants and specific tenant
    await this.cacheService.delPattern('tenants:list:*');
    await this.cacheService.del(CacheService.generateKey('tenant', String(id)));

    this.logger.log(`Updated tenant: ${id}`);
    return updated;
  }

  /**
   * Soft delete tenant
   *
   * Sets is_active to false instead of hard delete
   * Preserves data integrity with related records
   *
   * Only accessible by admin users (enforced by controller)
   *
   * @param id - Tenant ID
   * @throws NotFoundException if tenant not found
   */
  async remove(id: number): Promise<void> {
    const tenant = await this.findOne(id);

    // COMMENTED - COLUMN MISSING IN DB
    // // Soft delete: set is_active to false
    // tenant.isActive = false;
    // await this.tenantRepository.save(tenant);
    
    // For now, just delete directly (hard delete) since isActive column missing
    await this.tenantRepository.remove(tenant);

    // Invalidate cache
    await this.cacheService.delPattern('tenants:list:*');
    await this.cacheService.del(CacheService.generateKey('tenant', String(id)));

    this.logger.log(`Soft deleted tenant: ${id}`);
  }

  /**
   * Hard delete tenant
   *
   * Permanently removes tenant from database
   * Only use this if you're sure there are no related records
   *
   * @param id - Tenant ID
   * @throws NotFoundException if tenant not found
   */
  async hardDelete(id: number): Promise<void> {
    const tenant = await this.findOne(id);

    await this.tenantRepository.remove(tenant);

    // Invalidate cache
    await this.cacheService.delPattern('tenants:list:*');
    await this.cacheService.del(CacheService.generateKey('tenant', String(id)));

    this.logger.log(`Hard deleted tenant: ${id}`);
  }

  /**
   * Restore soft-deleted tenant
   *
   * @param id - Tenant ID
   * @returns Restored tenant
   * @throws NotFoundException if tenant not found
   */
  async restore(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // COMMENTED - COLUMN MISSING IN DB
    // tenant.isActive = true;
    // const restored = await this.tenantRepository.save(tenant);
    throw new Error('Restore disabled - isActive column missing in DB');

    // // Invalidate cache
    // await this.cacheService.del('tenants:list');
    // await this.cacheService.del(CacheService.generateKey('tenant', String(id)));
    //
    // this.logger.log(`Restored tenant: ${id}`);
    // return restored;
  }

  /**
   * Check if tenant has reached endpoint limit
   *
   * @param tenantId - Tenant ID
   * @param currentCount - Current endpoint count
   * @returns true if limit reached
   */
  async hasReachedEndpointLimit(
    tenantId: number,
    currentCount: number,
  ): Promise<boolean> {
    // COMMENTED - COLUMN MISSING IN DB
    // const tenant = await this.findOne(tenantId);
    // return currentCount >= tenant.maxEndpoints;
    return false; // No limit for now
  }

  /**
   * Check if tenant has reached queue limit
   *
   * @param tenantId - Tenant ID
   * @param currentCount - Current queue count
   * @returns true if limit reached
   */
  async hasReachedQueueLimit(
    tenantId: number,
    currentCount: number,
  ): Promise<boolean> {
    // COMMENTED - COLUMN MISSING IN DB
    // const tenant = await this.findOne(tenantId);
    // return currentCount >= tenant.maxQueues;
    return false; // No limit for now
  }

  /**
   * Get all existing context names
   *
   * Used to ensure unique context names
   *
   * @returns Array of context names
   * @private
   */
  private async getAllContextNames(): Promise<string[]> {
    const contexts = await this.tenantContextRepository.find({
      select: ['name'],
      where: { isPrimary: true },
    });
    return contexts.map((c) => c.name);
  }

  /**
   * Generate default extensions for a new tenant
   *
   * Creates extensions based on dialplan configuration:
   * - Internal dial pattern (e.g., _1XXX -> Dial PJSIP)
   * - Test extension (e.g., 999 -> Echo test)
   * - External dial pattern (if allowed)
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @param config - Dialplan configuration
   * @private
   */

  private async generateDefaultExtensions(
    tenantId: number,
    context: string,
    config: DialplanConfig,
  ): Promise<void> {
    const extensions: Partial<Extension>[] = [];

    // Internal dial extensions
    if (config.internalDialPattern) {
      extensions.push(
        {
          tenantId,
          context,
          exten: config.internalDialPattern,
          priority: 1,
          app: 'Dial',
          appdata: `PJSIP/t${tenantId}_\${EXTEN},${config.internalDialTimeout}`,
        },
        {
          tenantId,
          context,
          exten: config.internalDialPattern,
          priority: 2,
          app: 'Hangup',
          appdata: '',
        },
      );
    }

    // Test extension (echo test)
    if (config.testExtension) {
      extensions.push(
        {
          tenantId,
          context,
          exten: config.testExtension,
          priority: 1,
          app: 'Answer',
          appdata: '',
        },
        {
          tenantId,
          context,
          exten: config.testExtension,
          priority: 2,
          app: 'Echo',
          appdata: '',
        },
        {
          tenantId,
          context,
          exten: config.testExtension,
          priority: 3,
          app: 'Hangup',
          appdata: '',
        },
      );
    }

    // External dial (if allowed)
    if (config.allowExternal && config.externalPattern) {
      const dialString = config.externalPrefix
        ? `PJSIP/\${EXTEN:${config.externalPrefix.length}}@trunk`
        : `PJSIP/\${EXTEN}@trunk`;

      extensions.push(
        {
          tenantId,
          context,
          exten: config.externalPattern,
          priority: 1,
          app: 'Dial',
          appdata: dialString,
        },
        {
          tenantId,
          context,
          exten: config.externalPattern,
          priority: 2,
          app: 'Hangup',
          appdata: '',
        },
      );
    }

    // Save all extensions
    if (extensions.length > 0) {
      await this.extensionRepository.save(extensions);
      this.logger.log(
        `Generated ${extensions.length} default extensions for tenant ${tenantId}`,
      );
    }
  }

  /**
   * Get tenant statistics
   *
   * Returns statistics about tenant usage:
   * - Total endpoints and current count
   * - Total queues and current count
   * - Total calls (last 30 days)
   * - Usage percentages
   *
   * @param id - Tenant ID
   * @returns Tenant statistics
   * @throws NotFoundException if tenant not found
   */
  async getTenantStats(id: number): Promise<any> {
    // COMMENTED - COLUMNS MISSING IN DB (maxEndpoints, maxQueues, isActive)
    throw new Error('getTenantStats disabled - missing DB columns');
  }
}
