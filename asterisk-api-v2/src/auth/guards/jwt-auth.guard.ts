import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * JWT Authentication Guard
 *
 * Validates JWT tokens on protected routes.
 * Uses Passport JWT strategy defined in jwt.strategy.ts
 *
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * async protectedRoute() { ... }
 *
 * Can be skipped with @Public() decorator
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Otherwise, validate JWT
    return super.canActivate(context);
  }
}
