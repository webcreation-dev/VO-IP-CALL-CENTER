import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { Recording } from './entities/recording.entity';
import { AriModule } from '../core/asterisk/ari/ari.module';

@Module({
  imports: [TypeOrmModule.forFeature([Recording]), AriModule],
  controllers: [RecordingsController],
  providers: [RecordingsService],
  exports: [RecordingsService],
})
export class RecordingsModule {}
