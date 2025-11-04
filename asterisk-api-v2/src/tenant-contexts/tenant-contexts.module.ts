import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { TenantContextsService } from './tenant-contexts.service';
import { TenantContextsController } from './tenant-contexts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TenantContext])],
  controllers: [TenantContextsController],
  providers: [TenantContextsService],
  exports: [TenantContextsService],
})
export class TenantContextsModule {}
