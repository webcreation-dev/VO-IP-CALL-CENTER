import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { ConfigFileService } from './config-file.service';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { SipTrunk } from './entities/sip-trunk.entity';
import { Queue } from '../queues/entities/queue.entity';
import { ExtensionsModule } from '../extensions/extensions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SipTrunk, Queue]),
    AmiModule,
    forwardRef(() => ExtensionsModule),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, ConfigFileService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
