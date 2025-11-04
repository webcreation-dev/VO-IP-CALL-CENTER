import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { Tenant } from '../core/database/entities/tenant.entity';
import { Extension } from '../core/database/entities/extension.entity';
import { CacheModule } from '../core/cache/cache.module';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { PsAuth } from '../endpoints/entities/ps-auth.entity';
import { PsAor } from '../endpoints/entities/ps-aor.entity';
import { Queue } from 'src/queues/entities/queue.entity';
import { Cdr } from 'src/cdr/entities/cdr.entity';
import { TenantContextsModule } from '../tenant-contexts/tenant-contexts.module';
import { EndpointsModule } from '../endpoints/endpoints.module';

/**
 * Tenants Module
 *
 * Provides tenant management functionality
 *
 * Imports:
 * - TypeOrmModule: Tenant entity for database operations
 * - CacheModule: Cache service for performance optimization
 * - TenantContextsModule: Manage multiple contexts per tenant
 *
 * Providers:
 * - TenantsService: Tenant management business logic
 *
 * Controllers:
 * - TenantsController: Tenant management endpoints
 *
 * Exports:
 * - TenantsService: Available for other modules (e.g., Endpoints, Queues)
 */
@Module({
  imports: [
    // TypeORM entities
    TypeOrmModule.forFeature([Tenant, Extension, PsEndpoint, PsAuth, PsAor, Queue, Cdr]),

    // External modules
    CacheModule,
    TenantContextsModule,

    // ForwardRef to avoid circular dependency with EndpointsModule
    forwardRef(() => EndpointsModule),
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService], // Export for use in other modules
})
export class TenantsModule {}
