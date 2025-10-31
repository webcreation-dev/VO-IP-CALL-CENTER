import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../interfaces/user-payload.interface';

/**
 * Decorator to extract the current authenticated user from the request
 *
 * The user is injected into request.user by the JWT strategy after successful authentication
 *
 * @param data - Optional property name to extract from user object
 * @param ctx - Execution context
 * @returns The user object or a specific property if data is provided
 *
 * @example
 * ```typescript
 * // Get entire user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: UserPayload) {
 *   return user;
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Get specific user property
 * @Get('my-queues')
 * getMyQueues(@CurrentUser('id') userId: number) {
 *   return this.queueService.findByUserId(userId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): UserPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    // If a specific property is requested, return it
    if (data) {
      return user?.[data];
    }

    // Return the entire user object
    return user;
  },
);
