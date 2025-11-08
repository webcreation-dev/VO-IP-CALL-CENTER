import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { TenantContextsService } from './tenant-contexts.service';
import { TenantContextsController } from './tenant-contexts.controller';
import { ExtensionsModule } from '../extensions/extensions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantContext]),
    ExtensionsModule,
  ],
  controllers: [TenantContextsController],
  providers: [TenantContextsService],
  exports: [TenantContextsService],
})
export class TenantContextsModule {}
