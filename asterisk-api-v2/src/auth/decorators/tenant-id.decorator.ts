import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * TenantId Decorator
 *
 * Extracts tenant ID from authenticated user's JWT payload.
 *
 * @example
 * async getEndpoints(@TenantId() tenantId: number) {
 *   return this.endpointsService.findAll(tenantId);
 * }
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);
