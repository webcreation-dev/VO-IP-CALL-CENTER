import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueMembersController } from './queue-members.controller';
import { QueueMembersService } from './queue-members.service';
import { QueueMember } from './entities/queue-member.entity';
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { EndpointsModule } from '../endpoints/endpoints.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QueueMember]),
    AmiModule,
    EndpointsModule,
  ],
  controllers: [QueueMembersController],
  providers: [QueueMembersService],
  exports: [QueueMembersService],
})
export class QueueMembersModule {}
