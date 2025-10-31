import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../interfaces/user-payload.interface';

/**
 * Decorator to extract the current user's tenant ID from the request
 *
 * The tenant ID is extracted from request.user.tenantId (set by JWT strategy)
 * Returns null for global admin users (role: admin)
 *
 * @param data - Not used
 * @param ctx - Execution context
 * @returns The tenant ID (number) or null for global admin
 *
 * @example
 * ```typescript
 * @Get('queues')
 * getQueues(@CurrentTenant() tenantId: number | null) {
 *   if (tenantId) {
 *     // Filter by tenant
 *     return this.queueService.findByTenant(tenantId);
 *   } else {
 *     // Admin: return all
 *     return this.queueService.findAll();
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Post('queues')
 * createQueue(
 *   @CurrentTenant() tenantId: number,
 *   @Body() dto: CreateQueueDto,
 * ) {
 *   return this.queueService.create(tenantId, dto);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    return user?.tenantId ?? null;
  },
);
