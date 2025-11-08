import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MohClass, MohMode } from './entities/moh-class.entity';
import { CreateMohClassDto } from './dto/create-moh-class.dto';
import { UpdateMohClassDto } from './dto/update-moh-class.dto';
import { AmiService } from '../core/asterisk/ami/ami.service';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class MohService {
  private readonly logger = new Logger(MohService.name);
  private readonly mohConfigPath = '/etc/asterisk/musiconhold.conf';
  private readonly mohConfigBackupPath = '/etc/asterisk/musiconhold.conf.backup';

  constructor(
    @InjectRepository(MohClass)
    private readonly mohClassRepository: Repository<MohClass>,
    private readonly amiService: AmiService,
  ) {}

  /**
   * Create a new Music on Hold class
   */
  async create(dto: CreateMohClassDto, tenantId: number): Promise<MohClass> {
    // Check if class already exists for this tenant
    const fullName = `t${tenantId}_${dto.name}`;
    const exists = await this.mohClassRepository.findOne({
      where: { tenantId, name: dto.name },
    });

    if (exists) {
      throw new ConflictException(`MoH class '${dto.name}' already exists for this tenant`);
    }

    try {
      // Validate based on mode
      this.validateMohClass(dto);

      // Create entity
      const mohClass = this.mohClassRepository.create({
        tenantId,
        name: dto.name,
        mode: dto.mode || MohMode.FILES,
        directory: dto.directory || null,
        application: dto.application || null,
        format: dto.format || 'wav',
        sort: dto.sort,
        description: dto.description || null,
        enabled: true,
      });

      // Save to database
      const saved = await this.mohClassRepository.save(mohClass);

      // Regenerate musiconhold.conf
      await this.generateMusicOnHoldConf();

      // Reload MoH module in Asterisk
      await this.reloadMoh();

      this.logger.log(`Created MoH class: ${dto.name} for tenant ${tenantId}`);
      return saved;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create MoH class: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create MoH class: ${error.message}`);
    }
  }

  /**
   * Get all MoH classes (optionally filtered by tenant)
   */
  async findAll(tenantId?: number): Promise<MohClass[]> {
    const where: any = { enabled: true };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const classes = await this.mohClassRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return classes;
  }

  /**
   * Get a single MoH class by name
   */
  async findOne(name: string, tenantId?: number): Promise<MohClass> {
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const mohClass = await this.mohClassRepository.findOne({ where });

    if (!mohClass) {
      throw new NotFoundException(`MoH class '${name}' not found`);
    }

    return mohClass;
  }

  /**
   * Update a MoH class
   */
  async update(name: string, dto: UpdateMohClassDto, tenantId?: number): Promise<MohClass> {
    // Find existing class
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const mohClass = await this.mohClassRepository.findOne({ where });

    if (!mohClass) {
      throw new NotFoundException(`MoH class '${name}' not found`);
    }

    try {
      // Update fields if provided
      if (dto.mode !== undefined) mohClass.mode = dto.mode;
      if (dto.directory !== undefined) mohClass.directory = dto.directory || null;
      if (dto.application !== undefined) mohClass.application = dto.application || null;
      if (dto.format !== undefined) mohClass.format = dto.format || null;
      if (dto.sort !== undefined) mohClass.sort = dto.sort;
      if (dto.description !== undefined) mohClass.description = dto.description || null;

      // Validate updated class
      this.validateMohClass(mohClass);

      // Save to database
      const updated = await this.mohClassRepository.save(mohClass);

      // Regenerate musiconhold.conf
      await this.generateMusicOnHoldConf();

      // Reload MoH module in Asterisk
      await this.reloadMoh();

      this.logger.log(`Updated MoH class: ${name}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update MoH class: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update MoH class: ${error.message}`);
    }
  }

  /**
   * Delete a MoH class
   */
  async remove(name: string, tenantId?: number): Promise<void> {
    // Find existing class
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const mohClass = await this.mohClassRepository.findOne({ where });

    if (!mohClass) {
      throw new NotFoundException(`MoH class '${name}' not found`);
    }

    try {
      // Delete from database
      await this.mohClassRepository.remove(mohClass);

      // Regenerate musiconhold.conf
      await this.generateMusicOnHoldConf();

      // Reload MoH module in Asterisk
      await this.reloadMoh();

      this.logger.log(`Deleted MoH class: ${name}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete MoH class: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete MoH class: ${error.message}`);
    }
  }

  /**
   * Validate MoH class configuration based on mode
   */
  private validateMohClass(mohClass: Partial<CreateMohClassDto | MohClass>): void {
    if (mohClass.mode === MohMode.FILES || mohClass.mode === MohMode.QUIETMP3) {
      if (!mohClass.directory) {
        throw new BadRequestException(`Directory is required for mode '${mohClass.mode}'`);
      }

      // Check if directory exists (optional, may not exist yet)
      if (existsSync(mohClass.directory)) {
        const stats = require('fs').statSync(mohClass.directory);
        if (!stats.isDirectory()) {
          throw new BadRequestException(`Path '${mohClass.directory}' is not a directory`);
        }
      } else {
        this.logger.warn(`Directory does not exist yet: ${mohClass.directory}`);
      }
    }

    if (mohClass.mode === MohMode.CUSTOM) {
      if (!mohClass.application) {
        throw new BadRequestException(`Application command is required for mode 'custom'`);
      }
    }
  }

  /**
   * Generate musiconhold.conf from database
   */
  async generateMusicOnHoldConf(): Promise<void> {
    try {
      // Get all enabled MoH classes
      const mohClasses = await this.mohClassRepository.find({
        where: { enabled: true },
        order: { tenantId: 'ASC', name: 'ASC' },
      });

      // Generate config content
      const configContent = this.generateConfigContent(mohClasses);

      // Write to temp file on host (not in Docker)
      const tempPath = `/tmp/musiconhold.conf.${Date.now()}`;
      await fs.writeFile(tempPath, configContent, 'utf8');

      // Copy to Docker container using docker cp
      await execPromise(`docker cp ${tempPath} asterisk:/etc/asterisk/musiconhold.conf`);

      // Cleanup temp file
      await fs.unlink(tempPath);

      this.logger.log('Generated musiconhold.conf successfully in Docker container');
    } catch (error) {
      this.logger.error(`Failed to generate musiconhold.conf: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate musiconhold.conf');
    }
  }

  /**
   * Generate the content for musiconhold.conf
   */
  private generateConfigContent(mohClasses: MohClass[]): string {
    const lines: string[] = [];

    // Header
    lines.push(';');
    lines.push('; =====================================================');
    lines.push('; Music on Hold Configuration (Generated from Database)');
    lines.push('; Auto-generated by Asterisk API');
    lines.push('; DO NOT EDIT THIS FILE MANUALLY');
    lines.push('; =====================================================');
    lines.push(';');
    lines.push('');

    // Default class (Asterisk built-in)
    lines.push('; Default Asterisk MoH class');
    lines.push('[default]');
    lines.push('mode=files');
    lines.push('directory=/var/lib/asterisk/moh');
    lines.push('sort=random');
    lines.push('');

    // Generate each MoH class
    for (const mohClass of mohClasses) {
      const fullName = `t${mohClass.tenantId}_${mohClass.name}`;

      lines.push(`;`);
      lines.push(`; ${fullName}`);
      if (mohClass.description) {
        lines.push(`; ${mohClass.description}`);
      }
      lines.push(`; Tenant ID: ${mohClass.tenantId}`);
      lines.push('');

      lines.push(`[${fullName}]`);
      lines.push(`mode=${mohClass.mode}`);

      if (mohClass.directory) {
        lines.push(`directory=${mohClass.directory}`);
      }

      if (mohClass.application) {
        lines.push(`application=${mohClass.application}`);
      }

      if (mohClass.format && (mohClass.mode === MohMode.FILES || mohClass.mode === MohMode.QUIETMP3)) {
        lines.push(`format=${mohClass.format}`);
      }

      if (mohClass.sort) {
        lines.push(`sort=${mohClass.sort}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reload Music on Hold module in Asterisk
   */
  async reloadMoh(): Promise<void> {
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        // Use module reload command instead of moh reload
        await this.amiService.executeCommand('module reload res_musiconhold.so');
        this.logger.log('Reloaded Music on Hold module');

        // Wait a bit for reload to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      } catch (error) {
        lastError = error;
        retries--;
        this.logger.warn(`Failed to reload MoH module (${3 - retries}/3): ${error.message}`);

        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // All retries failed
    this.logger.error(`Failed to reload MoH module after 3 attempts: ${lastError.message}`);
    throw new InternalServerErrorException('Failed to reload Asterisk MoH module');
  }

  /**
   * Get MoH classes available for a specific tenant
   */
  async getAvailableForTenant(tenantId: number): Promise<MohClass[]> {
    const mohClasses = await this.mohClassRepository.find({
      where: { tenantId, enabled: true },
      order: { name: 'ASC' },
    });

    return mohClasses;
  }
}
