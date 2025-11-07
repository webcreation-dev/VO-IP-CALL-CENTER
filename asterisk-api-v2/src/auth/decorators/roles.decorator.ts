import { SetMetadata } from '@nestjs/common';

/**
 * Roles Decorator
 *
 * Specifies which roles are allowed to access a route.
 * Must be used with RolesGuard.
 *
 * @example
 * @Roles('admin', 'manager')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminRoute() { ... }
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
