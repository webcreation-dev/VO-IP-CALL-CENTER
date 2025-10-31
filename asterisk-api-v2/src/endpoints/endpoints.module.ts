import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';

import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { PsAor } from './entities/ps-aor.entity';

import { AmiModule } from '../core/asterisk/ami/ami.module';
import { CacheModule } from '../core/cache/cache.module';
import { TenantsModule } from '../tenants/tenants.module';

/**
 * Endpoints Module
 *
 * Provides PJSIP endpoint management functionality
 *
 * Imports:
 * - TypeOrmModule: PsEndpoint, PsAuth, PsAor entities for database operations
 * - AmiModule: AMI service for Asterisk integration (status, reload)
 * - CacheModule: Cache service for performance optimization
 * - TenantsModule: Tenants service for limit validation
 *
 * Providers:
 * - EndpointsService: Endpoint management business logic with transactions
 *
 * Controllers:
 * - EndpointsController: Endpoint management endpoints
 *
 * Exports:
 * - EndpointsService: Available for other modules (e.g., Queue Members)
 */
@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([PsEndpoint, PsAuth, PsAor]),

    // External modules
    AmiModule,
    CacheModule,
    TenantsModule, // For tenant limits validation
  ],
  controllers: [EndpointsController],
  providers: [EndpointsService],
  exports: [EndpointsService], // Export for use in other modules
})
export class EndpointsModule {}
