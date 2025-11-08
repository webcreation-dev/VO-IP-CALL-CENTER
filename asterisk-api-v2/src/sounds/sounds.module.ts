import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundsController } from './sounds.controller';
import { SoundsService } from './sounds.service';
import { MohController } from './moh.controller';
import { MohService } from './moh.service';
import { SoundFile } from './entities/sound-file.entity';
import { MohClass } from './entities/moh-class.entity';
import { AmiModule } from '../core/asterisk/ami/ami.module';

@Module({
  imports: [TypeOrmModule.forFeature([SoundFile, MohClass]), AmiModule],
  controllers: [SoundsController, MohController],
  providers: [SoundsService, MohService],
  exports: [SoundsService, MohService],
})
export class SoundsModule {}
