import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SipTrunkRegistration } from './interfaces/registration.interface';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { SipTrunk } from './entities/sip-trunk.entity';

const execPromise = promisify(exec);

/**
 * Service to manage pjsip_wizard.conf file
 * Handles parsing, writing, and atomic updates
 */
@Injectable()
export class ConfigFileService {
  private readonly logger = new Logger(ConfigFileService.name);
  private readonly configPath: string;
  private readonly wizardFile: string;
  private fileLock = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SipTrunk)
    private readonly sipTrunkRepository: Repository<SipTrunk>,
  ) {
    this.configPath =
      this.configService.get<string>('ASTERISK_CONFIG_PATH') || '/etc/asterisk';
    this.wizardFile = path.join(this.configPath, 'pjsip_wizard.conf');
  }

  /**
   * Acquire lock for file operations
   */
  private async acquireLock(): Promise<void> {
    const maxWait = 5000; // 5 seconds
    const startTime = Date.now();

    while (this.fileLock) {
      if (Date.now() - startTime > maxWait) {
        throw new InternalServerErrorException('Could not acquire file lock');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.fileLock = true;
  }

  /**
   * Release file lock
   */
  private releaseLock(): void {
    this.fileLock = false;
  }

  /**
   * Read the pjsip_wizard.conf file from Docker container
   */
  async readConfigFile(): Promise<string> {
    try {
      const tempPath = `/tmp/pjsip_wizard_read_${Date.now()}.conf`;

      // Copy from Docker container to temp file
      await execPromise(`docker cp asterisk:${this.wizardFile} ${tempPath}`);
      const content = await fs.readFile(tempPath, 'utf-8');
      await fs.unlink(tempPath);

      return content;
    } catch (error) {
      if (error.message?.includes('No such file or directory') || error.code === 'ENOENT') {
        this.logger.warn(`Config file not found at ${this.wizardFile}, creating empty file`);

        // Create empty file in Docker container
        const tempPath = `/tmp/pjsip_wizard_init_${Date.now()}.conf`;
        await fs.writeFile(tempPath, '', 'utf-8');
        await execPromise(`docker cp ${tempPath} asterisk:${this.wizardFile}`);
        await fs.unlink(tempPath);

        return '';
      }
      throw new InternalServerErrorException(
        `Failed to read config file: ${error.message}`,
      );
    }
  }

  /**
   * Parse pjsip_wizard.conf into structured sections
   */
  parseWizardConfig(content: string): Map<string, SipTrunkRegistration> {
    const registrations = new Map<string, SipTrunkRegistration>();
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentConfig: Partial<SipTrunkRegistration> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) {
        continue;
      }

      // Section header: [section_name]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // Save previous section if it exists
        if (currentSection && currentConfig.type === 'wizard') {
          registrations.set(currentSection, currentConfig as SipTrunkRegistration);
        }

        // Start new section
        currentSection = trimmed.slice(1, -1);
        currentConfig = { id: currentSection };
        continue;
      }

      // Key-value pair: key = value
      const match = trimmed.match(/^(.+?)\s*=\s*(.+)$/);
      if (match && currentSection) {
        const [, key, value] = match;
        const k = key.trim();
        const v = value.trim();

        // Parse known keys
        switch (k) {
          case 'type':
            if (v === 'wizard') {
              currentConfig.type = 'wizard';
            }
            break;
          case 'sends_registrations':
            currentConfig.sends_registrations = v === 'yes';
            break;
          case 'sends_auth':
            currentConfig.sends_auth = v === 'yes';
            break;
          case 'remote_hosts':
            currentConfig.remote_hosts = v;
            break;
          case 'outbound_auth/username':
            if (!currentConfig.outbound_auth) {
              currentConfig.outbound_auth = { username: '', password: '' };
            }
            currentConfig.outbound_auth.username = v;
            break;
          case 'outbound_auth/password':
            if (!currentConfig.outbound_auth) {
              currentConfig.outbound_auth = { username: '', password: '' };
            }
            currentConfig.outbound_auth.password = v;
            break;
          case 'endpoint/transport':
            if (!currentConfig.endpoint) {
              currentConfig.endpoint = { transport: '', context: '' };
            }
            currentConfig.endpoint.transport = v;
            break;
          case 'endpoint/context':
            if (!currentConfig.endpoint) {
              currentConfig.endpoint = { transport: '', context: '' };
            }
            currentConfig.endpoint.context = v;
            break;
          case 'client_uri':
            currentConfig.client_uri = v;
            break;
          case 'server_uri':
            currentConfig.server_uri = v;
            break;
          case 'retry_interval':
            currentConfig.retry_interval = parseInt(v, 10);
            break;
          case 'expiration':
            currentConfig.expiration = parseInt(v, 10);
            break;
          case 'max_retries':
            currentConfig.max_retries = parseInt(v, 10);
            break;
          case 'forbidden_retry_interval':
            currentConfig.forbidden_retry_interval = parseInt(v, 10);
            break;
          case 'line':
            currentConfig.line = v === 'yes';
            break;
          case 'outbound_proxy':
            currentConfig.outbound_proxy = v;
            break;
          case 'support_path':
            currentConfig.support_path = v === 'yes';
            break;
        }
      }
    }

    // Save last section
    if (currentSection && currentConfig.type === 'wizard') {
      registrations.set(currentSection, currentConfig as SipTrunkRegistration);
    }

    this.logger.debug(`Parsed ${registrations.size} wizard sections from config file`);
    return registrations;
  }

  /**
   * Generate a wizard section string from registration data
   */
  generateWizardSection(registration: SipTrunkRegistration | CreateRegistrationDto): string {
    const lines: string[] = [];
    const id = 'name' in registration ? registration.name : registration.id;

    lines.push(`[${id}]`);
    lines.push('type = wizard');

    if ('sends_registrations' in registration) {
      lines.push(`sends_registrations = ${registration.sends_registrations ? 'yes' : 'no'}`);
    }

    if ('sends_auth' in registration) {
      lines.push(`sends_auth = ${registration.sends_auth ? 'yes' : 'no'}`);
    }

    if ('remote_host' in registration) {
      lines.push(`remote_hosts = ${registration.remote_host}`);
    } else if ('remote_hosts' in registration) {
      lines.push(`remote_hosts = ${registration.remote_hosts}`);
    }

    const auth = 'outbound_auth' in registration ? registration.outbound_auth : null;
    if (auth || ('username' in registration && 'password' in registration)) {
      const username = auth?.username || ('username' in registration ? registration.username : '');
      const password = auth?.password || ('password' in registration ? registration.password : '');
      lines.push(`outbound_auth/username = ${username}`);
      lines.push(`outbound_auth/password = ${password}`);
    }

    const endpoint = 'endpoint' in registration ? registration.endpoint : null;
    if (endpoint || ('transport' in registration && 'context' in registration)) {
      const transport = endpoint?.transport || ('transport' in registration ? registration.transport : '');
      const context = endpoint?.context || ('context' in registration ? registration.context : '');
      lines.push(`endpoint/transport = ${transport}`);
      lines.push(`endpoint/context = ${context}`);
    }

    if ('client_uri' in registration && registration.client_uri) {
      lines.push(`client_uri = ${registration.client_uri}`);
    }

    if ('server_uri' in registration && registration.server_uri) {
      lines.push(`server_uri = ${registration.server_uri}`);
    }

    if ('retry_interval' in registration && registration.retry_interval !== undefined) {
      lines.push(`retry_interval = ${registration.retry_interval}`);
    }

    if ('expiration' in registration && registration.expiration !== undefined) {
      lines.push(`expiration = ${registration.expiration}`);
    }

    if ('max_retries' in registration && registration.max_retries !== undefined) {
      lines.push(`max_retries = ${registration.max_retries}`);
    }

    if ('forbidden_retry_interval' in registration && registration.forbidden_retry_interval !== undefined) {
      lines.push(`forbidden_retry_interval = ${registration.forbidden_retry_interval}`);
    }

    if ('line' in registration && registration.line !== undefined) {
      lines.push(`line = ${registration.line ? 'yes' : 'no'}`);
    }

    if ('outbound_proxy' in registration && registration.outbound_proxy) {
      lines.push(`outbound_proxy = ${registration.outbound_proxy}`);
    }

    if ('support_path' in registration && registration.support_path !== undefined) {
      lines.push(`support_path = ${registration.support_path ? 'yes' : 'no'}`);
    }

    return lines.join('\n');
  }

  /**
   * Write registrations map back to config file in Docker container
   */
  async writeConfigFile(registrations: Map<string, SipTrunkRegistration>): Promise<void> {
    try {
      await this.acquireLock();

      // Create backup
      await this.backupConfig();

      // Generate content
      const sections: string[] = [];
      for (const registration of registrations.values()) {
        sections.push(this.generateWizardSection(registration));
      }

      const content = sections.join('\n\n') + '\n';

      // Write to local temp file
      const tempFile = `/tmp/pjsip_wizard_${Date.now()}.conf`;
      await fs.writeFile(tempFile, content, 'utf-8');

      // Copy to Docker container
      await execPromise(`docker cp ${tempFile} asterisk:${this.wizardFile}`);

      // Cleanup temp file
      await fs.unlink(tempFile);

      this.logger.log(`Successfully wrote ${registrations.size} registrations to config file`);
    } catch (error) {
      this.logger.error(`Failed to write config file: ${error.message}`);
      throw new InternalServerErrorException(`Failed to write config file: ${error.message}`);
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Create a backup of the current config file in Docker container
   */
  async backupConfig(): Promise<void> {
    try {
      const backupFile = `${this.wizardFile}.backup`;

      // Create backup inside Docker container
      await execPromise(
        `docker exec asterisk cp ${this.wizardFile} ${backupFile} 2>/dev/null || true`,
      );

      this.logger.debug(`Created backup at ${backupFile}`);
    } catch (error) {
      this.logger.warn(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Get all registrations from config file
   */
  async getAllRegistrations(): Promise<Map<string, SipTrunkRegistration>> {
    const content = await this.readConfigFile();
    return this.parseWizardConfig(content);
  }

  /**
   * Get a single registration by ID
   */
  async getRegistration(id: string): Promise<SipTrunkRegistration | null> {
    const registrations = await this.getAllRegistrations();
    return registrations.get(id) || null;
  }

  /**
   * Check if a registration exists
   */
  async registrationExists(id: string): Promise<boolean> {
    const registrations = await this.getAllRegistrations();
    return registrations.has(id);
  }

  /**
   * Add a new registration
   */
  async addRegistration(dto: CreateRegistrationDto): Promise<SipTrunkRegistration> {
    const registrations = await this.getAllRegistrations();

    if (registrations.has(dto.name)) {
      throw new InternalServerErrorException(`Registration ${dto.name} already exists`);
    }

    const registration: SipTrunkRegistration = {
      id: dto.name,
      type: 'wizard',
      sends_registrations: dto.sends_registrations ?? true,
      sends_auth: dto.sends_auth ?? true,
      remote_hosts: dto.remote_host,
      outbound_auth: {
        username: dto.username,
        password: dto.password,
      },
      endpoint: {
        transport: dto.transport,
        context: dto.context,
      },
      client_uri: dto.client_uri,
      server_uri: dto.server_uri,
      retry_interval: dto.retry_interval,
      expiration: dto.expiration,
      max_retries: dto.max_retries,
      forbidden_retry_interval: dto.forbidden_retry_interval,
      line: dto.line,
      outbound_proxy: dto.outbound_proxy,
      support_path: dto.support_path,
    };

    registrations.set(dto.name, registration);
    await this.writeConfigFile(registrations);

    return registration;
  }

  /**
   * Update an existing registration
   */
  async updateRegistration(
    id: string,
    updates: Partial<CreateRegistrationDto>,
  ): Promise<SipTrunkRegistration> {
    const registrations = await this.getAllRegistrations();
    const existing = registrations.get(id);

    if (!existing) {
      throw new InternalServerErrorException(`Registration ${id} not found`);
    }

    // Apply updates
    if (updates.remote_host !== undefined) {
      existing.remote_hosts = updates.remote_host;
    }
    if (updates.username !== undefined || updates.password !== undefined) {
      existing.outbound_auth = {
        username: updates.username ?? existing.outbound_auth.username,
        password: updates.password ?? existing.outbound_auth.password,
      };
    }
    if (updates.transport !== undefined || updates.context !== undefined) {
      existing.endpoint = {
        transport: updates.transport ?? existing.endpoint.transport,
        context: updates.context ?? existing.endpoint.context,
      };
    }
    if (updates.sends_registrations !== undefined) {
      existing.sends_registrations = updates.sends_registrations;
    }
    if (updates.sends_auth !== undefined) {
      existing.sends_auth = updates.sends_auth;
    }
    if (updates.client_uri !== undefined) {
      existing.client_uri = updates.client_uri;
    }
    if (updates.server_uri !== undefined) {
      existing.server_uri = updates.server_uri;
    }
    if (updates.retry_interval !== undefined) {
      existing.retry_interval = updates.retry_interval;
    }
    if (updates.expiration !== undefined) {
      existing.expiration = updates.expiration;
    }
    if (updates.max_retries !== undefined) {
      existing.max_retries = updates.max_retries;
    }
    if (updates.forbidden_retry_interval !== undefined) {
      existing.forbidden_retry_interval = updates.forbidden_retry_interval;
    }
    if (updates.line !== undefined) {
      existing.line = updates.line;
    }
    if (updates.outbound_proxy !== undefined) {
      existing.outbound_proxy = updates.outbound_proxy;
    }
    if (updates.support_path !== undefined) {
      existing.support_path = updates.support_path;
    }

    registrations.set(id, existing);
    await this.writeConfigFile(registrations);

    return existing;
  }

  /**
   * Delete a registration
   */
  async deleteRegistration(id: string): Promise<void> {
    const registrations = await this.getAllRegistrations();

    if (!registrations.has(id)) {
      throw new InternalServerErrorException(`Registration ${id} not found`);
    }

    registrations.delete(id);
    await this.writeConfigFile(registrations);

    this.logger.log(`Deleted registration ${id}`);
  }

  /**
   * Generate pjsip_wizard.conf from database
   * Reads all enabled SIP trunks from the database and writes them to the config file
   */
  async generateFromDatabase(): Promise<void> {
    await this.acquireLock();

    try {
      // Get all enabled trunks from database
      const trunks = await this.sipTrunkRepository.find({
        where: { enabled: true },
        order: { tenantId: 'ASC', name: 'ASC' },
      });

      if (trunks.length === 0) {
        this.logger.warn('No enabled SIP trunks found in database');
        // Write empty file with header
        const content = this.generateFileHeader();
        await this.writeFile(content);
        return;
      }

      // Generate config content
      let content = this.generateFileHeader();

      for (const trunk of trunks) {
        content += this.generateTrunkSection(trunk);
      }

      // Write to file
      await this.writeFile(content);

      this.logger.log(`Generated pjsip_wizard.conf from database with ${trunks.length} trunk(s)`);
    } catch (error) {
      this.logger.error(`Failed to generate config from database: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to generate pjsip_wizard.conf: ${error.message}`,
      );
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Generate file header
   */
  private generateFileHeader(): string {
    return `; =====================================================
; SIP Trunks Configuration (Generated from Database)
; Auto-generated by Asterisk API
; DO NOT EDIT THIS FILE MANUALLY
; =====================================================

`;
  }

  /**
   * Generate config section for a SIP trunk
   */
  private generateTrunkSection(trunk: SipTrunk): string {
    let section = `; ${trunk.displayName || trunk.name}`;
    if (trunk.description) {
      section += `\n; ${trunk.description}`;
    }
    section += `\n; Tenant ID: ${trunk.tenantId}\n\n`;

    section += `[${trunk.name}]\n`;
    section += `type = wizard\n`;
    section += `sends_registrations = ${trunk.sendsRegistrations ? 'yes' : 'no'}\n`;
    section += `sends_auth = ${trunk.sendsAuth ? 'yes' : 'no'}\n`;
    section += `accepts_registrations = no\n`;
    section += `remote_hosts = ${trunk.remoteHost}\n`;
    section += `outbound_auth/username = ${trunk.username}\n`;
    section += `outbound_auth/password = ${trunk.password}\n`;
    section += `endpoint/transport = ${trunk.transport}\n`;
    section += `endpoint/context = ${trunk.context}\n`;
    section += `endpoint/disallow = all\n`;
    section += `endpoint/allow = alaw\n`;
    section += `endpoint/allow = ulaw\n`;
    section += `endpoint/from_user = ${trunk.username}\n`;
    section += `endpoint/direct_media = no\n`;
    section += `aor/qualify_frequency = 60\n`;

    if (trunk.clientUri) {
      section += `registration/client_uri = ${trunk.clientUri}\n`;
    }

    if (trunk.serverUri) {
      section += `registration/server_uri = ${trunk.serverUri}\n`;
    }

    if (trunk.outboundProxy) {
      section += `registration/outbound_proxy = ${trunk.outboundProxy}\n`;
    }

    section += `registration/retry_interval = ${trunk.retryInterval}\n`;
    section += `registration/expiration = ${trunk.expiration}\n`;
    section += `registration/max_retries = ${trunk.maxRetries}\n`;

    if (trunk.forbiddenRetryInterval > 0) {
      section += `registration/forbidden_retry_interval = ${trunk.forbiddenRetryInterval}\n`;
    }

    if (trunk.line) {
      section += `registration/line = yes\n`;
    }

    if (trunk.supportPath) {
      section += `registration/support_path = yes\n`;
    }

    section += `\n`;
    return section;
  }

  /**
   * Write content directly to file
   */
  private async writeFile(content: string): Promise<void> {
    // Write to local temp file
    const tempFile = `/tmp/pjsip_wizard_write_${Date.now()}.conf`;

    try {
      await fs.writeFile(tempFile, content, 'utf-8');

      // Copy to Docker container
      await execPromise(`docker cp ${tempFile} asterisk:${this.wizardFile}`);

      // Cleanup temp file
      await fs.unlink(tempFile);
    } catch (error) {
      try {
        await fs.unlink(tempFile);
      } catch {}
      throw error;
    }
  }
}
