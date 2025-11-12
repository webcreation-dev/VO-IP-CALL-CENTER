import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { TenantContextsService } from './tenant-contexts.service';
import { TenantContextsController } from './tenant-contexts.controller';
import { ExtensionsModule } from '../extensions/extensions.module';
import { AsteriskConfigModule } from '../core/asterisk-config/asterisk-config.module';
import { TenantContextSubscriber } from './tenant-contexts.subscriber';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantContext]),
    ExtensionsModule,
    AsteriskConfigModule,
    forwardRef(() => RolesModule),
  ],
  controllers: [TenantContextsController],
  providers: [TenantContextsService, TenantContextSubscriber],
  exports: [TenantContextsService, TenantContextSubscriber],
})
export class TenantContextsModule {}
