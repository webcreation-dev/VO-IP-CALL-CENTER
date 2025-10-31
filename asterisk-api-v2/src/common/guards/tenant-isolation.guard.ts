import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import { UserPayload } from '../interfaces/user-payload.interface';

/**
 * Tenant Isolation Guard
 *
 * Ensures users can only access resources belonging to their tenant
 * Global admins (role: admin) can access all tenants
 *
 * Behavior:
 * - Admin (global): bypass tenant check, can access all tenants
 * - Other roles: verify tenantId in request matches user's tenantId
 * - Checks params (e.g., /tenants/:tenantId) and body (e.g., { tenantId: 1 })
 * - If mismatch: throw ForbiddenException
 *
 * NOTE: This guard should be applied to specific routes/controllers,
 * not globally, as not all endpoints have tenantId in params/body
 *
 * @example
 * ```typescript
 * @UseGuards(TenantIsolationGuard)
 * @Get('tenants/:tenantId/queues')
 * getQueues(@Param('tenantId') tenantId: number) { ... }
 *
 * @UseGuards(TenantIsolationGuard)
 * @Post('queues')
 * createQueue(@Body() dto: CreateQueueDto) {
 *   // dto.tenantId will be validated
 * }
 * ```
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  /**
   * Check if user can access the requested tenant's resources
   * @param context - Execution context
   * @returns boolean - true if allowed, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    // Global admin can access all tenants
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Extract tenantId from request (params or body)
    const requestTenantId = this.extractTenantId(request);

    // If no tenantId in request, allow (might be a route that doesn't deal with tenant-specific resources)
    if (requestTenantId === null) {
      return true;
    }

    // Verify user's tenantId matches the requested tenantId
    if (user.tenantId !== requestTenantId) {
      throw new ForbiddenException(
        `Access denied. You can only access resources from your tenant (${user.tenantId}).`,
      );
    }

    return true;
  }

  /**
   * Extract tenant ID from request params or body
   * @param request - HTTP request object
   * @returns number | null - tenant ID or null if not found
   */
  private extractTenantId(request: any): number | null {
    // Check params first (e.g., /tenants/:tenantId/queues)
    if (request.params?.tenantId) {
      return parseInt(request.params.tenantId, 10);
    }

    // Check body (e.g., POST /queues with { tenantId: 1, ... })
    if (request.body?.tenantId) {
      return parseInt(request.body.tenantId, 10);
    }

    // Check query params (e.g., ?tenantId=1)
    if (request.query?.tenantId) {
      return parseInt(request.query.tenantId, 10);
    }

    return null;
  }
}
