import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { ExtensionsService } from '../extensions/extensions.service';
import { AsteriskConfigService } from '../core/asterisk-config/asterisk-config.service';
import { RolesService } from '../roles/roles.service';
import { promises as fs } from 'fs';

@Injectable()
export class TenantContextsService {
  private readonly logger = new Logger(TenantContextsService.name);
  private readonly DYNAMIC_CONTEXTS = '/etc/asterisk/extensions_dynamic.conf';
  private reloadTimer: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 5000;

  constructor(
    @InjectRepository(TenantContext)
    private readonly tenantContextRepo: Repository<TenantContext>,
    private readonly extensionsService: ExtensionsService,
    private readonly asteriskConfigService: AsteriskConfigService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
  ) {}


  /**
   * Generate extensions_dynamic.conf from database contexts
   */
  async generateDynamicContexts(): Promise<void> {
    try {
      const contexts = await this.tenantContextRepo.find({
        order: { tenantId: 'ASC', name: 'ASC' },
      });

      let content = '; Auto-generated dynamic contexts for multitenancy\n';
      content += `; Generated at: ${new Date().toISOString()}\n`;
      content += `; Total contexts: ${contexts.length}\n`;
      content += '; DO NOT EDIT MANUALLY - Changes will be overwritten\n\n';

      // Define base template
      content += '[tenant_template](!)\n';
      content += 'switch => Realtime\n\n';

      // Group contexts by tenant for better readability
      const contextsByTenant = contexts.reduce<Record<number, TenantContext[]>>((acc, ctx) => {
        if (!acc[ctx.tenantId]) {
          acc[ctx.tenantId] = [];
        }
        acc[ctx.tenantId].push(ctx);
        return acc;
      }, {});

      // Generate contexts grouped by tenant
      for (const [tenantId, tenantContexts] of Object.entries<TenantContext[]>(contextsByTenant)) {
        content += `; Tenant ${tenantId} contexts\n`;
        
        for (const context of tenantContexts) {
          content += `[${context.name}](tenant_template)\n`;
          
          if (context.description) {
            content += `; ${context.description}\n`;
          }
          
          if (context.isPrimary) {
            content += `; PRIMARY CONTEXT\n`;
          }
          
          content += '\n';
        }
      }

      await fs.writeFile(this.DYNAMIC_CONTEXTS, content, 'utf8');
      this.logger.log(`Generated ${contexts.length} contexts in ${this.DYNAMIC_CONTEXTS}`);
    } catch (error) {
      this.logger.error(`Failed to generate dynamic contexts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Schedule context regeneration with debouncing to avoid excessive reloads
   */
  async scheduleContextRegeneration(): Promise<void> {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }

    this.reloadTimer = setTimeout(async () => {
      try {
        await this.generateDynamicContexts();
        await this.asteriskConfigService.reloadDialplan();
      } catch (error) {
        this.logger.error(`Scheduled context regeneration failed: ${error.message}`);
      }
    }, this.DEBOUNCE_MS);
  }

  /**
   * Force immediate regeneration (no debouncing)
   */
  async forceRegenerateContexts(): Promise<void> {
    await this.generateDynamicContexts();
    await this.asteriskConfigService.reloadDialplan();
  }


  /**
   * Create a new context for a tenant
   * @param tenantId - Tenant ID
   * @param name - Context name (will be prefixed with tenant ID)
   * @param description - Optional description
   * @param dialplanConfig - Optional dialplan configuration
   * @param roleStrategy - Optional role strategy ('context-specific' or 'use-tenant-roles')
   * @param presetId - Optional preset ID (required if roleStrategy is 'context-specific')
   */
  async create(
    tenantId: number,
    name: string,
    description?: string,
    dialplanConfig?: Record<string, any>,
    roleStrategy?: 'context-specific' | 'use-tenant-roles',
    presetId?: string,
    customRoles?: any[], // CustomRoleDto[] from roles module
  ): Promise<TenantContext> {
    // Generate full context name with tenant prefix
    const contextName = `t${tenantId}_${name}`;

    // Check if context name already exists
    const existing = await this.tenantContextRepo.findOne({
      where: { name: contextName },
    });

    if (existing) {
      throw new ConflictException(`Context with name '${contextName}' already exists`);
    }

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

    // Apply role preset if strategy is context-specific, then create dialplan
    if (roleStrategy === 'context-specific' && presetId) {
      try {
        // Apply roles first
        await this.rolesService.applyPresetToContext(
          tenantId,
          savedContext.id,
          presetId,
          customRoles, // Pass custom roles if provided
        );
        const customLabel = customRoles ? ' (with customizations)' : '';
        this.logger.log(`Applied role preset '${presetId}'${customLabel} to context ${contextName}`);

        // Create dialplan AFTER roles are applied (will detect correct organization type)
        await this.createDefaultDialplan(tenantId, contextName, savedContext.id);
      } catch (error) {
        this.logger.error(
          `Failed to apply role preset to context ${contextName}: ${error.message}`,
        );
        // Don't fail context creation if role preset fails
        // Create flat dialplan as fallback
        await this.createDefaultDialplan(tenantId, contextName, savedContext.id);
      }
    } else {
      // No role preset - create flat dialplan
      await this.createDefaultDialplan(tenantId, contextName, savedContext.id);
    }

    // Reload Asterisk dialplan to load the new context from database
    await this.asteriskConfigService.reloadDialplan();

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
    await this.createDefaultDialplan(tenantId, contextName, savedContext.id);

    // Reload Asterisk dialplan to load the new context from database
    await this.asteriskConfigService.reloadDialplan();

    this.logger.log(`Created primary context with default dialplan: ${contextName}`);

    return savedContext;
  }

  /**
   * Determine if a context uses a flat organization structure
   *
   * A flat organization is one where:
   * - No context-specific roles exist (e.g., using 'use-tenant-roles' strategy)
   * - All context-specific roles are at the same level
   * - All context-specific roles have unrestricted permissions (can call everyone)
   *
   * Important: Only context-specific roles are considered. If a context has no
   * context-specific roles (roleStrategy = 'use-tenant-roles'), it's considered FLAT
   * and will NOT use ARI validation.
   *
   * @param tenantId - Tenant ID
   * @param contextId - Context ID
   * @returns true if flat organization, false if hierarchical
   */
  private async isFlatOrganization(tenantId: number, contextId: number): Promise<boolean> {
    // Fetch context-specific roles ONLY
    const contextRoles = await this.rolesService.findContextSpecificRoles(tenantId, contextId);

    // No context-specific roles = FLAT organization
    // This includes contexts using 'use-tenant-roles' strategy
    if (!contextRoles || contextRoles.length === 0) {
      this.logger.debug(`Context ${contextId}: No context-specific roles - FLAT organization`);
      return true;
    }

    // Check if all roles are at the same level
    const levels = contextRoles.map(r => r.level);
    const allSameLevel = levels.every(level => level === levels[0]);

    if (allSameLevel) {
      this.logger.debug(`Context ${contextId}: All roles at same level (${levels[0]}) - FLAT organization`);
      return true;
    }

    // Check if all roles have unrestricted permissions
    const allUnrestricted = contextRoles.every(
      role => role.canCallSameLevel && role.canCallLowerLevel && role.canCallHigherLevel,
    );

    if (allUnrestricted) {
      this.logger.debug(`Context ${contextId}: All roles have unrestricted permissions - FLAT organization`);
      return true;
    }

    // Has roles with different levels and restrictions - hierarchical
    this.logger.debug(`Context ${contextId}: Hierarchical organization detected (${contextRoles.length} context-specific roles with varying levels/permissions)`);
    return false;
  }

  /**
   * Create default dialplan extensions for a context
   *
   * Generates conditional dialplan based on organization type:
   * - Flat organization: Simple 3-priority dialplan (NoOp → Dial → Hangup)
   * - Hierarchical organization: 5-priority dialplan with ARI validation (NoOp → Set → Stasis → Dial → Hangup)
   *
   * @param tenantId - Tenant ID
   * @param contextName - Full context name (with tenant prefix)
   * @param contextId - Optional context ID (if not provided, creates flat dialplan as default)
   */
  private async createDefaultDialplan(
    tenantId: number,
    contextName: string,
    contextId?: number,
  ): Promise<void> {
    try {
      // Determine organization type
      let isFlat = true; // Default to flat if contextId not provided
      let orgType = 'FLAT (default)';

      if (contextId) {
        isFlat = await this.isFlatOrganization(tenantId, contextId);
        orgType = isFlat ? 'FLAT' : 'HIERARCHICAL';
      }

      this.logger.log(`Creating dialplan for context ${contextName} - Organization type: ${orgType}`);

      // Extension _1XXX - Internal calls (1000-1999)
      if (isFlat) {
        // ========================================
        // FLAT ORGANIZATION - 3 priorities
        // ========================================
        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 1,
          app: 'NoOp',
          appdata: 'Internal call to ${EXTEN} [FLAT ORG - No validation]',
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

        this.logger.log(`  → FLAT organization dialplan: NoOp → Dial → Hangup (3 priorities)`);
      } else {
        // ========================================
        // HIERARCHICAL ORGANIZATION - 5 priorities
        // ========================================
        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 1,
          app: 'NoOp',
          appdata: 'Internal call from ${CALLERID(num)} to ${EXTEN} [HIERARCHICAL - Validation required]',
        });

        // Set channel variable with called endpoint ID
        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 2,
          app: 'Set',
          appdata: `__CALLED_ENDPOINT=t${tenantId}_\${EXTEN}`,
        });

        // Transfer to ARI application for validation
        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 3,
          app: 'Stasis',
          appdata: 'call-validator,validate',
        });

        // If validation passes, ARI returns to dialplan here
        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 4,
          app: 'Dial',
          appdata: `PJSIP/t${tenantId}_\${EXTEN},20,TtWw`,
        });

        await this.extensionsService.create(tenantId, {
          context: contextName,
          exten: '_1XXX',
          priority: 5,
          app: 'Hangup',
          appdata: '',
        });

        this.logger.log(`  → HIERARCHICAL organization dialplan: NoOp → Set → Stasis → Dial → Hangup (5 priorities)`);
      }

      // Extension 999 - Echo test (same for both types)
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

      this.logger.log(`✅ Default dialplan created for context: ${contextName} (${orgType})`);
    } catch (error) {
      this.logger.error(`Failed to create default dialplan for ${contextName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Regenerate dialplan for a context
   *
   * Deletes existing internal call extensions (_1XXX) and recreates them based on
   * the current organization type (flat vs hierarchical).
   *
   * Called after:
   * - Applying a role preset during context creation
   * - Changing role preset in context update
   * - Switching between context-specific and tenant-wide roles
   *
   * @param contextId - Context ID
   */
  async regenerateDialplanForContext(contextId: number): Promise<void> {
    try {
      const context = await this.findOne(contextId);
      this.logger.log(`🔄 Regenerating dialplan for context: ${context.name}`);

      // Delete existing extensions (both _1XXX and 999)
      await this.extensionsService.deleteByPattern(context.tenantId, context.name, '_1XXX');
      this.logger.log(`  → Deleted old _1XXX extensions`);

      await this.extensionsService.deleteByPattern(context.tenantId, context.name, '999');
      this.logger.log(`  → Deleted old 999 extension (echo test)`);

      // Recreate dialplan with current organization type (recreates both patterns)
      await this.createDefaultDialplan(context.tenantId, context.name, context.id);

      // Reload Asterisk dialplan
      await this.asteriskConfigService.reloadDialplan();

      this.logger.log(`✅ Dialplan regenerated successfully for context: ${context.name}`);
    } catch (error) {
      this.logger.error(`Failed to regenerate dialplan for context ${contextId}: ${error.message}`);
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
  async update(
    id: number,
    updates: Partial<TenantContext> & {
      roleStrategy?: 'context-specific' | 'use-tenant-roles';
      presetId?: string;
      customRoles?: any[];
    },
  ): Promise<TenantContext> {
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

    // Extract role-related fields from updates before assigning to context
    const { roleStrategy, presetId, customRoles, ...contextUpdates } = updates;

    Object.assign(context, contextUpdates);
    const savedContext = await this.tenantContextRepo.save(context);

    // Log permission changes
    if (permissionsChanged) {
      this.logPermissionChanges(context.name, oldConfig, context.dialplanConfig);
    }

    // Track if roles were modified (for dialplan regeneration)
    let rolesModified = false;

    // Handle role strategy and preset updates
    if (roleStrategy === 'context-specific' && presetId) {
      try {
        // First, delete existing context-specific roles
        await this.rolesService.deleteContextRoles(context.tenantId, context.id);

        // Apply the new preset
        await this.rolesService.applyPresetToContext(
          context.tenantId,
          context.id,
          presetId,
          customRoles, // Pass custom roles if provided
        );

        const customLabel = customRoles ? ' (with customizations)' : '';
        this.logger.log(
          `Updated role preset for context ${context.name} to '${presetId}'${customLabel}`,
        );
        rolesModified = true;
      } catch (error) {
        this.logger.error(
          `Failed to update role preset for context ${context.name}: ${error.message}`,
        );
        // Don't fail the entire update if role preset update fails
      }
    } else if (roleStrategy === 'use-tenant-roles') {
      try {
        // Delete context-specific roles when switching to tenant roles
        await this.rolesService.deleteContextRoles(context.tenantId, context.id);
        this.logger.log(`Switched context ${context.name} to use tenant roles`);
        rolesModified = true;
      } catch (error) {
        this.logger.error(
          `Failed to delete context roles for ${context.name}: ${error.message}`,
        );
      }
    }

    // Regenerate dialplan if roles were modified
    if (rolesModified) {
      try {
        await this.regenerateDialplanForContext(context.id);
      } catch (error) {
        this.logger.error(
          `Failed to regenerate dialplan after role update for ${context.name}: ${error.message}`,
        );
        // Log error but don't fail the update
      }
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

    // Reload Asterisk dialplan to remove the context
    // (extensions are deleted automatically via CASCADE foreign key)
    await this.asteriskConfigService.reloadDialplan();

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
