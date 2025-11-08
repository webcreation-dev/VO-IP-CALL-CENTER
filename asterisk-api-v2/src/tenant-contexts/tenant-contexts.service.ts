import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { ExtensionsService } from '../extensions/extensions.service';
import { AsteriskConfigService } from '../core/asterisk-config/asterisk-config.service';

@Injectable()
export class TenantContextsService {
  private readonly logger = new Logger(TenantContextsService.name);

  constructor(
    @InjectRepository(TenantContext)
    private readonly tenantContextRepo: Repository<TenantContext>,
    private readonly extensionsService: ExtensionsService,
    private readonly asteriskConfigService: AsteriskConfigService,
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

    const savedContext = await this.tenantContextRepo.save(context);

    // Add context to Asterisk extensions.conf
    await this.asteriskConfigService.addContext(contextName);

    this.logger.log(`Created secondary context: ${contextName}`);

    return savedContext;
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

    const savedContext = await this.tenantContextRepo.save(context);

    // Create default dialplan extensions for this context
    await this.createDefaultDialplan(tenantId, contextName);

    // Add context to Asterisk extensions.conf
    await this.asteriskConfigService.addContext(contextName);

    this.logger.log(`Created primary context with default dialplan: ${contextName}`);

    return savedContext;
  }

  /**
   * Create default dialplan extensions for a context
   */
  private async createDefaultDialplan(tenantId: number, contextName: string): Promise<void> {
    try {
      // Extension _1XXX - Internal calls (1000-1999)
      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '_1XXX',
        priority: 1,
        app: 'NoOp',
        appdata: 'Internal call to ${EXTEN}',
      });

      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '_1XXX',
        priority: 2,
        app: 'Dial',
        appdata: `PJSIP/t${tenantId}_\${EXTEN},20,TtWw`,
      });

      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '_1XXX',
        priority: 3,
        app: 'Hangup',
        appdata: '',
      });

      // Extension 999 - Echo test
      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '999',
        priority: 1,
        app: 'Answer',
        appdata: '',
      });

      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '999',
        priority: 2,
        app: 'Echo',
        appdata: '',
      });

      await this.extensionsService.create(tenantId, {
        context: contextName,
        exten: '999',
        priority: 3,
        app: 'Hangup',
        appdata: '',
      });

      this.logger.log(`Default dialplan created for context: ${contextName}`);
    } catch (error) {
      this.logger.error(`Failed to create default dialplan for ${contextName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all contexts for a tenant
   */
  async findAll(tenantId: number): Promise<TenantContext[]> {
    if (!tenantId || tenantId === -1) {
      return await this.tenantContextRepo.find({
        order: { isPrimary: 'DESC', name: 'ASC' },
      });
    }
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

    // Track permission changes for logging
    const permissionsChanged = 'dialplanConfig' in updates;
    const oldConfig = permissionsChanged ? { ...context.dialplanConfig } : {};

    Object.assign(context, updates);
    const savedContext = await this.tenantContextRepo.save(context);

    // Log permission changes
    if (permissionsChanged) {
      this.logPermissionChanges(context.name, oldConfig, context.dialplanConfig);
    }

    return savedContext;
  }

  /**
   * Log permission configuration changes for audit
   */
  private logPermissionChanges(
    contextName: string,
    oldConfig: Record<string, any>,
    newConfig: Record<string, any>,
  ): void {
    const changes: string[] = [];

    // Check allowInterContext change
    if (oldConfig?.allowInterContext !== newConfig?.allowInterContext) {
      changes.push(
        `allowInterContext: ${oldConfig?.allowInterContext} → ${newConfig?.allowInterContext}`,
      );
    }

    // Check allowedContexts array change
    const oldContexts = oldConfig?.allowedContexts || [];
    const newContexts = newConfig?.allowedContexts || [];

    if (JSON.stringify(oldContexts) !== JSON.stringify(newContexts)) {
      const added = newContexts.filter((c: string) => !oldContexts.includes(c));
      const removed = oldContexts.filter((c: string) => !newContexts.includes(c));

      if (added.length > 0) {
        changes.push(`Added allowed contexts: ${added.join(', ')}`);
      }
      if (removed.length > 0) {
        changes.push(`Removed allowed contexts: ${removed.join(', ')}`);
      }
    }

    if (changes.length > 0) {
      this.logger.log(
        `Context ${contextName} permission changes: ${changes.join('; ')}`,
      );
    }
  }

  /**
   * Delete a context (cannot delete primary context)
   */
  async remove(id: number): Promise<void> {
    const context = await this.findOne(id);

    if (context.isPrimary) {
      throw new BadRequestException('Cannot delete the primary context');
    }

    // Remove from PostgreSQL
    await this.tenantContextRepo.remove(context);

    // Remove from Asterisk (non-blocking)
    await this.asteriskConfigService.removeContext(context.name);

    this.logger.log(`Removed context: ${context.name}`);
  }

  /**
   * Count contexts for a tenant
   */
  async count(tenantId: number): Promise<number> {
    return await this.tenantContextRepo.count({
      where: { tenantId },
    });
  }

  /**
   * Update inter-context permissions for a specific context
   *
   * @param id - Context ID
   * @param allowInterContext - Whether to enable inter-context calls
   * @param allowedContexts - Array of context names allowed to call
   */
  async updateInterContextPermissions(
    id: number,
    allowInterContext: boolean,
    allowedContexts: string[] = [],
  ): Promise<TenantContext> {
    const context = await this.findOne(id);

    const updatedConfig = {
      ...context.dialplanConfig,
      allowInterContext,
      allowedContexts: allowInterContext ? allowedContexts : [],
    };

    return this.update(id, { dialplanConfig: updatedConfig });
  }

  /**
   * Add allowed context for inter-context calling
   *
   * @param id - Source context ID
   * @param targetContextName - Target context name to allow
   */
  async addAllowedContext(id: number, targetContextName: string): Promise<TenantContext> {
    const context = await this.findOne(id);
    const config = context.dialplanConfig || {};
    const currentAllowed = config.allowedContexts || [];

    // Check if already allowed
    if (currentAllowed.includes(targetContextName)) {
      this.logger.warn(
        `Context ${context.name} already allows calls to ${targetContextName}`,
      );
      return context;
    }

    // Verify target context exists
    const targetExists = await this.tenantContextRepo.findOne({
      where: { name: targetContextName },
    });

    if (!targetExists) {
      throw new BadRequestException(
        `Target context ${targetContextName} does not exist`,
      );
    }

    const updatedConfig = {
      ...config,
      allowInterContext: true,
      allowedContexts: [...currentAllowed, targetContextName],
    };

    return this.update(id, { dialplanConfig: updatedConfig });
  }

  /**
   * Remove allowed context from inter-context calling
   *
   * @param id - Source context ID
   * @param targetContextName - Target context name to remove
   */
  async removeAllowedContext(id: number, targetContextName: string): Promise<TenantContext> {
    const context = await this.findOne(id);
    const config = context.dialplanConfig || {};
    const currentAllowed = config.allowedContexts || [];

    const updatedAllowed = currentAllowed.filter(
      (c: string) => c !== targetContextName,
    );

    const updatedConfig = {
      ...config,
      allowedContexts: updatedAllowed,
      // Disable allowInterContext if no contexts are allowed
      allowInterContext: updatedAllowed.length > 0,
    };

    return this.update(id, { dialplanConfig: updatedConfig });
  }
}
