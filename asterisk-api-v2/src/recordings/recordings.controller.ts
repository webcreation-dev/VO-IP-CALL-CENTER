import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { RecordingsService } from './recordings.service';
import { StartRecordingDto, RecordingFilterDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Recordings')
@ApiBearerAuth()
@Controller('recordings')
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  @Post('start')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Start recording a channel' })
  @ApiResponse({ status: 201, description: 'Recording started' })
  async startRecording(
    @CurrentTenant() tenantId: number,
    @Body() dto: StartRecordingDto,
  ) {
    return await this.recordingsService.startRecording(tenantId, dto);
  }

  @Post('stop/:recordingName')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Stop an active recording' })
  @ApiParam({ name: 'recordingName', example: 'call-recording-101' })
  @ApiResponse({ status: 200, description: 'Recording stopped' })
  async stopRecording(@Param('recordingName') recordingName: string) {
    await this.recordingsService.stopRecording(recordingName);
    return { message: 'Recording stopped successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'List all recordings' })
  @ApiResponse({ status: 200, description: 'Recordings retrieved' })
  async findAll(
    @CurrentTenant() tenantId: number,
    @Query() filter: RecordingFilterDto,
  ) {
    return await this.recordingsService.findAll(tenantId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recording details by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Recording details retrieved' })
  async findOne(
    @CurrentTenant() tenantId: number,
    @Param('id') id: number,
  ) {
    return await this.recordingsService.findOne(tenantId, id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download recording file' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Recording file downloaded' })
  async downloadRecording(
    @CurrentTenant() tenantId: number,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const recording = await this.recordingsService.findOne(tenantId, id);
    const fileStream = await this.recordingsService.getFileStream(tenantId, id);

    res.set({
      'Content-Type': `audio/${recording.format}`,
      'Content-Disposition': `attachment; filename="${recording.filename}"`,
    });

    return new StreamableFile(fileStream);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream recording file' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Recording file streaming' })
  async streamRecording(
    @CurrentTenant() tenantId: number,
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const recording = await this.recordingsService.findOne(tenantId, id);
    const fileStream = await this.recordingsService.getFileStream(tenantId, id);

    res.set({
      'Content-Type': `audio/${recording.format}`,
    });

    return new StreamableFile(fileStream);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a recording' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Recording deleted' })
  async deleteRecording(
    @CurrentTenant() tenantId: number,
    @Param('id') id: number,
  ) {
    await this.recordingsService.deleteRecording(tenantId, id);
  }

  @Delete(':id/permanent')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete recording file' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 204, description: 'Recording permanently deleted' })
  async permanentlyDelete(
    @CurrentTenant() tenantId: number,
    @Param('id') id: number,
  ) {
    await this.recordingsService.permanentlyDelete(tenantId, id);
  }
}
