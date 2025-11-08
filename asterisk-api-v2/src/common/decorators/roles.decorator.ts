import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing a route
 *
 * @param roles - Array of UserRole values required to access the route
 *
 * @example
 * ```typescript
 * @Roles(UserRole.SUPER_ADMIN)
 * @Get('sensitive-data')
 * getSensitiveData() {
 *   return this.service.getSensitiveData();
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
 * @Post()
 * create(@Body() dto: CreateDto) {
 *   return this.service.create(dto);
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
