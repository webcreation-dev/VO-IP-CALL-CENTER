import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsteriskController } from './asterisk.controller';
import { AsteriskService } from './asterisk.service';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([PsEndpoint]),
    AmiModule,
  ],
  controllers: [AsteriskController],
  providers: [AsteriskService],
  exports: [AsteriskService],
})
export class AsteriskModule {}
