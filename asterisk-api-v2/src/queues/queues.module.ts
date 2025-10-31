import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { Queue } from './entities/queue.entity';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { CacheModule } from '../core/cache/cache.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue]),
    AmiModule,
    CacheModule,
    TenantsModule,
  ],
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}
