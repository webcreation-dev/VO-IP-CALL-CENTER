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
import { UpdateRoutingDto } from './dto/update-routing.dto';
import {
  SipTrunkRegistration,
  RegistrationStatus,
  RegistrationWithStatus,
} from './interfaces/registration.interface';
import { RegistrationInfo } from '../core/asterisk/ami/ami.types';
import { SipTrunk } from './entities/sip-trunk.entity';
import { ExtensionsService } from '../extensions/extensions.service';
import { Queue } from '../queues/entities/queue.entity';
import { Tenant } from '../core/database/entities/tenant.entity';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectRepository(SipTrunk)
    private readonly sipTrunkRepository: Repository<SipTrunk>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly configFileService: ConfigFileService,
    private readonly amiService: AmiService,
    private readonly extensionsService: ExtensionsService,
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
      // Routing configuration
      destination_type: entity.destinationType ?? undefined,
      destination_id: entity.destinationId ?? undefined,
      did_pattern: entity.didPattern ?? undefined,
      // Metadata fields
      tenantId: entity.tenantId,
      displayName: entity.displayName ?? undefined,
      description: entity.description ?? undefined,
      enabled: entity.enabled,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
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
   * Create a new SIP trunk registration (without tenant - global trunk)
   */
  async create(dto: CreateRegistrationDto): Promise<SipTrunkRegistration> {
    // Check if trunk already exists (globally)
    const exists = await this.sipTrunkRepository.findOne({
      where: { name: dto.name },
    });

    if (exists) {
      throw new ConflictException(`SIP trunk '${dto.name}' already exists`);
    }

    try {
      // Don't allow routing configuration on creation (trunk must be associated first)
      if (dto.destination_type || dto.destination_id) {
        throw new BadRequestException(
          'Cannot configure routing on trunk creation. Associate the trunk with a tenant first.'
        );
      }

      // Create entity WITHOUT tenant
      const sipTrunk = this.sipTrunkRepository.create({
        name: dto.name,
        tenantId: null,  // Global trunk - no tenant association
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
        // Routing configuration
        destinationType: dto.destination_type || null,
        destinationId: dto.destination_id || null,
        didPattern: dto.did_pattern || '_X.',
      });

      // Save to database
      const saved = await this.sipTrunkRepository.save(sipTrunk);

      // No routing extensions on creation (trunk is global, not associated)

      // Regenerate config file from all DB entries
      await this.configFileService.generateFromDatabase();

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Created global SIP trunk registration: ${dto.name} (not associated with any tenant)`);
      return this.entityToInterface(saved);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
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

      // Update routing fields if provided
      if (dto.destination_type !== undefined) trunk.destinationType = dto.destination_type || null;
      if (dto.destination_id !== undefined) trunk.destinationId = dto.destination_id || null;
      if (dto.did_pattern !== undefined) trunk.didPattern = dto.did_pattern || null;

      // Validate routing if being updated
      if (trunk.destinationType && trunk.destinationId) {
        await this.validateDestination(trunk.destinationType, trunk.destinationId, trunk.tenantId);
      }

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
   * Associate a trunk with a tenant
   */
  async associateTenant(trunkId: string, tenantId: number): Promise<SipTrunkRegistration> {
    // 1. Find the trunk
    const trunk = await this.sipTrunkRepository.findOne({ where: { name: trunkId } });

    if (!trunk) {
      throw new NotFoundException(`Trunk '${trunkId}' not found`);
    }

    // 2. Check if trunk is already associated
    if (trunk.tenantId !== null) {
      throw new BadRequestException(
        `Trunk '${trunkId}' is already associated with tenant ${trunk.tenantId}`
      );
    }

    // 3. Check if tenant exists
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    try {
      // 4. Associate trunk with tenant
      trunk.tenantId = tenantId;
      const saved = await this.sipTrunkRepository.save(trunk);

      // 5. Regenerate config and reload Asterisk
      await this.configFileService.generateFromDatabase();
      await this.reloadWizardConfig();

      this.logger.log(`Associated trunk '${trunkId}' with tenant ${tenantId}`);
      return this.entityToInterface(saved);
    } catch (error) {
      this.logger.error(`Failed to associate trunk: ${error.message}`);
      throw new InternalServerErrorException(`Failed to associate trunk: ${error.message}`);
    }
  }

  /**
   * Dissociate a trunk from its tenant
   */
  async dissociateTenant(trunkId: string): Promise<SipTrunkRegistration> {
    // 1. Find the trunk
    const trunk = await this.sipTrunkRepository.findOne({ where: { name: trunkId } });

    if (!trunk) {
      throw new NotFoundException(`Trunk '${trunkId}' not found`);
    }

    // 2. Check if trunk is associated
    if (trunk.tenantId === null) {
      throw new BadRequestException(
        `Trunk '${trunkId}' is not associated with any tenant`
      );
    }

    try {
      // 3. Remove routing configuration (if exists)
      if (trunk.destinationType || trunk.destinationId) {
        this.logger.log(`Removing routing configuration for trunk '${trunkId}'`);

        // Remove routing extensions
        try {
          await this.removeRoutingExtensions(trunk);
        } catch (error) {
          this.logger.warn(`Failed to remove routing extensions: ${error.message}`);
        }

        trunk.destinationType = null;
        trunk.destinationId = null;
        trunk.didPattern = '_X.';
      }

      // 4. Dissociate from tenant
      const previousTenantId = trunk.tenantId;
      trunk.tenantId = null;
      const saved = await this.sipTrunkRepository.save(trunk);

      // 5. Regenerate config and reload Asterisk
      await this.configFileService.generateFromDatabase();
      await this.reloadWizardConfig();

      this.logger.log(`Dissociated trunk '${trunkId}' from tenant ${previousTenantId}`);
      return this.entityToInterface(saved);
    } catch (error) {
      this.logger.error(`Failed to dissociate trunk: ${error.message}`);
      throw new InternalServerErrorException(`Failed to dissociate trunk: ${error.message}`);
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

  /**
   * Update routing configuration for a trunk
   * This will automatically create/update the necessary dialplan extensions
   */
  async updateRouting(name: string, dto: UpdateRoutingDto, tenantId?: number) {
    // Find the trunk
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    // Validate that trunk is associated with a tenant before allowing routing configuration
    if (trunk.tenantId === null) {
      throw new BadRequestException(
        'Cannot configure routing for a trunk that is not associated with a tenant. ' +
        'Please associate the trunk with a tenant first.'
      );
    }

    try {
      // Validate destination if specified
      if (dto.destination_type && dto.destination_id) {
        await this.validateDestination(dto.destination_type, dto.destination_id, trunk.tenantId);
      }

      // Remove old routing extensions if routing is being changed
      if (trunk.destinationType && trunk.destinationId) {
        await this.removeRoutingExtensions(trunk);
      }

      // Update trunk routing fields
      trunk.destinationType = dto.destination_type ?? null;
      trunk.destinationId = dto.destination_id ?? null;
      trunk.didPattern = dto.did_pattern ?? trunk.didPattern ?? '_X.';

      // Save trunk
      const updated = await this.sipTrunkRepository.save(trunk);

      // Create new routing extensions if destination is set
      let extensionsCreated: any[] = [];
      if (trunk.destinationType && trunk.destinationId) {
        extensionsCreated = await this.createRoutingExtensions(trunk);
      }

      this.logger.log(`Updated routing for trunk ${name}: ${trunk.destinationType} -> ${trunk.destinationId}`);

      return {
        message: 'Routing configured successfully',
        trunk: {
          id: updated.name,
          destination_type: updated.destinationType,
          destination_id: updated.destinationId,
          did_pattern: updated.didPattern,
          context: updated.context,
        },
        extensions_created: extensionsCreated,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update routing for ${name}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update routing: ${error.message}`);
    }
  }

  /**
   * Get routing configuration for a trunk
   */
  async getRouting(name: string, tenantId?: number) {
    const where: any = { name };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const trunk = await this.sipTrunkRepository.findOne({ where });

    if (!trunk) {
      throw new NotFoundException(`SIP trunk '${name}' not found`);
    }

    // Get associated extensions if routing is configured
    let extensions: any[] = [];
    if (trunk.destinationType && trunk.destinationId) {
      try {
        const allExtensions = await this.extensionsService.getByContext(trunk.tenantId, trunk.context);
        // Filter extensions that match the DID pattern and route to the destination
        const destType = trunk.destinationType;
        const destId = trunk.destinationId;
        extensions = allExtensions.filter((ext: any) => {
          return ext.exten === trunk.didPattern &&
                 this.isRoutingToDestination(ext, destType, destId, trunk.tenantId);
        });
      } catch (error) {
        this.logger.warn(`Failed to get extensions for trunk ${name}: ${error.message}`);
      }
    }

    return {
      destination_type: trunk.destinationType,
      destination_id: trunk.destinationId,
      did_pattern: trunk.didPattern,
      context: trunk.context,
      extensions: extensions.map((ext: any) => ({
        context: ext.context,
        exten: ext.exten,
        priority: ext.priority,
        app: ext.app,
        appdata: ext.appdata,
      })),
    };
  }

  /**
   * Validate that a destination exists and belongs to the tenant
   */
  private async validateDestination(type: string, destinationId: string, tenantId: number): Promise<void> {
    switch (type) {
      case 'queue':
        // Queue names are tenant-prefixed (t{tenantId}_{queueName})
        const queueName = destinationId.startsWith(`t${tenantId}_`) ? destinationId : `t${tenantId}_${destinationId}`;
        const queue = await this.queueRepository.findOne({ where: { name: queueName } });
        if (!queue) {
          throw new NotFoundException(`Queue '${destinationId}' not found for tenant ${tenantId}`);
        }
        break;

      case 'extension':
        // Extensions are validated when created, so we just check the format
        if (!destinationId || destinationId.trim() === '') {
          throw new BadRequestException('Extension number cannot be empty');
        }
        break;

      case 'ivr':
        // IVR validation would go here
        // For now, we just check it's not empty
        if (!destinationId || destinationId.trim() === '') {
          throw new BadRequestException('IVR menu ID cannot be empty');
        }
        break;

      default:
        throw new BadRequestException(`Unknown destination type: ${type}`);
    }
  }

  /**
   * Create dialplan extensions for trunk routing
   */
  private async createRoutingExtensions(trunk: SipTrunk): Promise<any[]> {
    const extensions: any[] = [];

    // Determine the app and appdata based on destination type
    let app: string;
    let appdata: string;

    if (!trunk.destinationId) {
      throw new BadRequestException('Destination ID is required');
    }

    switch (trunk.destinationType) {
      case 'queue':
        app = 'Queue';
        // Use the full queue name (tenant-prefixed)
        appdata = trunk.destinationId.startsWith(`t${trunk.tenantId}_`)
          ? trunk.destinationId
          : `t${trunk.tenantId}_${trunk.destinationId}`;
        break;

      case 'extension':
        app = 'Goto';
        appdata = `${trunk.context},${trunk.destinationId},1`;
        break;

      case 'ivr':
        app = 'Goto';
        appdata = `ivr-${trunk.destinationId},s,1`;
        break;

      default:
        throw new BadRequestException(`Cannot create routing for destination type: ${trunk.destinationType}`);
    }

    // Create the extension
    try {
      const extension = await this.extensionsService.create(trunk.tenantId, {
        context: trunk.context,
        exten: trunk.didPattern || '_X.',
        priority: 1,
        app,
        appdata,
      });

      extensions.push(extension);
    } catch (error) {
      this.logger.error(`Failed to create routing extension: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create routing extension: ${error.message}`);
    }

    return extensions;
  }

  /**
   * Remove routing extensions for a trunk
   */
  private async removeRoutingExtensions(trunk: SipTrunk): Promise<void> {
    try {
      const allExtensions = await this.extensionsService.getByContext(trunk.tenantId, trunk.context);

      // Find extensions that match the DID pattern and route to the current destination
      const destType = trunk.destinationType;
      const destId = trunk.destinationId;
      const extensionsToRemove = allExtensions.filter((ext: any) => {
        return ext.exten === trunk.didPattern &&
               destType && destId &&
               this.isRoutingToDestination(ext, destType, destId, trunk.tenantId);
      });

      // Remove each extension
      for (const ext of extensionsToRemove) {
        await this.extensionsService.remove(trunk.tenantId, ext.id);
      }

      if (extensionsToRemove.length > 0) {
        this.logger.log(`Removed ${extensionsToRemove.length} routing extensions for trunk ${trunk.name}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to remove old routing extensions: ${error.message}`);
      // Don't throw error here, we can continue with the update
    }
  }

  /**
   * Check if an extension routes to a specific destination
   */
  private isRoutingToDestination(extension: any, destinationType: string, destinationId: string, tenantId: number): boolean {
    switch (destinationType) {
      case 'queue':
        const queueName = destinationId.startsWith(`t${tenantId}_`) ? destinationId : `t${tenantId}_${destinationId}`;
        return extension.app === 'Queue' && extension.appdata === queueName;

      case 'extension':
        return extension.app === 'Goto' && extension.appdata.includes(destinationId);

      case 'ivr':
        return extension.app === 'Goto' && extension.appdata.includes(`ivr-${destinationId}`);

      default:
        return false;
    }
  }
}
