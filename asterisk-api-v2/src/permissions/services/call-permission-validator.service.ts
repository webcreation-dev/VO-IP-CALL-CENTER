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
    this.logger.log('┌────────────────────────────────────────────────────────────────┐');
    this.logger.log('│           VALIDATING CALL PERMISSIONS                         │');
    this.logger.log('├────────────────────────────────────────────────────────────────┤');
    this.logger.log(`│ Caller: ${callerEndpointId.padEnd(53)} │`);
    this.logger.log(`│ Called: ${calledEndpointId.padEnd(53)} │`);
    this.logger.log('└────────────────────────────────────────────────────────────────┘');

    // Fetch both endpoints with their roles
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
      this.logger.warn('❌ Endpoint not found');
      this.logger.warn(`   Caller exists: ${!!caller}`);
      this.logger.warn(`   Called exists: ${!!called}`);
      return {
        allowed: false,
        reason: 'endpoint_not_found',
      };
    }

    // CRITICAL: Validate tenant isolation
    const tenantValidation = await this.validateEndpointTenantIsolation(
      caller,
      called,
    );
    if (!tenantValidation.valid) {
      this.logger.error(`❌ Tenant isolation validation failed: ${tenantValidation.reason}`);
      return {
        allowed: false,
        reason: tenantValidation.reason,
      };
    }

    // Log endpoint information
    this.logger.log('┌────────────────────────────────────────────────────────────────┐');
    this.logger.log('│ ENDPOINT INFORMATION                                           │');
    this.logger.log('├────────────────────────────────────────────────────────────────┤');
    this.logger.log(`│ Caller Context:  ${(caller.context || 'N/A').padEnd(44)} │`);
    this.logger.log(`│ Caller Role:     ${(caller.role?.name || 'NO ROLE').padEnd(44)} │`);
    this.logger.log(`│ Caller Level:    ${(caller.role ? String(caller.role.level) : 'N/A').padEnd(44)} │`);
    this.logger.log('├────────────────────────────────────────────────────────────────┤');
    this.logger.log(`│ Called Context:  ${(called.context || 'N/A').padEnd(44)} │`);
    this.logger.log(`│ Called Role:     ${(called.role?.name || 'NO ROLE').padEnd(44)} │`);
    this.logger.log(`│ Called Level:    ${(called.role ? String(called.role.level) : 'N/A').padEnd(44)} │`);
    this.logger.log('└────────────────────────────────────────────────────────────────┘');

    // Check inter-context permissions
    if (caller.context !== called.context) {
      this.logger.log('⚠️  Inter-context call detected');
      const interContextAllowed = await this.validateInterContext(
        caller.context,
        called.context,
      );

      if (!interContextAllowed) {
        this.logger.warn(`❌ Inter-context call denied: ${caller.context} → ${called.context}`);
        return {
          allowed: false,
          reason: 'inter_context_denied',
        };
      }
      this.logger.log(`✅ Inter-context call allowed: ${caller.context} → ${called.context}`);
    } else {
      this.logger.log('✓ Same context call');
    }

    // Validate role-context consistency
    // If endpoint has a role, ensure role belongs to the same context or is tenant-wide
    if (caller.role && caller.role.contextId !== null) {
      // Get caller's context ID
      const callerContext = await this.contextRepo.findOne({
        where: { name: caller.context },
      });

      if (callerContext && caller.role.contextId !== callerContext.id) {
        this.logger.warn(
          `❌ Role-context mismatch: endpoint ${caller.id} in context ${caller.context} (ID: ${callerContext.id}) has role from context ${caller.role.contextId}`,
        );
        return {
          allowed: false,
          reason: 'role_context_mismatch',
        };
      }
    }

    if (called.role && called.role.contextId !== null) {
      // Get called's context ID
      const calledContext = await this.contextRepo.findOne({
        where: { name: called.context },
      });

      if (calledContext && called.role.contextId !== calledContext.id) {
        this.logger.warn(
          `❌ Role-context mismatch: endpoint ${called.id} in context ${called.context} (ID: ${calledContext.id}) has role from context ${called.role.contextId}`,
        );
        return {
          allowed: false,
          reason: 'role_context_mismatch',
        };
      }
    }

    // If no roles defined, allow (backward compatible)
    if (!caller.role || !called.role) {
      this.logger.log('✅ No roles defined - allowing call (backward compatible)');
      return {
        allowed: true,
      };
    }

    // Validate role permissions
    this.logger.log('┌────────────────────────────────────────────────────────────────┐');
    this.logger.log('│ ROLE PERMISSION EVALUATION                                     │');
    this.logger.log('├────────────────────────────────────────────────────────────────┤');
    this.logger.log(`│ Caller Level: ${String(caller.role.level).padEnd(48)} │`);
    this.logger.log(`│ Called Level: ${String(called.role.level).padEnd(48)} │`);
    this.logger.log('├────────────────────────────────────────────────────────────────┤');

    if (caller.role.level === called.role.level) {
      this.logger.log('│ Scenario: Same Level                                           │');
      this.logger.log(`│ Permission: canCallSameLevel = ${String(caller.role.canCallSameLevel).padEnd(28)} │`);
    } else if (caller.role.level > called.role.level) {
      this.logger.log('│ Scenario: Higher → Lower                                       │');
      this.logger.log(`│ Permission: canCallLowerLevel = ${String(caller.role.canCallLowerLevel).padEnd(27)} │`);
    } else {
      this.logger.log('│ Scenario: Lower → Higher                                       │');
      this.logger.log(`│ Permission: canCallHigherLevel = ${String(caller.role.canCallHigherLevel).padEnd(26)} │`);
    }

    const roleAllowed = this.validateRolePermissions(caller.role, called.role);

    this.logger.log('├────────────────────────────────────────────────────────────────┤');
    this.logger.log(`│ Result: ${(roleAllowed ? '✅ ALLOWED' : '❌ DENIED').padEnd(53)} │`);
    this.logger.log('└────────────────────────────────────────────────────────────────┘');

    return {
      allowed: roleAllowed,
      reason: roleAllowed ? undefined : 'role_permission_denied',
      callerRole: caller.role,
      calledRole: called.role,
    };
  }

  /**
   * Validate inter-context calling permissions
   */
  private async validateInterContext(
    sourceContext: string,
    targetContext: string,
  ): Promise<boolean> {
    // Fetch both contexts in parallel
    const [source, target] = await Promise.all([
      this.contextRepo.findOne({
        where: { name: sourceContext },
      }),
      this.contextRepo.findOne({
        where: { name: targetContext },
      }),
    ]);

    if (!source || !target) {
      this.logger.warn(`❌ Context not found: source=${!!source}, target=${!!target}`);
      return false;
    }

    // CRITICAL: Validate tenant isolation - prevent cross-tenant calls
    if (source.tenantId !== target.tenantId) {
      this.logger.warn(
        `🚨 SECURITY: Cross-tenant inter-context blocked: ${sourceContext} (tenant ${source.tenantId}) → ${targetContext} (tenant ${target.tenantId})`,
      );
      return false;
    }

    const config = source.dialplanConfig || {};

    const allowed =
      config.allowInterContext === true &&
      Array.isArray(config.allowedContexts) &&
      config.allowedContexts.includes(targetContext);

    if (!allowed) {
      this.logger.debug(
        `Inter-context denied by config: ${sourceContext} → ${targetContext}`,
      );
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
   * Validate endpoint-tenant isolation
   * Ensures both endpoints belong to same tenant and their contexts are valid
   */
  private async validateEndpointTenantIsolation(
    caller: PsEndpoint,
    called: PsEndpoint,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Extract tenant IDs from endpoint IDs (format: t{tenantId}_{extension})
    const callerTenantMatch = caller.id.match(/^t(\d+)_/);
    const calledTenantMatch = called.id.match(/^t(\d+)_/);

    if (!callerTenantMatch || !calledTenantMatch) {
      this.logger.error(
        `🚨 SECURITY: Invalid endpoint ID format - caller: ${caller.id}, called: ${called.id}`,
      );
      return { valid: false, reason: 'invalid_endpoint_format' };
    }

    const callerTenantId = parseInt(callerTenantMatch[1], 10);
    const calledTenantId = parseInt(calledTenantMatch[1], 10);

    // CRITICAL: Validate both endpoints belong to same tenant
    if (callerTenantId !== calledTenantId) {
      this.logger.warn(
        `🚨 SECURITY: Cross-tenant call blocked - caller: ${caller.id} (tenant ${callerTenantId}) → called: ${called.id} (tenant ${calledTenantId})`,
      );
      return { valid: false, reason: 'cross_tenant_call_blocked' };
    }

    // Validate that endpoint contexts exist and belong to correct tenant
    const [callerContext, calledContext] = await Promise.all([
      this.contextRepo.findOne({
        where: { name: caller.context },
      }),
      this.contextRepo.findOne({
        where: { name: called.context },
      }),
    ]);

    if (!callerContext) {
      this.logger.warn(
        `🚨 SECURITY: Orphaned context detected - endpoint ${caller.id} references non-existent context: ${caller.context}`,
      );
      return { valid: false, reason: 'orphaned_caller_context' };
    }

    if (!calledContext) {
      this.logger.warn(
        `🚨 SECURITY: Orphaned context detected - endpoint ${called.id} references non-existent context: ${called.context}`,
      );
      return { valid: false, reason: 'orphaned_called_context' };
    }

    // CRITICAL: Validate endpoint contexts belong to correct tenant
    if (callerContext.tenantId !== callerTenantId) {
      this.logger.error(
        `🚨 SECURITY: Context-tenant mismatch - endpoint ${caller.id} (tenant ${callerTenantId}) uses context ${caller.context} (tenant ${callerContext.tenantId})`,
      );
      return { valid: false, reason: 'caller_context_tenant_mismatch' };
    }

    if (calledContext.tenantId !== calledTenantId) {
      this.logger.error(
        `🚨 SECURITY: Context-tenant mismatch - endpoint ${called.id} (tenant ${calledTenantId}) uses context ${called.context} (tenant ${calledContext.tenantId})`,
      );
      return { valid: false, reason: 'called_context_tenant_mismatch' };
    }

    return { valid: true };
  }

  /**
   * Log a call attempt for audit
   */
  async logCallAttempt(
    tenantId: number,
    callerEndpointId: string,
    calledEndpointId: string,
    action: 'allowed' | 'denied',
    denyReason?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Fetch roles for logging
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

      const log = this.auditLogRepo.create({
        tenantId,
        callerEndpointId,
        callerRoleId: caller?.roleId,
        calledEndpointId,
        calledRoleId: called?.roleId,
        callerContext: caller?.context,
        calledContext: called?.context,
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
