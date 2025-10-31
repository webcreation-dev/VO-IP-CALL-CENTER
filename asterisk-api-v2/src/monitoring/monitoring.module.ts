import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { AriModule } from '../core/asterisk/ari/ari.module';
import { Queue } from '../queues/entities/queue.entity';
import { QueueMember } from '../queue-members/entities/queue-member.entity';
import { Cdr } from '../cdr/entities/cdr.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue, QueueMember, Cdr]),
    AmiModule,
    AriModule,
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGateway],
  exports: [MonitoringService, MonitoringGateway],
})
export class MonitoringModule {}
