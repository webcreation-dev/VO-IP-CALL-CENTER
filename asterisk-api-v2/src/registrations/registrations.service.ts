import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigFileService } from './config-file.service';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import {
  SipTrunkRegistration,
  RegistrationStatus,
  RegistrationWithStatus,
} from './interfaces/registration.interface';
import { RegistrationInfo } from '../core/asterisk/ami/ami.types';
import { SipTrunk } from './entities/sip-trunk.entity';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectRepository(SipTrunk)
    private readonly sipTrunkRepository: Repository<SipTrunk>,
    private readonly configFileService: ConfigFileService,
    private readonly amiService: AmiService,
  ) {}

  /**
   * Convert SipTrunk entity to SipTrunkRegistration interface
   */
  private entityToInterface(entity: SipTrunk): SipTrunkRegistration {
    return {
      id: entity.name,
      type: 'wizard',
      sends_registrations: entity.sendsRegistrations,
      sends_auth: entity.sendsAuth,
      remote_hosts: entity.remoteHost,
      outbound_auth: {
        username: entity.username,
        password: entity.password,
      },
      endpoint: {
        transport: entity.transport,
        context: entity.context,
      },
      expiration: entity.expiration,
      retry_interval: entity.retryInterval,
      max_retries: entity.maxRetries,
      client_uri: entity.clientUri ?? undefined,
      server_uri: entity.serverUri ?? undefined,
      forbidden_retry_interval: entity.forbiddenRetryInterval,
      line: entity.line,
      outbound_proxy: entity.outboundProxy ?? undefined,
      support_path: entity.supportPath,
    };
  }

  /**
   * Parse AMI RegistrationInfo to RegistrationStatus
   */
  private parseRegistrationStatus(regInfo: RegistrationInfo): RegistrationStatus {
    return {
      id: regInfo.registration,
      server_uri: regInfo.serverUri,
      auth: regInfo.auth,
      status: this.normalizeStatus(regInfo.status),
      expiration: regInfo.expiration,
    };
  }

  /**
   * Normalize status string to known values
   */
  private normalizeStatus(status: string): RegistrationStatus['status'] {
    const s = status.toLowerCase();
    if (s.includes('registered')) return 'Registered';
    if (s.includes('rejected')) return 'Rejected';
    if (s.includes('unregistered')) return 'Unregistered';
    return 'Unknown';
  }

  /**
   * Get registration status from Asterisk via AMI
   */
  async getRegistrationStatus(id: string): Promise<RegistrationStatus | null> {
    try {
      const registrations = await this.amiService.getPJSIPRegistrations();

      // Registration ID in Asterisk is usually "trunk-reg-0"
      const regId = id.endsWith('-reg-0') ? id : `${id}-reg-0`;

      const regInfo = registrations.find(r => r.registration === regId);
      if (!regInfo) {
        return {
          id: regId,
          server_uri: '',
          auth: '',
          status: 'Unknown',
        };
      }

      return this.parseRegistrationStatus(regInfo);
    } catch (error) {
      this.logger.warn(`Failed to get registration status for ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Reload PJSIP wizard configuration in Asterisk
   */
  async reloadWizardConfig(): Promise<void> {
    try {
      await this.amiService.executeCommand('module reload res_pjsip_wizard.conf');
      this.logger.log('Reloaded PJSIP wizard configuration');

      // Wait a bit for reload to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      this.logger.error(`Failed to reload wizard config: ${error.message}`);
      throw new InternalServerErrorException('Failed to reload Asterisk configuration');
    }
  }

  /**
   * Create a new SIP trunk registration
   */
  async create(dto: CreateRegistrationDto, tenantId: number): Promise<SipTrunkRegistration> {
    // Check if trunk already exists for this tenant
    const exists = await this.sipTrunkRepository.findOne({
      where: { name: dto.name, tenantId },
    });

    if (exists) {
      throw new ConflictException(`SIP trunk '${dto.name}' already exists for this tenant`);
    }

    try {
      // Create entity
      const sipTrunk = this.sipTrunkRepository.create({
        name: dto.name,
        tenantId,
        remoteHost: dto.remote_host,
        username: dto.username,
        password: dto.password,
        transport: dto.transport || 'transport-udp',
        context: dto.context || 'from-trunk',
        sendsRegistrations: dto.sends_registrations ?? true,
        sendsAuth: dto.sends_auth ?? true,
        clientUri: dto.client_uri || null,
        serverUri: dto.server_uri || null,
        retryInterval: dto.retry_interval ?? 60,
        expiration: dto.expiration ?? 3600,
        maxRetries: dto.max_retries ?? 10,
        forbiddenRetryInterval: dto.forbidden_retry_interval ?? 0,
        line: dto.line ?? false,
        outboundProxy: dto.outbound_proxy || null,
        supportPath: dto.support_path ?? false,
        displayName: null,
        description: null,
        enabled: true,
      });

      // Save to database
      const saved = await this.sipTrunkRepository.save(sipTrunk);

      // Regenerate config file from all DB entries
      await this.configFileService.generateFromDatabase();

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Created SIP trunk registration: ${dto.name} for tenant ${tenantId}`);
      return this.entityToInterface(saved);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create SIP trunk: ${error.message}`);
    }
  }

  /**
   * Get all SIP trunk registrations (optionally filtered by tenant)
   */
  async findAll(tenantId?: number): Promise<SipTrunkRegistration[]> {
    const where = tenantId ? { tenantId, enabled: true } : { enabled: true };
    const trunks = await this.sipTrunkRepository.find({ where });
    return trunks.map(trunk => this.entityToInterface(trunk));
  }

  /**
   * Get all SIP trunk registrations with status (optionally filtered by tenant)
   */
  async findAllWithStatus(tenantId?: number): Promise<RegistrationWithStatus[]> {
    const registrations = await this.findAll(tenantId);
    const result: RegistrationWithStatus[] = [];

    for (const registration of registrations) {
      const status = await this.getRegistrationStatus(registration.id);
      result.push({
        ...registration,
        status: status || {
          id: registration.id,
          server_uri: registration.remote_hosts,
          auth: `${registration.id}-oauth`,
          status: 'Unknown',
        },
      });
    }

    return result;
  }

  /**
   * Get a single SIP trunk registration by name (optionally filtered by tenant)
   */
  async findOne(name: string, tenantId?: number): Promise<SipTrunkRegistration> {
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    return this.entityToInterface(trunk);
  }

  /**
   * Get a single SIP trunk registration with status (optionally filtered by tenant)
   */
  async findOneWithStatus(name: string, tenantId?: number): Promise<RegistrationWithStatus> {
    const registration = await this.findOne(name, tenantId);
    const status = await this.getRegistrationStatus(name);

    return {
      ...registration,
      status: status || {
        id: registration.id,
        server_uri: registration.remote_hosts,
        auth: `${registration.id}-oauth`,
        status: 'Unknown',
      },
    };
  }

  /**
   * Update a SIP trunk registration
   */
  async update(name: string, dto: UpdateRegistrationDto, tenantId?: number): Promise<SipTrunkRegistration> {
    // Find existing trunk
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    try {
      // Update fields if provided
      if (dto.remote_host !== undefined) trunk.remoteHost = dto.remote_host;
      if (dto.username !== undefined) trunk.username = dto.username;
      if (dto.password !== undefined) trunk.password = dto.password;
      if (dto.transport !== undefined) trunk.transport = dto.transport;
      if (dto.context !== undefined) trunk.context = dto.context;
      if (dto.sends_registrations !== undefined) trunk.sendsRegistrations = dto.sends_registrations;
      if (dto.sends_auth !== undefined) trunk.sendsAuth = dto.sends_auth;
      if (dto.client_uri !== undefined) trunk.clientUri = dto.client_uri || null;
      if (dto.server_uri !== undefined) trunk.serverUri = dto.server_uri || null;
      if (dto.retry_interval !== undefined) trunk.retryInterval = dto.retry_interval;
      if (dto.expiration !== undefined) trunk.expiration = dto.expiration;
      if (dto.max_retries !== undefined) trunk.maxRetries = dto.max_retries;
      if (dto.forbidden_retry_interval !== undefined) trunk.forbiddenRetryInterval = dto.forbidden_retry_interval;
      if (dto.line !== undefined) trunk.line = dto.line;
      if (dto.outbound_proxy !== undefined) trunk.outboundProxy = dto.outbound_proxy || null;
      if (dto.support_path !== undefined) trunk.supportPath = dto.support_path;

      // Save to database
      const updated = await this.sipTrunkRepository.save(trunk);

      // Regenerate config file from all DB entries
      await this.configFileService.generateFromDatabase();

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Updated SIP trunk registration: ${name}`);
      return this.entityToInterface(updated);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update SIP trunk: ${error.message}`);
    }
  }

  /**
   * Delete a SIP trunk registration
   */
  async remove(name: string, tenantId?: number): Promise<void> {
    // Find existing trunk
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    try {
      // Delete from database
      await this.sipTrunkRepository.remove(trunk);

      // Regenerate config file from all DB entries
      await this.configFileService.generateFromDatabase();

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Deleted SIP trunk registration: ${name}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete SIP trunk: ${error.message}`);
    }
  }

  /**
   * Force a registration attempt for a specific trunk
   */
  async forceRegister(name: string, tenantId?: number): Promise<void> {
    // Check if trunk exists
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    try {
      // Registration ID in Asterisk is usually "trunk-reg-0"
      const regId = name.endsWith('-reg-0') ? name : `${name}-reg-0`;

      await this.amiService.executeCommand(`pjsip send register ${regId}`);
      this.logger.log(`Forced registration for ${name}`);

      // Wait a bit for registration to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error(`Failed to force registration for ${name}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to force registration: ${error.message}`);
    }
  }

  /**
   * Get all registration statuses directly from AMI (without file access)
   * This is useful when backend cannot access Asterisk config files
   */
  async getAllRegistrationStatusesFromAMI(): Promise<RegistrationStatus[]> {
    try {
      const registrations = await this.amiService.getPJSIPRegistrations();
      return registrations.map(reg => this.parseRegistrationStatus(reg));
    } catch (error) {
      this.logger.error(`Failed to get registration statuses from AMI: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve registration statuses from Asterisk');
    }
  }
}
