import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CdrController } from './cdr.controller';
import { CdrService } from './cdr.service';
import { Cdr } from './entities/cdr.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cdr])],
  controllers: [CdrController],
  providers: [CdrService],
  exports: [CdrService],
})
export class CdrModule {}
