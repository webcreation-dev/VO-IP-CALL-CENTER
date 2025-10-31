import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';
import { UserPayload } from '../interfaces/user-payload.interface';

/**
 * Role-Based Access Control Guard
 *
 * Checks if the authenticated user has one of the required roles
 * Applied globally via APP_GUARD in app.module.ts (after JwtAuthGuard)
 *
 * Behavior:
 * - If no @Roles() decorator: allow all authenticated users
 * - If @Roles() decorator present: check if user.role matches any of the required roles
 * - If match: allow access
 * - If no match: throw ForbiddenException
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * deleteUser() { ... }
 *
 * @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
 * @Post()
 * createQueue() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Check if user has required role(s)
   * @param context - Execution context
   * @returns boolean - true if allowed, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (injected by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
