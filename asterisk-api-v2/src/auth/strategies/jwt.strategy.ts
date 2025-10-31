import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppUser } from '../../core/database/entities/app-user.entity';
import { UserPayload } from '../../common/interfaces/user-payload.interface';

/**
 * JWT Strategy
 *
 * Validates JWT tokens and injects user payload into request.user
 *
 * Flow:
 * 1. Extract JWT from Authorization header (Bearer token)
 * 2. Verify token signature using JWT_SECRET
 * 3. Extract payload (sub, email, role, tenantId)
 * 4. Validate user still exists in database
 * 5. Return UserPayload which gets injected into request.user
 *
 * This strategy is used by JwtAuthGuard (which is applied globally)
 *
 * @example
 * Request with header:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * After validation, request.user contains:
 * {
 *   sub: 5,
 *   email: "admin@example.com",
 *   role: "admin",
 *   tenantId: 1
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') || 'default-secret',
    });
  }

  /**
   * Validate JWT payload and return user data
   *
   * Called automatically by Passport after JWT verification
   * The returned value is injected into request.user
   *
   * @param payload - Decoded JWT payload
   * @returns UserPayload - User data to be injected into request
   * @throws UnauthorizedException if user no longer exists
   */
  async validate(payload: any): Promise<UserPayload> {
    // Verify user still exists in database
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Return payload that will be injected into request.user
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}
