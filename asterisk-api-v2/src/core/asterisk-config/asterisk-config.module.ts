import { Module } from '@nestjs/common';
import { AsteriskConfigService } from './asterisk-config.service';

@Module({
  providers: [AsteriskConfigService],
  exports: [AsteriskConfigService],
})
export class AsteriskConfigModule {}
