import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DirectoryService } from './services/directory.service';
import { DirectoryAriGateway } from './gateways/directory-ari.gateway';

import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { Extension } from '../core/database/entities/extension.entity';

import { AriModule } from '../core/asterisk/ari/ari.module';
import { ExtensionsModule } from '../extensions/extensions.module';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { AsteriskConfigModule } from '../core/asterisk-config/asterisk-config.module';

/**
 * Directory App Module
 *
 * Provides a directory IVR application that allows callers to:
 * - List available endpoints in their context
 * - Select an endpoint by pressing a digit (1-9)
 * - Connect to the selected endpoint
 *
 * Auto-creates *411 extension for all contexts on startup.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantContext, Extension]),
    AriModule,
    forwardRef(() => ExtensionsModule),
    forwardRef(() => EndpointsModule),
    AsteriskConfigModule,
  ],
  providers: [DirectoryService, DirectoryAriGateway],
  exports: [DirectoryService],
})
export class DirectoryAppModule {}
