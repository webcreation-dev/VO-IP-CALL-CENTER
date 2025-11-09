import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    Res,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import type { Response } from 'express';
  import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
  import { IvrAudioService } from '../services/ivr-audio.service';

@ApiTags('IVR Audio')
@ApiBearerAuth()
@Controller('ivr/audio')
export class IvrAudioController {
  constructor(private audioService: IvrAudioService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @Query('tenantId') tenantId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { name: string; language?: string },
  ) {
    return this.audioService.uploadAudioFile(tenantId, file, dto);
  }

  @Get()
  async findAll(@Query('tenantId') tenantId: number, @Query('language') language?: string) {
    return this.audioService.findAllAudioFiles(tenantId, language);
  }

  @Get(':id')
  async findOne(@Query('tenantId') tenantId: number, @Param('id') id: string) {
    return this.audioService.findAudioFileById(Number(id), tenantId);
  }

  @Get(':id/download')
  async download(
    @Query('tenantId') tenantId: number,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.audioService.findAudioFileById(Number(id), tenantId);
    res.download(file.filepath, file.filename);
  }

  @Delete(':id')
  async remove(@Query('tenantId') tenantId: number, @Param('id') id: string) {
    return this.audioService.removeAudioFile(Number(id), tenantId);
  }

  // Convertir un fichier dans un format compatible Asterisk
  @Post(':id/convert')
  async convert(
    @Query('tenantId') tenantId: number,
    @Param('id') id: string,
    @Body() dto: { targetFormat: 'wav' | 'gsm' | 'sln16' },
  ) {
    return this.audioService.convertAudioFile(Number(id), tenantId, dto.targetFormat);
  }

  // Générer un audio via TTS
  @Post('generate-tts')
  async generateTts(
    @Query('tenantId') tenantId: number,
    @Body() dto: { text: string; language: string; voice?: string; name: string },
  ) {
    return this.audioService.generateTtsAudio(tenantId, dto);
  }
}