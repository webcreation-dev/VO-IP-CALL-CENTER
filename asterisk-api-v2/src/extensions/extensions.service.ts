import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Extension } from '../core/database/entities/extension.entity';
import { Tenant } from '../core/database/entities/tenant.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { ExtensionFilterDto } from './dto/extension-filter.dto';
import { CacheService } from '../core/cache/cache.service';

/**
 * Extensions Service
 *
 * Handles dialplan extension management operations
 *
 * Features:
 * - CRUD operations for extensions
 * - Multi-tenant isolation (context ownership validation)
 * - Auto-priority calculation
 * - Pagination and filtering
 * - Cache management
 *
 * Security:
 * - Validates context belongs to tenant
 * - Prevents cross-tenant access
 * - Enforces unique constraint (tenant_id, context, exten, priority)
 */
@Injectable()
export class ExtensionsService {
  private readonly logger = new Logger(ExtensionsService.name);

  constructor(
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantContext)
    private readonly tenantContextRepository: Repository<TenantContext>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a new extension
   *
   * Validates:
   * - Context belongs to tenant
   * - No duplicate (context, exten, priority)
   * - Auto-calculates priority if not provided
   *
   * @param tenantId - Tenant ID
   * @param dto - Extension creation data
   * @returns Created extension
   * @throws ForbiddenException if context doesn't belong to tenant
   * @throws ConflictException if extension already exists
   */
  async create(
    tenantId: number,
    dto: CreateExtensionDto,
  ): Promise<Extension> {
    // Validate context belongs to tenant
    await this.validateContextOwnership(tenantId, dto.context);

    // Auto-calculate priority if not provided
    if (!dto.priority) {
      dto.priority = await this.getNextPriority(
        tenantId,
        dto.context,
        dto.exten,
      );
    }

    // Check for duplicate
    const existing = await this.extensionRepository.findOne({
      where: {
        tenantId,
        context: dto.context,
        exten: dto.exten,
        priority: dto.priority,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Extension ${dto.exten} priority ${dto.priority} already exists in context ${dto.context}`,
      );
    }

    // Create extension
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

    this.logger.log(
      `Created extension: ${dto.context}/${dto.exten}/${dto.priority} (Tenant: ${tenantId})`,
    );
    return saved;
  }

  /**
   * Find all extensions with filters and pagination
   *
   * @param tenantId - Tenant ID
   * @param filter - Filter options
   * @returns Paginated extensions
   */
  async findAll(
    tenantId: number,
    filter?: ExtensionFilterDto,
  ): Promise<{
    data: Extension[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.extensionRepository.createQueryBuilder('extension');

    // Tenant isolation
    //query.where('extension.tenantId = :tenantId', { tenantId: tenantId ?? -1 });

    if (tenantId !== null) {
      query.where('extension.tenantId = :tenantId', { tenantId });
    }
    
    // Apply filters
    if (filter?.context) {
      query.andWhere('extension.context = :context', {
        context: filter.context,
      });
    }

    if (filter?.exten) {
      query.andWhere('extension.exten LIKE :exten', {
        exten: `%${filter.exten}%`,
      });
    }

    if (filter?.app) {
      query.andWhere('extension.app = :app', { app: filter.app });
    }

    if (filter?.minPriority !== undefined) {
      query.andWhere('extension.priority >= :minPriority', {
        minPriority: filter.minPriority,
      });
    }

    if (filter?.maxPriority !== undefined) {
      query.andWhere('extension.priority <= :maxPriority', {
        maxPriority: filter.maxPriority,
      });
    }

    // Search across multiple fields
    if (filter?.search) {
      query.andWhere(
        '(extension.exten LIKE :search OR extension.app LIKE :search OR extension.appdata LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    // Date filters
    if (filter?.createdAfter) {
      query.andWhere('extension.createdAt >= :createdAfter', {
        createdAfter: new Date(filter.createdAfter),
      });
    }

    if (filter?.createdBefore) {
      query.andWhere('extension.createdAt <= :createdBefore', {
        createdBefore: new Date(filter.createdBefore),
      });
    }

    // Get total count
    const total = await query.getCount();

    // Apply sorting
    const sortBy = filter?.sortBy || 'priority';
    const order = filter?.order || 'ASC';
    const allowedSortFields = [
      'context',
      'exten',
      'priority',
      'app',
      'createdAt',
    ];

    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`extension.${sortBy}`, order);
    } else {
      query.orderBy('extension.context', 'ASC');
      query.addOrderBy('extension.exten', 'ASC');
      query.addOrderBy('extension.priority', 'ASC');
    }

    // Pagination
    query.skip(skip).take(limit);

    const extensions = await query.getMany();

    return { data: extensions, total, page, limit };
  }

  /**
   * Find one extension by ID
   *
   * @param tenantId - Tenant ID
   * @param id - Extension ID
   * @returns Extension
   * @throws NotFoundException if extension not found or doesn't belong to tenant
   */
  async findOne(tenantId: number, id: number): Promise<Extension> {
    const extension = await this.extensionRepository.findOne({
      where: { id, tenantId },
    });

    if (!extension) {
      throw new NotFoundException(`Extension with ID ${id} not found`);
    }

    return extension;
  }

  /**
   * Update extension
   *
   * @param tenantId - Tenant ID
   * @param id - Extension ID
   * @param dto - Update data
   * @returns Updated extension
   * @throws NotFoundException if extension not found
   * @throws ForbiddenException if new context doesn't belong to tenant
   * @throws ConflictException if update creates duplicate
   */
  async update(
    tenantId: number,
    id: number,
    dto: UpdateExtensionDto,
  ): Promise<Extension> {
    const extension = await this.findOne(tenantId, id);

    // If changing context, validate ownership
    if (dto.context && dto.context !== extension.context) {
      await this.validateContextOwnership(tenantId, dto.context);
    }

    // Check for duplicate if changing key fields
    if (dto.context || dto.exten || dto.priority) {
      const newContext = dto.context || extension.context;
      const newExten = dto.exten || extension.exten;
      const newPriority = dto.priority || extension.priority;

      const duplicate = await this.extensionRepository.findOne({
        where: {
          tenantId,
          context: newContext,
          exten: newExten,
          priority: newPriority,
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `Extension ${newExten} priority ${newPriority} already exists in context ${newContext}`,
        );
      }
    }

    // Update fields
    Object.assign(extension, dto);

    const updated = await this.extensionRepository.save(extension);

    // Invalidate cache
    await this.invalidateCache(tenantId, extension.context);
    if (dto.context && dto.context !== extension.context) {
      await this.invalidateCache(tenantId, dto.context);
    }

    this.logger.log(`Updated extension: ${id} (Tenant: ${tenantId})`);
    return updated;
  }

  /**
   * Delete extension
   *
   * @param tenantId - Tenant ID
   * @param id - Extension ID
   * @throws NotFoundException if extension not found
   */
  async remove(tenantId: number, id: number): Promise<void> {
    const extension = await this.findOne(tenantId, id);

    await this.extensionRepository.remove(extension);

    // Invalidate cache
    await this.invalidateCache(tenantId, extension.context);

    this.logger.log(`Deleted extension: ${id} (Tenant: ${tenantId})`);
  }

  /**
   * Delete all extensions matching a specific pattern in a context
   *
   * Used for dialplan regeneration - deletes all extensions for a specific
   * pattern (e.g., _1XXX) before recreating them.
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @param pattern - Extension pattern (e.g., '_1XXX', '999')
   * @throws NotFoundException if context doesn't exist or doesn't belong to tenant
   */
  async deleteByPattern(
    tenantId: number,
    context: string,
    pattern: string,
  ): Promise<void> {
    // Validate context ownership
    await this.validateContextOwnership(tenantId, context);

    // Find all extensions matching the pattern
    const extensions = await this.extensionRepository.find({
      where: {
        tenantId,
        context,
        exten: pattern,
      },
    });

    if (extensions.length === 0) {
      this.logger.debug(
        `No extensions found for pattern '${pattern}' in context ${context} (Tenant: ${tenantId})`,
      );
      return;
    }

    // Delete all matching extensions
    await this.extensionRepository.remove(extensions);

    // Invalidate cache
    await this.invalidateCache(tenantId, context);

    this.logger.log(
      `Deleted ${extensions.length} extension(s) for pattern '${pattern}' in context ${context} (Tenant: ${tenantId})`,
    );
  }

  /**
   * Get list of contexts for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Array of unique context names
   */
  async getContexts(tenantId: number): Promise<string[]> {
    const cacheKey = CacheService.generateKey(
      'extensions',
      'contexts',
      String(tenantId),
    );

    // Try cache first
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.extensionRepository
      .createQueryBuilder('extension')
      .select('DISTINCT extension.context', 'context')
      .where('extension.tenantId = :tenantId', { tenantId })
      .orderBy('extension.context', 'ASC')
      .getRawMany();

    const contexts = result.map((r) => r.context);

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, contexts, 300);

    return contexts;
  }

  /**
   * Get extensions for a specific context
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @returns Array of extensions
   */
  async getByContext(
    tenantId: number,
    context: string,
  ): Promise<Extension[]> {
    // Validate context ownership
    await this.validateContextOwnership(tenantId, context);

    return await this.extensionRepository.find({
      where: { tenantId, context },
      order: {
        exten: 'ASC',
        priority: 'ASC',
      },
    });
  }

  /**
   * Validate that a context belongs to the tenant
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @throws ForbiddenException if context doesn't belong to tenant
   */
  private async validateContextOwnership(
    tenantId: number,
    context: string,
  ): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    // Check if context belongs to tenant
    const tenantContext = await this.tenantContextRepository.findOne({
      where: { tenantId, name: context },
    });
    if (!tenantContext) {
      throw new ForbiddenException(
        `Context '${context}' does not belong to your tenant`,
      );
    }
  }

  /**
   * Get next available priority for (context, exten) pair
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @param exten - Extension pattern
   * @returns Next available priority number
   */
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

  /**
   * Invalidate extension caches
   *
   * @param tenantId - Tenant ID
   * @param context - Context name (optional)
   */
  private async invalidateCache(
    tenantId: number,
    context?: string,
  ): Promise<void> {
    await this.cacheService.del(
      CacheService.generateKey('extensions', 'contexts', String(tenantId)),
    );
    if (context) {
      await this.cacheService.del(
        CacheService.generateKey(
          'extensions',
          String(tenantId),
          context,
        ),
      );
    }
  }
}
