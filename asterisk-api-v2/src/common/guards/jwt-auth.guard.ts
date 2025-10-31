import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 *
 * Extends Passport's AuthGuard to add support for public routes
 * Automatically applied globally via APP_GUARD in app.module.ts
 *
 * Behavior:
 * - If route has @Public() decorator: skip authentication
 * - Otherwise: validate JWT token via Passport JWT strategy
 * - On success: injects user into request.user
 * - On failure: throws UnauthorizedException
 *
 * @example
 * ```typescript
 * // Applied globally, no need to use explicitly
 *
 * // To skip authentication on specific routes:
 * @Public()
 * @Post('login')
 * async login() { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determine if the route can be activated
   * @param context - Execution context
   * @returns boolean - true if allowed, false otherwise
   */
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If public, skip JWT authentication
    if (isPublic) {
      return true;
    }

    // Otherwise, delegate to Passport JWT strategy
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   * @param err - Error from Passport strategy
   * @param user - User object (if authentication succeeded)
   * @returns user or throws exception
   */
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, throw UnauthorizedException
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }

    return user;
  }
}
