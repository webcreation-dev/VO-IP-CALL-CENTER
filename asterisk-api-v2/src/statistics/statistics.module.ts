import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Cdr } from '../cdr/entities/cdr.entity';
import { Queue } from '../queues/entities/queue.entity';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { Recording } from '../recordings/entities/recording.entity';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { AriModule } from '../core/asterisk/ari/ari.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cdr, Queue, PsEndpoint, Recording]),
    AmiModule,
    AriModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
