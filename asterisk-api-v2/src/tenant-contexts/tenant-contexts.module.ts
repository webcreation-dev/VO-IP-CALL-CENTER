import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { TenantContextsService } from './tenant-contexts.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantContext])],
  providers: [TenantContextsService],
  exports: [TenantContextsService],
})
export class TenantContextsModule {}
