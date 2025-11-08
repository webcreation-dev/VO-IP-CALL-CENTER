import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { TenantContextsService } from './tenant-contexts.service';
import { TenantContextsController } from './tenant-contexts.controller';
import { ExtensionsModule } from '../extensions/extensions.module';
import { AsteriskConfigModule } from '../core/asterisk-config/asterisk-config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantContext]),
    ExtensionsModule,
    AsteriskConfigModule,
  ],
  controllers: [TenantContextsController],
  providers: [TenantContextsService],
  exports: [TenantContextsService],
})
export class TenantContextsModule {}
