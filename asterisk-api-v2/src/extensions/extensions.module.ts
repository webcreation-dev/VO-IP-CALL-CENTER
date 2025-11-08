import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ExtensionsController } from './extensions.controller';
import { ExtensionsService } from './extensions.service';
import { Extension } from '../core/database/entities/extension.entity';
import { Tenant } from '../core/database/entities/tenant.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { CacheModule } from '../core/cache/cache.module';

/**
 * Extensions Module
 *
 * Manages Asterisk dialplan extensions via Realtime
 *
 * Features:
 * - CRUD operations for extensions
 * - Multi-tenant isolation via context ownership
 * - Auto-priority calculation
 * - Pagination and filtering
 * - Cache integration
 *
 * Dependencies:
 * - TypeORM: Extension and Tenant entities
 * - CacheModule: Performance optimization
 *
 * Exports:
 * - ExtensionsService: Used by TenantService for default extension generation
 */
@Module({
  imports: [TypeOrmModule.forFeature([Extension, Tenant, TenantContext]), CacheModule],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}
