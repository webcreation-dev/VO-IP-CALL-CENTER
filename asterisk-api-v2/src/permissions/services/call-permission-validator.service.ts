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
      return {
        allowed: false,
        reason: 'endpoint_not_found',
      };
    }

    // Check inter-context permissions
    if (caller.context !== called.context) {
      const interContextAllowed = await this.validateInterContext(
        caller.context,
        called.context,
      );

      if (!interContextAllowed) {
        return {
          allowed: false,
          reason: 'inter_context_denied',
        };
      }
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
          `Role-context mismatch: endpoint ${caller.id} in context ${caller.context} (ID: ${callerContext.id}) has role from context ${caller.role.contextId}`,
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
          `Role-context mismatch: endpoint ${called.id} in context ${called.context} (ID: ${calledContext.id}) has role from context ${called.role.contextId}`,
        );
        return {
          allowed: false,
          reason: 'role_context_mismatch',
        };
      }
    }

    // If no roles defined, allow (backward compatible)
    if (!caller.role || !called.role) {
      return {
        allowed: true,
      };
    }

    // Validate role permissions
    const roleAllowed = this.validateRolePermissions(caller.role, called.role);

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
    const source = await this.contextRepo.findOne({
      where: { name: sourceContext },
    });

    if (!source) {
      return false;
    }

    const config = source.dialplanConfig || {};

    return (
      config.allowInterContext === true &&
      Array.isArray(config.allowedContexts) &&
      config.allowedContexts.includes(targetContext)
    );
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
