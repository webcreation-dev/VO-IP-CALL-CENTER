import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { Recording } from './entities/recording.entity';
import { StartRecordingDto, RecordingFilterDto } from './dto';
import { AriService } from '../core/asterisk/ari/ari.service';

@Injectable()
export class RecordingsService {
  private readonly logger = new Logger(RecordingsService.name);
  private readonly recordingsPath: string;

  constructor(
    @InjectRepository(Recording)
    private readonly recordingRepository: Repository<Recording>,
    private readonly ariService: AriService,
    private readonly configService: ConfigService,
  ) {
    this.recordingsPath =
      this.configService.get<string>('RECORDINGS_PATH') ||
      '/var/spool/asterisk/monitor';
  }

  /**
   * Start recording a channel
   */
  async startRecording(
    tenantId: number,
    dto: StartRecordingDto,
  ): Promise<Recording> {
    const format = dto.format || 'wav';
    const recordingName = `${dto.name}.${format}`;
    const filePath = path.join(
      this.recordingsPath,
      `t${tenantId}`,
      recordingName,
    );

    try {
      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Start recording via ARI
      const liveRecording = await this.ariService.startRecording(
        dto.channelId,
        dto.name,
        format,
        dto.maxDurationSeconds || 0,
        dto.maxSilenceSeconds || 0,
      );

      // Get channel details for metadata
      const channel = await this.ariService.getChannel(dto.channelId);

      // Save recording metadata to database
      const recording = this.recordingRepository.create({
        tenantId,
        callId: channel.id,
        filename: recordingName,
        filePath,
        format,
        src: channel.caller?.number || '',
        dst: channel.connected?.number || '',
        recordedBy: 'system',
      });

      const saved = await this.recordingRepository.save(recording);
      this.logger.log(`Started recording ${recordingName} for channel ${dto.channelId}`);

      return saved;
    } catch (error: any) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      throw new BadRequestException(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop an active recording
   */
  async stopRecording(recordingName: string): Promise<void> {
    try {
      await this.ariService.stopRecording(recordingName);
      this.logger.log(`Stopped recording ${recordingName}`);
    } catch (error: any) {
      this.logger.error(`Failed to stop recording: ${error.message}`);
      throw new BadRequestException(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * List all recordings with filtering and pagination
   */
  async findAll(
    tenantId: number,
    filter: RecordingFilterDto,
  ): Promise<{ data: Recording[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.recordingRepository
      .createQueryBuilder('recording')
      .where('recording.tenantId = :tenantId', { tenantId })
      .andWhere('recording.isDeleted = :isDeleted', { isDeleted: false });

    // Apply filters
    if (filter.callId) {
      queryBuilder.andWhere('recording.callId = :callId', {
        callId: filter.callId,
      });
    }

    if (filter.src) {
      queryBuilder.andWhere('recording.src LIKE :src', {
        src: `%${filter.src}%`,
      });
    }

    if (filter.dst) {
      queryBuilder.andWhere('recording.dst LIKE :dst', {
        dst: `%${filter.dst}%`,
      });
    }

    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere(
        'recording.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: filter.startDate,
          endDate: filter.endDate,
        },
      );
    } else if (filter.startDate) {
      queryBuilder.andWhere('recording.createdAt >= :startDate', {
        startDate: filter.startDate,
      });
    } else if (filter.endDate) {
      queryBuilder.andWhere('recording.createdAt <= :endDate', {
        endDate: filter.endDate,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated data
    const data = await queryBuilder
      .orderBy('recording.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Update file sizes if missing
    for (const recording of data) {
      if (recording.fileSize === 0 && fs.existsSync(recording.filePath)) {
        const stats = fs.statSync(recording.filePath);
        recording.fileSize = stats.size;
        await this.recordingRepository.save(recording);
      }
    }

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single recording by ID
   */
  async findOne(tenantId: number, id: string): Promise<Recording> {
    const recording = await this.recordingRepository.findOne({
      where: { id, tenantId, isDeleted: false },
    });

    if (!recording) {
      throw new NotFoundException(`Recording ${id} not found`);
    }

    return recording;
  }

  /**
   * Get recording file stream
   */
  async getFileStream(tenantId: number, id: string): Promise<fs.ReadStream> {
    const recording = await this.findOne(tenantId, id);

    if (!fs.existsSync(recording.filePath)) {
      throw new NotFoundException(`Recording file not found`);
    }

    return fs.createReadStream(recording.filePath);
  }

  /**
   * Soft delete a recording
   */
  async deleteRecording(tenantId: number, id: string): Promise<void> {
    const recording = await this.findOne(tenantId, id);

    recording.isDeleted = true;
    await this.recordingRepository.save(recording);

    this.logger.log(`Soft deleted recording ${id}`);
  }

  /**
   * Permanently delete a recording file
   */
  async permanentlyDelete(tenantId: number, id: string): Promise<void> {
    const recording = await this.findOne(tenantId, id);

    // Delete physical file
    if (fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }

    // Delete database record
    await this.recordingRepository.remove(recording);

    this.logger.log(`Permanently deleted recording ${id}`);
  }
}
