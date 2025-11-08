import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoundFile, SoundFileCategory } from './entities/sound-file.entity';
import { UploadSoundDto } from './dto/upload-sound.dto';
import { SoundFileQueryDto } from './dto/sound-file-query.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class SoundsService {
  private readonly logger = new Logger(SoundsService.name);
  private readonly baseAsteriskSoundsPath = '/var/lib/asterisk/sounds/custom';
  private readonly allowedFormats = ['wav', 'mp3', 'gsm', 'ogg', 'ulaw', 'alaw'];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    @InjectRepository(SoundFile)
    private readonly soundFileRepository: Repository<SoundFile>,
  ) {}

  /**
   * Upload a sound file
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadSoundDto,
    tenantId: number,
  ): Promise<SoundFile> {
    // Validate file
    this.validateFile(file);

    try {
      // Create tenant directory structure if it doesn't exist
      await this.ensureTenantDirectories(tenantId);

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueFilename = `${timestamp}_${this.sanitizeFilename(baseName)}${ext}`;

      // Determine target directory based on category
      const category = dto.category || SoundFileCategory.OTHER;
      const categoryDir = this.getCategoryDirectory(category);
      const tenantDir = path.join(this.baseAsteriskSoundsPath, `t${tenantId}`, categoryDir);
      const filepath = path.join(tenantDir, uniqueFilename);

      // Write file to temp location on host first
      const tempPath = `/tmp/sound_${timestamp}_${this.sanitizeFilename(baseName)}${ext}`;
      await fs.writeFile(tempPath, file.buffer);
      this.logger.log(`Wrote file to temp: ${tempPath}`);

      // Copy file to Docker container
      await execPromise(`docker cp ${tempPath} asterisk:${filepath}`);
      this.logger.log(`Copied file to container: ${filepath}`);

      // Cleanup temp file
      await fs.unlink(tempPath);

      // Get audio file duration (if possible)
      const duration = await this.getAudioDuration(filepath);

      // Create database record
      const soundFile = this.soundFileRepository.create({
        tenantId,
        name: dto.name || baseName,
        filename: uniqueFilename,
        filepath,
        format: ext.substring(1).toLowerCase(),
        duration,
        filesize: file.size,
        category,
        description: dto.description || null,
        originalName: file.originalname,
      });

      const saved = await this.soundFileRepository.save(soundFile);
      this.logger.log(`Created sound file record: ${saved.id} for tenant ${tenantId}`);

      // Convert to Asterisk-friendly formats if needed
      await this.convertToAsteriskFormats(filepath, ext.substring(1).toLowerCase());

      return saved;
    } catch (error) {
      this.logger.error(`Failed to upload sound file: ${error.message}`);
      throw new InternalServerErrorException(`Failed to upload sound file: ${error.message}`);
    }
  }

  /**
   * Get all sound files (with pagination and filtering)
   */
  async findAll(query: SoundFileQueryDto, tenantId?: number): Promise<{ data: SoundFile[]; total: number; page: number; limit: number }> {
    const { category, page = 1, limit = 20 } = query;

    const queryBuilder = this.soundFileRepository.createQueryBuilder('sound');

    // Filter by tenant if provided
    if (tenantId) {
      queryBuilder.where('sound.tenantId = :tenantId', { tenantId });
    }

    // Filter by category if provided
    if (category) {
      queryBuilder.andWhere('sound.category = :category', { category });
    }

    // Order by creation date (newest first)
    queryBuilder.orderBy('sound.createdAt', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single sound file by ID
   */
  async findOne(id: number, tenantId?: number): Promise<SoundFile> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const soundFile = await this.soundFileRepository.findOne({ where });

    if (!soundFile) {
      throw new NotFoundException(`Sound file with ID ${id} not found`);
    }

    // Check if file still exists in Docker container
    try {
      await execPromise(`docker exec asterisk test -f ${soundFile.filepath}`);
    } catch (error) {
      this.logger.warn(`Sound file ${id} exists in DB but not in container: ${soundFile.filepath}`);
    }

    return soundFile;
  }

  /**
   * Delete a sound file
   */
  async remove(id: number, tenantId?: number): Promise<void> {
    const soundFile = await this.findOne(id, tenantId);

    try {
      // Delete file from Docker container
      try {
        await execPromise(`docker exec asterisk rm -f ${soundFile.filepath}`);
        this.logger.log(`Deleted file from container: ${soundFile.filepath}`);

        // Also delete converted formats
        await this.deleteConvertedFormats(soundFile.filepath, soundFile.format);
      } catch (error) {
        this.logger.warn(`File may not exist in container: ${soundFile.filepath}`);
      }

      // Delete database record
      await this.soundFileRepository.remove(soundFile);
      this.logger.log(`Deleted sound file record: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete sound file: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete sound file: ${error.message}`);
    }
  }

  /**
   * Get file buffer for download
   */
  async getFileBuffer(id: number, tenantId?: number): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    const soundFile = await this.findOne(id, tenantId);

    try {
      // Copy file from Docker container to temp location
      const tempPath = `/tmp/download_${Date.now()}_${soundFile.filename}`;
      await execPromise(`docker cp asterisk:${soundFile.filepath} ${tempPath}`);

      // Read file buffer
      const buffer = await fs.readFile(tempPath);

      // Cleanup temp file
      await fs.unlink(tempPath);

      const mimetype = this.getMimeType(soundFile.format);

      return {
        buffer,
        filename: soundFile.originalName,
        mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`);
      throw new NotFoundException(`File not found in container: ${soundFile.filepath}`);
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    const ext = path.extname(file.originalname).substring(1).toLowerCase();
    if (!this.allowedFormats.includes(ext)) {
      throw new BadRequestException(`File format '${ext}' not allowed. Allowed formats: ${this.allowedFormats.join(', ')}`);
    }
  }

  /**
   * Ensure tenant directory structure exists
   */
  private async ensureTenantDirectories(tenantId: number): Promise<void> {
    try {
      // Create directory structure inside Docker container
      const tenantPath = `/var/lib/asterisk/sounds/custom/t${tenantId}`;
      await execPromise(`docker exec asterisk mkdir -p ${tenantPath}/{moh,announcements,greetings,prompts,other}`);
      this.logger.log(`Created directory structure for tenant ${tenantId} in Docker container`);
    } catch (error) {
      this.logger.error(`Failed to create tenant directories: ${error.message}`);
      throw new InternalServerErrorException('Failed to create tenant directory structure');
    }
  }

  /**
   * Get category subdirectory name
   */
  private getCategoryDirectory(category: SoundFileCategory): string {
    const map: Record<SoundFileCategory, string> = {
      [SoundFileCategory.MOH]: 'moh',
      [SoundFileCategory.ANNOUNCEMENT]: 'announcements',
      [SoundFileCategory.GREETING]: 'greetings',
      [SoundFileCategory.PROMPT]: 'prompts',
      [SoundFileCategory.OTHER]: 'other',
    };
    return map[category];
  }

  /**
   * Sanitize filename to remove dangerous characters
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Get audio file duration using ffprobe (if available)
   */
  private async getAudioDuration(filepath: string): Promise<number | null> {
    try {
      // Run ffprobe inside Docker container
      const { stdout } = await execPromise(
        `docker exec asterisk ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`,
      );
      const duration = parseFloat(stdout.trim());
      return isNaN(duration) ? null : duration;
    } catch (error) {
      this.logger.warn(`Could not get audio duration: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert audio file to Asterisk-friendly formats (gsm, ulaw)
   */
  private async convertToAsteriskFormats(filepath: string, originalFormat: string): Promise<void> {
    // Skip if already in Asterisk format
    if (['gsm', 'ulaw', 'alaw'].includes(originalFormat)) {
      return;
    }

    const baseFilepath = filepath.substring(0, filepath.lastIndexOf('.'));

    // Convert to GSM (commonly used by Asterisk) - run inside Docker container
    try {
      const gsmPath = `${baseFilepath}.gsm`;
      await execPromise(
        `docker exec asterisk ffmpeg -i "${filepath}" -ar 8000 -ac 1 -y "${gsmPath}"`,
      );
      this.logger.log(`Converted to GSM: ${gsmPath}`);
    } catch (error) {
      this.logger.warn(`Could not convert to GSM: ${error.message}`);
    }

    // Convert to ulaw (also common) - run inside Docker container
    try {
      const ulawPath = `${baseFilepath}.ulaw`;
      await execPromise(
        `docker exec asterisk ffmpeg -i "${filepath}" -ar 8000 -ac 1 -f mulaw -y "${ulawPath}"`,
      );
      this.logger.log(`Converted to ulaw: ${ulawPath}`);
    } catch (error) {
      this.logger.warn(`Could not convert to ulaw: ${error.message}`);
    }
  }

  /**
   * Delete converted format files
   */
  private async deleteConvertedFormats(filepath: string, originalFormat: string): Promise<void> {
    if (['gsm', 'ulaw', 'alaw'].includes(originalFormat)) {
      return;
    }

    const baseFilepath = filepath.substring(0, filepath.lastIndexOf('.'));
    const formats = ['gsm', 'ulaw', 'alaw'];

    for (const format of formats) {
      const convertedPath = `${baseFilepath}.${format}`;
      try {
        // Delete file inside Docker container
        await execPromise(`docker exec asterisk rm -f ${convertedPath}`);
        this.logger.log(`Deleted converted file: ${convertedPath}`);
      } catch (error) {
        this.logger.warn(`Could not delete converted file: ${error.message}`);
      }
    }
  }

  /**
   * Get MIME type for file format
   */
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      gsm: 'audio/gsm',
      ulaw: 'audio/basic',
      alaw: 'audio/basic',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}
