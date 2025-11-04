import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';

@Injectable()
export class TenantContextsService {
  constructor(
    @InjectRepository(TenantContext)
    private readonly tenantContextRepo: Repository<TenantContext>,
  ) {}

  /**
   * Create a new context for a tenant
   */
  async create(tenantId: number, name: string, description?: string, dialplanConfig?: Record<string, any>): Promise<TenantContext> {
    // Generate full context name with tenant prefix
    const contextName = `t${tenantId}_${name}`;

    // Check if context name already exists
    const existing = await this.tenantContextRepo.findOne({
      where: { name: contextName },
    });

    if (existing) {
      throw new ConflictException(`Context with name '${contextName}' already exists`);
    }

    // Check if tenant already has a primary context when trying to create one
    const existingPrimary = await this.tenantContextRepo.findOne({
      where: { tenantId, isPrimary: true },
    });

    const context = this.tenantContextRepo.create({
      tenantId,
      name: contextName,
      description,
      isPrimary: false, // Never create additional primary contexts
      dialplanConfig: dialplanConfig || {
        allowInbound: true,
        allowOutbound: true,
        allowInternal: true,
        allowInterContext: false,
      },
    });

    return await this.tenantContextRepo.save(context);
  }

  /**
   * Create the primary context for a tenant (called automatically when creating a tenant)
   */
  async createPrimaryContext(tenantId: number): Promise<TenantContext> {
    const contextName = `t${tenantId}_default`;

    // Check if primary context already exists
    const existing = await this.tenantContextRepo.findOne({
      where: { tenantId, isPrimary: true },
    });

    if (existing) {
      throw new ConflictException(`Tenant ${tenantId} already has a primary context`);
    }

    const context = this.tenantContextRepo.create({
      tenantId,
      name: contextName,
      description: 'Primary context',
      isPrimary: true,
      dialplanConfig: {
        allowInbound: true,
        allowOutbound: true,
        allowInternal: true,
        allowInterContext: false,
      },
    });

    return await this.tenantContextRepo.save(context);
  }

  /**
   * Find all contexts for a tenant
   */
  async findAll(tenantId: number): Promise<TenantContext[]> {
    return await this.tenantContextRepo.find({
      where: { tenantId },
      order: { isPrimary: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Find primary context for a tenant
   */
  async findPrimary(tenantId: number): Promise<TenantContext> {
    const context = await this.tenantContextRepo.findOne({
      where: { tenantId, isPrimary: true },
    });

    if (!context) {
      throw new NotFoundException(`Primary context not found for tenant ${tenantId}`);
    }

    return context;
  }

  /**
   * Find a context by ID
   */
  async findOne(id: number): Promise<TenantContext> {
    const context = await this.tenantContextRepo.findOne({
      where: { id },
    });

    if (!context) {
      throw new NotFoundException(`Context with ID ${id} not found`);
    }

    return context;
  }

  /**
   * Find a context by name
   */
  async findByName(name: string): Promise<TenantContext> {
    const context = await this.tenantContextRepo.findOne({
      where: { name },
    });

    if (!context) {
      throw new NotFoundException(`Context with name '${name}' not found`);
    }

    return context;
  }

  /**
   * Update a context
   */
  async update(id: number, updates: Partial<TenantContext>): Promise<TenantContext> {
    const context = await this.findOne(id);

    // Cannot change isPrimary
    if ('isPrimary' in updates) {
      throw new BadRequestException('Cannot change isPrimary status');
    }

    // Cannot change tenantId
    if ('tenantId' in updates) {
      throw new BadRequestException('Cannot change tenant owner');
    }

    Object.assign(context, updates);
    return await this.tenantContextRepo.save(context);
  }

  /**
   * Delete a context (cannot delete primary context)
   */
  async remove(id: number): Promise<void> {
    const context = await this.findOne(id);

    if (context.isPrimary) {
      throw new BadRequestException('Cannot delete the primary context');
    }

    await this.tenantContextRepo.remove(context);
  }

  /**
   * Count contexts for a tenant
   */
  async count(tenantId: number): Promise<number> {
    return await this.tenantContextRepo.count({
      where: { tenantId },
    });
  }
}
