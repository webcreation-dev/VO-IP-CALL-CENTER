import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AppUser } from '../core/database/entities/app-user.entity';

/**
 * Auth Module
 *
 * Provides authentication functionality
 *
 * Imports:
 * - TypeOrmModule: AppUser entity for user operations
 * - PassportModule: Passport integration for JWT strategy
 * - JwtModule: JWT token generation and validation
 * - ConfigModule: Access to JWT configuration
 *
 * Providers:
 * - AuthService: Authentication business logic
 * - JwtStrategy: JWT validation strategy
 *
 * Controllers:
 * - AuthController: Authentication endpoints
 *
 * Exports:
 * - AuthService: Available for other modules
 * - JwtStrategy: Used by guards
 */
@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([AppUser]),

    // Passport module
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    // JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('jwt.expiresIn') || '24h';
        return {
          secret: configService.get<string>('jwt.secret') || 'default-secret',
          signOptions: {
            expiresIn: expiresIn as any, // Type assertion needed for string literal
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
