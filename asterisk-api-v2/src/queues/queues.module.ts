import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { Queue } from './entities/queue.entity';
import { Extension } from '../core/database/entities/extension.entity';
import { Tenant } from '../core/database/entities/tenant.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { CacheModule } from '../core/cache/cache.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue, Extension, Tenant, TenantContext]),
    AmiModule,
    CacheModule,
    forwardRef(() => TenantsModule),
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
