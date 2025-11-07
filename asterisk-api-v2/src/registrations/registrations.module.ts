import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { ConfigFileService } from './config-file.service';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { SipTrunk } from './entities/sip-trunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SipTrunk]), AmiModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService, ConfigFileService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
