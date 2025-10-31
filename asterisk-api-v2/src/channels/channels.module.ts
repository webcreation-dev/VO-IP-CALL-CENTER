import { Module } from '@nestjs/common';

import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { AriModule } from '../core/asterisk/ari/ari.module';

@Module({
  imports: [AriModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
