import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsEndpoint } from '../../endpoints/entities/ps-endpoint.entity';
import { TenantContext } from '../../core/database/entities/tenant-context.entity';
import { CallAuditLog } from '../../roles/entities/call-audit-log.entity';

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  callerRole?: any;
  calledRole?: any;
  caller?: PsEndpoint | null;
  called?: PsEndpoint | null;
}

/**
 * Call Permission Validator Service
 *
 * Validates if a call is allowed based on roles and inter-context permissions.
 */
@Injectable()
export class CallPermissionValidatorService {
  private readonly logger = new Logger(CallPermissionValidatorService.name);

  constructor(
    @InjectRepository(PsEndpoint)
    private readonly endpointRepo: Repository<PsEndpoint>,
    @InjectRepository(TenantContext)
    private readonly contextRepo: Repository<TenantContext>,
    @InjectRepository(CallAuditLog)
    private readonly auditLogRepo: Repository<CallAuditLog>,
  ) {}

  /**
   * Validate if a call from one endpoint to another is allowed
   */
  async validateCall(
    callerEndpointId: string,
    calledEndpointId: string,
  ): Promise<ValidationResult> {
    this.logger.debug(`Validating call: ${callerEndpointId} -> ${calledEndpointId}`);

    // Fetch both endpoints with their roles in parallel
    const [caller, called] = await Promise.all([
      this.endpointRepo.findOne({
        where: { id: callerEndpointId },
        relations: ['role'],
      }),
      this.endpointRepo.findOne({
        where: { id: calledEndpointId },
        relations: ['role'],
      }),
    ]);

    // If endpoints don't exist, deny
    if (!caller || !called) {
      this.logger.warn(`Endpoint not found: caller=${!!caller}, called=${!!called}`);
      return {
        allowed: false,
        reason: 'endpoint_not_found',
        caller,
        called,
      };
    }

    // Fetch all required contexts in a single query
    const contextNames = [...new Set([caller.context, called.context])];
    const contexts = await this.contextRepo.find({
      where: contextNames.map(name => ({ name })),
    });
    const contextMap = new Map(contexts.map(c => [c.name, c]));

    const callerContext = contextMap.get(caller.context);
    const calledContext = contextMap.get(called.context);

    // CRITICAL: Validate tenant isolation using cached contexts
    const tenantValidation = this.validateEndpointTenantIsolationWithContexts(
      caller,
      called,
      callerContext,
      calledContext,
    );
    if (!tenantValidation.valid) {
      this.logger.error(`Tenant isolation failed: ${tenantValidation.reason}`);
      return {
        allowed: false,
        reason: tenantValidation.reason,
        caller,
        called,
      };
    }

    this.logger.debug(
      `Endpoints: caller=${caller.id} (ctx:${caller.context}, role:${caller.role?.name || 'none'}), ` +
      `called=${called.id} (ctx:${called.context}, role:${called.role?.name || 'none'})`,
    );

    // Check inter-context permissions
    if (caller.context !== called.context) {
      const interContextAllowed = this.validateInterContextWithContexts(
        callerContext,
        calledContext,
      );

      if (!interContextAllowed) {
        this.logger.warn(`Inter-context denied: ${caller.context} -> ${called.context}`);
        return {
          allowed: false,
          reason: 'inter_context_denied',
          caller,
          called,
        };
      }
    }

    // Validate role-context consistency using cached contexts
    if (caller.role && caller.role.contextId !== null) {
      if (callerContext && caller.role.contextId !== callerContext.id) {
        this.logger.warn(
          `Role-context mismatch: ${caller.id} in context ${caller.context} has role from context ${caller.role.contextId}`,
        );
        return {
          allowed: false,
          reason: 'role_context_mismatch',
          caller,
          called,
        };
      }
    }

    if (called.role && called.role.contextId !== null) {
      if (calledContext && called.role.contextId !== calledContext.id) {
        this.logger.warn(
          `Role-context mismatch: ${called.id} in context ${called.context} has role from context ${called.role.contextId}`,
        );
        return {
          allowed: false,
          reason: 'role_context_mismatch',
          caller,
          called,
        };
      }
    }

    // If no roles defined, allow (backward compatible)
    if (!caller.role || !called.role) {
      this.logger.debug('No roles defined - allowing call (backward compatible)');
      return {
        allowed: true,
        caller,
        called,
      };
    }

    // Validate role permissions
    const roleAllowed = this.validateRolePermissions(caller.role, called.role);

    this.logger.debug(
      `Role check: caller.level=${caller.role.level}, called.level=${called.role.level}, allowed=${roleAllowed}`,
    );

    return {
      allowed: roleAllowed,
      reason: roleAllowed ? undefined : 'role_permission_denied',
      callerRole: caller.role,
      calledRole: called.role,
      caller,
      called,
    };
  }

  /**
   * Validate inter-context calling permissions using pre-fetched contexts
   */
  private validateInterContextWithContexts(
    source: TenantContext | undefined,
    target: TenantContext | undefined,
  ): boolean {
    if (!source || !target) {
      this.logger.warn(`Context not found: source=${!!source}, target=${!!target}`);
      return false;
    }

    // CRITICAL: Validate tenant isolation - prevent cross-tenant calls
    if (source.tenantId !== target.tenantId) {
      this.logger.warn(
        `SECURITY: Cross-tenant inter-context blocked: ${source.name} (tenant ${source.tenantId}) -> ${target.name} (tenant ${target.tenantId})`,
      );
      return false;
    }

    const config = source.dialplanConfig || {};

    const allowed =
      config.allowInterContext === true &&
      Array.isArray(config.allowedContexts) &&
      config.allowedContexts.includes(target.name);

    if (!allowed) {
      this.logger.debug(`Inter-context denied by config: ${source.name} -> ${target.name}`);
    }

    return allowed;
  }

  /**
   * Validate role-based permissions
   */
  private validateRolePermissions(callerRole: any, calledRole: any): boolean {
    if (callerRole.level === calledRole.level) {
      return callerRole.canCallSameLevel;
    }

    if (callerRole.level > calledRole.level) {
      return callerRole.canCallLowerLevel;
    }

    return callerRole.canCallHigherLevel;
  }

  /**
   * Validate endpoint-tenant isolation using pre-fetched contexts
   * Ensures both endpoints belong to same tenant and their contexts are valid
   */
  private validateEndpointTenantIsolationWithContexts(
    caller: PsEndpoint,
    called: PsEndpoint,
    callerContext: TenantContext | undefined,
    calledContext: TenantContext | undefined,
  ): { valid: boolean; reason?: string } {
    // Extract tenant IDs from endpoint IDs (format: t{tenantId}_{extension})
    const callerTenantMatch = caller.id.match(/^t(\d+)_/);
    const calledTenantMatch = called.id.match(/^t(\d+)_/);

    if (!callerTenantMatch || !calledTenantMatch) {
      this.logger.error(
        `SECURITY: Invalid endpoint ID format - caller: ${caller.id}, called: ${called.id}`,
      );
      return { valid: false, reason: 'invalid_endpoint_format' };
    }

    const callerTenantId = parseInt(callerTenantMatch[1], 10);
    const calledTenantId = parseInt(calledTenantMatch[1], 10);

    // CRITICAL: Validate both endpoints belong to same tenant
    if (callerTenantId !== calledTenantId) {
      this.logger.warn(
        `SECURITY: Cross-tenant call blocked - caller: ${caller.id} (tenant ${callerTenantId}) -> called: ${called.id} (tenant ${calledTenantId})`,
      );
      return { valid: false, reason: 'cross_tenant_call_blocked' };
    }

    // Validate contexts exist
    if (!callerContext) {
      this.logger.warn(
        `SECURITY: Orphaned context - endpoint ${caller.id} references non-existent context: ${caller.context}`,
      );
      return { valid: false, reason: 'orphaned_caller_context' };
    }

    if (!calledContext) {
      this.logger.warn(
        `SECURITY: Orphaned context - endpoint ${called.id} references non-existent context: ${called.context}`,
      );
      return { valid: false, reason: 'orphaned_called_context' };
    }

    // CRITICAL: Validate endpoint contexts belong to correct tenant
    if (callerContext.tenantId !== callerTenantId) {
      this.logger.error(
        `SECURITY: Context-tenant mismatch - endpoint ${caller.id} (tenant ${callerTenantId}) uses context ${caller.context} (tenant ${callerContext.tenantId})`,
      );
      return { valid: false, reason: 'caller_context_tenant_mismatch' };
    }

    if (calledContext.tenantId !== calledTenantId) {
      this.logger.error(
        `SECURITY: Context-tenant mismatch - endpoint ${called.id} (tenant ${calledTenantId}) uses context ${called.context} (tenant ${calledContext.tenantId})`,
      );
      return { valid: false, reason: 'called_context_tenant_mismatch' };
    }

    return { valid: true };
  }

  /**
   * Log a call attempt for audit
   * @param tenantId The tenant ID
   * @param callerEndpointId Caller endpoint ID
   * @param calledEndpointId Called endpoint ID
   * @param action Whether the call was allowed or denied
   * @param denyReason Reason for denial if applicable
   * @param metadata Additional metadata
   * @param caller Optional pre-fetched caller endpoint (avoids extra DB query)
   * @param called Optional pre-fetched called endpoint (avoids extra DB query)
   */
  async logCallAttempt(
    tenantId: number,
    callerEndpointId: string,
    calledEndpointId: string,
    action: 'allowed' | 'denied',
    denyReason?: string,
    metadata?: Record<string, any>,
    caller?: PsEndpoint | null,
    called?: PsEndpoint | null,
  ): Promise<void> {
    try {
      // Only fetch endpoints if not provided
      let callerData = caller;
      let calledData = called;

      if (!callerData || !calledData) {
        const [fetchedCaller, fetchedCalled] = await Promise.all([
          !callerData ? this.endpointRepo.findOne({
            where: { id: callerEndpointId },
            relations: ['role'],
          }) : Promise.resolve(callerData),
          !calledData ? this.endpointRepo.findOne({
            where: { id: calledEndpointId },
            relations: ['role'],
          }) : Promise.resolve(calledData),
        ]);
        callerData = fetchedCaller;
        calledData = fetchedCalled;
      }

      const log = this.auditLogRepo.create({
        tenantId,
        callerEndpointId,
        callerRoleId: callerData?.roleId,
        calledEndpointId,
        calledRoleId: calledData?.roleId,
        callerContext: callerData?.context,
        calledContext: calledData?.context,
        action,
        denyReason,
        channelId: metadata?.channelId,
        uniqueid: metadata?.uniqueid,
        callerNumber: metadata?.callerNumber,
        calledNumber: metadata?.calledNumber,
        metadata,
      });

      await this.auditLogRepo.save(log);
    } catch (error) {
      this.logger.error(`Error logging call attempt: ${error.message}`);
    }
  }
}
