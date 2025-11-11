import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { PsAor } from './entities/ps-aor.entity';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';
import { EndpointFilterDto } from './dto/endpoint-filter.dto';

import { AmiService } from '../core/asterisk/ami/ami.service';
import { CacheService } from '../core/cache/cache.service';
import { TenantsService } from '../tenants/tenants.service';
import { RolesService } from '../roles/roles.service';
import { TenantPrefixUtil } from '../common/utils/tenant-prefix.util';
import {
  getStartingNumberFromPattern,
  isNumberInPattern,
  getMaxNumberFromPattern,
} from '../common/utils/dialplan-pattern.util';
import { generateRandomUsername } from '../common/utils/random-username.util';

/**
 * Endpoints Service
 *
 * Handles PJSIP endpoint management with multi-tenant support
 *
 * Features:
 * - CRUD operations for endpoints (3-table atomic transactions)
 * - Tenant prefixing (t{tenantId}_username)
 * - AMI integration for real-time endpoint status
 * - Cache management for performance
 * - Tenant limits validation (max_endpoints)
 * - Automatic PJSIP reload after modifications
 *
 * Transaction Strategy:
 * - Create/Update/Delete operations affect 3 tables atomically:
 *   - ps_endpoints (endpoint configuration)
 *   - ps_auths (authentication)
 *   - ps_aors (address of record)
 * - Uses TypeORM QueryRunner for transaction management
 * - Rollback on any failure
 *
 * AMI Integration:
 * - Get real-time device state (registered, in use, etc.)
 * - Reload PJSIP after changes
 * - Handle AMI errors gracefully
 */
@Injectable()
export class EndpointsService {
  private readonly logger = new Logger(EndpointsService.name);

  constructor(
    @InjectRepository(PsEndpoint)
    private readonly endpointRepository: Repository<PsEndpoint>,
    @InjectRepository(PsAuth)
    private readonly authRepository: Repository<PsAuth>,
    @InjectRepository(PsAor)
    private readonly aorRepository: Repository<PsAor>,
    private readonly dataSource: DataSource,
    private readonly amiService: AmiService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => TenantsService))
    private readonly tenantsService: TenantsService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
  ) {}

  /**
   * Create a new endpoint
   *
   * Creates 3 related entities atomically:
   * - ps_endpoints
   * - ps_auths
   * - ps_aors
   *
   * @param tenantId - Tenant ID
   * @param dto - Endpoint creation data
   * @returns Created endpoint
   * @throws ConflictException if endpoint already exists
   * @throws BadRequestException if tenant has reached max_endpoints limit
   */
  async create(tenantId: number, dto: CreateEndpointDto): Promise<PsEndpoint> {
    // Check tenant limits
    const count = await this.endpointRepository.count({ where: { tenantId } });
    const hasReachedLimit = await this.tenantsService.hasReachedEndpointLimit(
      tenantId,
      count,
    );

    if (hasReachedLimit) {
      throw new BadRequestException(
        'Tenant has reached maximum endpoints limit',
      );
    }

    // Validate role if provided
    if (dto.roleId) {
      try {
        await this.rolesService.findOne(tenantId, dto.roleId);
      } catch (error) {
        throw new BadRequestException(
          `Role with ID ${dto.roleId} not found for tenant ${tenantId}`,
        );
      }
    }

    // Detect WebRTC endpoint (transport-wss)
    const isWebRTC = dto.transport === 'transport-wss';

    // Generate the next agent number based on tenant's dialplan pattern
    const agentNumber = await this.getNextAgentNumber(tenantId);

    // Generate prefixed ID for multi-tenant isolation
    // Format: t{tenantId}_{agentNumber}
    // Example: t1_1000, t1_1001, t2_2000, t2_2001
    const prefixedId = TenantPrefixUtil.addPrefix(
      tenantId,
      agentNumber.toString(),
    );

    // Check if endpoint already exists (should not happen with auto-increment)
    const existing = await this.endpointRepository.findOne({
      where: { id: prefixedId },
    });

    if (existing) {
      throw new ConflictException(
        `Endpoint with ID "${prefixedId}" already exists`,
      );
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create endpoint with WebRTC-specific settings
      const endpoint = this.endpointRepository.create({
        id: prefixedId,
        tenantId,
        transport: dto.transport || 'transport-udp',
        aors: prefixedId, // Reference to AoR (always prefixed)
        auth: prefixedId, // Reference to Auth (always prefixed)
        context: dto.context || 'default',
        disallow: 'all',
        allow: dto.codecs || (isWebRTC ? 'opus,ulaw,alaw,g722' : 'ulaw,alaw'),
        directMedia: isWebRTC ? 'no' : (dto.directMedia || 'yes'),
        dtmfMode: dto.dtmfMode || 'rfc4733',
        callerid: dto.callerid || (isWebRTC ? `"WebRTC Agent ${agentNumber}" <${agentNumber}>` : undefined),
        mailboxes: dto.mailboxes,
        roleId: dto.roleId, // Assign role if provided

        // WebRTC-specific fields
        ...(isWebRTC && {
          webrtc: 'yes',
          useAvpf: 'yes',
          mediaEncryption: 'dtls',
          dtlsVerify: 'fingerprint',
          dtlsSetup: 'actpass',
          iceSupport: 'yes',
          rtcpMux: 'yes',
          rtpSymmetric: 'yes',
          forceRport: 'yes',
          rewriteContact: 'yes',
          dtlsCertFile: '/etc/asterisk/keys/fullchain.pem',
          dtlsPrivateKey: '/etc/asterisk/keys/privkey.pem',
          identifyBy: 'username', // CRITICAL: Asterisk matches by auth.username (without prefix)
          bundle: 'yes',
          timers: 'yes',
        }),
      });
      await queryRunner.manager.save(endpoint);

      // Generate random username for SIP authentication
      // CRITICAL: Username is NOT prefixed and is randomly generated
      // This provides better security and avoids conflicts
      let randomUsername = generateRandomUsername();
      let retryCount = 0;
      const maxRetries = 5;

      // Ensure username uniqueness (retry if collision detected)
      while (retryCount < maxRetries) {
        const existingAuth = await this.authRepository.findOne({
          where: { username: randomUsername },
        });

        if (!existingAuth) {
          break; // Username is unique
        }

        // Collision detected, generate a new one
        this.logger.warn(
          `Username collision detected: ${randomUsername}. Retrying... (${retryCount + 1}/${maxRetries})`,
        );
        randomUsername = generateRandomUsername();
        retryCount++;
      }

      if (retryCount >= maxRetries) {
        throw new ConflictException(
          'Failed to generate unique username after multiple attempts',
        );
      }

      // Create auth with random username
      const auth = this.authRepository.create({
        id: prefixedId, // Auth ID is prefixed (e.g., 't1_1000')
        tenantId,
        authType: 'userpass',
        username: randomUsername, // CRITICAL: Random username, NOT prefixed
        password: dto.password,
        realm: 'asterisk', // CRITICAL: Must match Asterisk's default realm
      });
      await queryRunner.manager.save(auth);

      // Create AoR
      const aor = this.aorRepository.create({
        id: prefixedId,
        tenantId,
        maxContacts: dto.maxContacts || 1,
        removeExisting: isWebRTC ? 'yes' : 'no', // WebRTC endpoints should remove existing contacts
        mailboxes: dto.mailboxes,
      });
      await queryRunner.manager.save(aor);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Reload PJSIP
      try {
        await this.reloadPJSIP();
      } catch (error) {
        this.logger.warn(`Failed to reload PJSIP: ${error.message}`);
        // Don't rollback - database changes are committed
      }

      // Invalidate cache
      await this.cacheService.del(
        CacheService.generateKey('endpoints', String(tenantId), 'list'),
      );

      this.logger.log(
        `Created endpoint: Agent ${agentNumber} (ID: ${prefixedId}, Username: ${randomUsername}) for tenant ${tenantId}`,
      );

      // Return endpoint with the generated username so clients can use it
      return {
        ...endpoint,
        generatedUsername: randomUsername, // Add generated username to response
        agentNumber, // Add agent number for reference
      } as any;
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create endpoint: ${error.message}`);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Get the next available agent number for a tenant
   *
   * Logic:
   * 1. Retrieve the tenant's dialplanConfig.internalDialPattern
   * 2. Find all existing endpoints for the tenant
   * 3. Extract the numeric part from their IDs (after removing tenant prefix)
   * 4. If no endpoints exist, use the pattern's starting number
   * 5. Otherwise, increment the highest agent number
   * 6. Validate that the new number doesn't exceed the pattern's maximum
   *
   * @param tenantId - Tenant ID
   * @returns The next available agent number
   * @throws BadRequestException if pattern is exhausted
   *
   * @example
   * // Tenant 1, pattern "_1XXX", no existing endpoints
   * getNextAgentNumber(1) // => 1000
   *
   * // Tenant 1, pattern "_1XXX", max endpoint is t1_1005
   * getNextAgentNumber(1) // => 1006
   */
  private async getNextAgentNumber(tenantId: number): Promise<number> {
    // Get tenant to access dialplanConfig
    const tenant = await this.tenantsService.findOne(tenantId);

    // Get the internal dial pattern (default to "_1XXX" if not set)
    const pattern =
      tenant.dialplanConfig?.internalDialPattern || '_1XXX';

    // Get the starting number from the pattern
    const startingNumber = getStartingNumberFromPattern(pattern);
    const maxNumber = getMaxNumberFromPattern(pattern);

    // Find all endpoints for this tenant
    const endpoints = await this.endpointRepository.find({
      where: { tenantId },
      select: ['id'], // Only need the ID field
    });

    // If no endpoints exist, start with the pattern's starting number
    if (endpoints.length === 0) {
      this.logger.log(
        `No existing endpoints for tenant ${tenantId}. Starting at ${startingNumber} (pattern: ${pattern})`,
      );
      return startingNumber;
    }

    // Extract agent numbers from endpoint IDs
    // Example: "t1_1001" -> 1001
    const agentNumbers: number[] = [];

    for (const endpoint of endpoints) {
      try {
        // Remove the tenant prefix (e.g., "t1_" from "t1_1001")
        const { name } = TenantPrefixUtil.removePrefix(endpoint.id);

        // Parse the numeric part
        const agentNumber = parseInt(name, 10);

        // Only include valid numbers that match the pattern
        if (!isNaN(agentNumber) && isNumberInPattern(agentNumber, pattern)) {
          agentNumbers.push(agentNumber);
        }
      } catch (error) {
        // Skip endpoints with invalid IDs
        this.logger.warn(
          `Skipping endpoint with invalid ID format: ${endpoint.id}`,
        );
      }
    }

    // If no valid agent numbers found, start fresh
    if (agentNumbers.length === 0) {
      this.logger.log(
        `No valid agent numbers found for tenant ${tenantId}. Starting at ${startingNumber}`,
      );
      return startingNumber;
    }

    // Find the maximum agent number
    const maxAgentNumber = Math.max(...agentNumbers);

    // Increment to get the next number
    const nextNumber = maxAgentNumber + 1;

    // Validate that we haven't exceeded the pattern's maximum
    if (nextNumber > maxNumber) {
      throw new BadRequestException(
        `Agent number range exhausted for pattern ${pattern}. ` +
          `Maximum allowed is ${maxNumber}, but next would be ${nextNumber}. ` +
          `Please contact administrator to adjust the dialplan pattern.`,
      );
    }

    this.logger.log(
      `Next agent number for tenant ${tenantId}: ${nextNumber} (pattern: ${pattern}, max existing: ${maxAgentNumber})`,
    );

    return nextNumber;
  }

  /**
   * Find all endpoints for tenant with filtering and pagination
   *
   * @param tenantId - Tenant ID (null for admin)
   * @param filter - Filter and pagination options
   * @returns Paginated endpoints with metadata
   */
  async findAll(
    tenantId: number,
    filter?: EndpointFilterDto,
  ): Promise<{ data: PsEndpoint[]; total: number; page: number; limit: number }> {
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    // Query database
    const query = this.endpointRepository.createQueryBuilder('endpoint')
      .leftJoinAndSelect('endpoint.role', 'role'); // Load role relation

    // Filter by tenant (unless admin)
    if (tenantId !== null) {
      query.where('endpoint.tenantId = :tenantId', { tenantId });
    }

    // Apply filters
    if (filter?.username) {
      const prefixedUsername = tenantId !== null
        ? TenantPrefixUtil.addPrefix(tenantId, filter.username)
        : filter.username;
      query.andWhere('endpoint.id = :username', { username: prefixedUsername });
    }

    if (filter?.search) {
      // MODIFIED - displayName doesn't exist, search only by ID
      query.andWhere(
        '(endpoint.id LIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter?.transport) {
      query.andWhere('endpoint.transport LIKE :transport', {
        transport: `%${filter.transport}%`,
      });
    }

    if (filter?.context) {
      query.andWhere('endpoint.context = :context', {
        context: filter.context,
      });
    }

    // Get total count
    const total = await query.getCount();

    // Apply sorting
    const sortBy = filter?.sortBy || 'id';  // MODIFIED - displayName doesn't exist
    const order = filter?.order || 'ASC';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'transport', 'context', 'tenantId'];  // REMOVED displayName
    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`endpoint.${sortBy}`, order);
    } else {
      query.orderBy('endpoint.id', 'ASC');  // MODIFIED - displayName doesn't exist
    }

    // Apply pagination
    query.skip(skip).take(limit);

    const endpoints = await query.getMany();

    return {
      data: endpoints,
      total,
      page,
      limit,
    };
  }

  /**
   * Find one endpoint by display name
   *
   * @param tenantId - Tenant ID
   * @param displayName - Endpoint display name (without prefix)
   * @returns Endpoint
   * @throws NotFoundException if endpoint not found
   */
  async findOne(tenantId: number | null, displayName: string): Promise<PsEndpoint> {
    // SUPER_ADMIN case: tenantId is null
    if (tenantId === null) {
      // Check if displayName has tenant prefix (e.g., "t1_101")
      if (TenantPrefixUtil.hasPrefix(displayName)) {
        // Use the full prefixed ID directly
        const { tenantId: extractedTenantId } = TenantPrefixUtil.removePrefix(displayName);
        const endpoint = await this.endpointRepository.findOne({
          where: { id: displayName, tenantId: extractedTenantId },
          relations: ['role'], // Load role relation
        });

        if (!endpoint) {
          throw new NotFoundException(
            `Endpoint with ID "${displayName}" not found`,
          );
        }
        return endpoint;
      } else {
        // SUPER_ADMIN must provide full ID with tenant prefix
        throw new BadRequestException(
          `SUPER_ADMIN must provide full endpoint ID with tenant prefix (e.g., "t1_101")`,
        );
      }
    }

    // Normal case: tenantId is provided
    const prefixedId = TenantPrefixUtil.addPrefix(tenantId, displayName);
    const endpoint = await this.endpointRepository.findOne({
      where: { id: prefixedId, tenantId },
      relations: ['role'], // Load role relation
    });

    if (!endpoint) {
      throw new NotFoundException(
        `Endpoint with username "${displayName}" not found`,
      );
    }

    return endpoint;
  }

  /**
   * Get endpoint with real-time status from AMI
   *
   * @param tenantId - Tenant ID
   * @param displayName - Endpoint display name
   * @returns Endpoint with status
   */
  async findOneWithStatus(tenantId: number, displayName: string) {
    const endpoint = await this.findOne(tenantId, displayName);

    // Try to get real-time status from AMI
    let deviceState = 'Unknown';
    let activeChannels = 0;
    let registered = false;
    let contacts: any = null;
    let dataSource = 'database';

    try {
      const status = await this.amiService.getEndpointStatus(endpoint.id);
      deviceState = status.deviceState || 'Unknown';
      activeChannels = status.activeChannels || 0;
      contacts = status.contacts || null;
      
      // Calculate registered status (like old project)
      registered = deviceState === 'Not in use' || 
                   deviceState === 'Ringing' || 
                   deviceState === 'In use' ||
                   deviceState === 'Busy' ||
                   deviceState === 'Ring+Inuse' ||
                   (contacts && contacts.length > 0);
      
      dataSource = 'hybrid'; // Got data from both DB and AMI
    } catch (error) {
      this.logger.warn(
        `Failed to get AMI status for endpoint ${endpoint.id}: ${error.message}`,
      );
      dataSource = 'database_fallback';
    }

    return {
      ...endpoint,
      deviceState,
      activeChannels,
      registered,  // ADDED - like old project
      contacts,    // ADDED - like old project
      dataSource,  // ADDED - like old project
    };
  }

  /**
   * ADDED - Get all endpoints enriched with AMI data (like old project)
   * 
   * @param tenantId - Tenant ID (null for all)
   * @param filter - Filter options
   * @returns All endpoints with AMI enrichment
   */
  async findAllEnriched(
    tenantId: number,
    filter?: EndpointFilterDto,
  ) {
    // Get all endpoints from DB
    const result = await this.findAll(tenantId, filter);
    
    // Enrich each endpoint with AMI status
    const enrichedData = await Promise.all(
      result.data.map(async (endpoint) => {
        try {
          const status = await this.amiService.getEndpointStatus(endpoint.id);
          const deviceState = status.deviceState || 'Unknown';
          const activeChannels = status.activeChannels || 0;
          const registered = deviceState === 'Not in use' || 
                           deviceState === 'Ringing' || 
                           deviceState === 'In use' ||
                           deviceState === 'Busy';
          
          return {
            ...endpoint,
            device_state: deviceState,
            active_channels: activeChannels,
            registered: registered,
            contacts: status.contacts || null,
            data_source: 'hybrid',
          };
        } catch (error) {
          // Fallback to DB data only
          return {
            ...endpoint,
            device_state: 'Unknown',
            active_channels: 0,
            registered: false,
            data_source: 'database_fallback',
            warning: 'AMI unavailable',
          };
        }
      })
    );

    return {
      data: enrichedData,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * ADDED - Get endpoint with complete AMI details (like old project)
   */
  async getEndpointDetails(tenantId: number, displayName: string) {
    const endpoint = await this.findOne(tenantId, displayName);
    
    try {
      const amiStatus = await this.amiService.getEndpointStatus(endpoint.id);
      
      return {
        ...endpoint,
        ami_details: {
          device_state: amiStatus.deviceState,
          active_channels: amiStatus.activeChannels,
          transport: amiStatus.transport,
          aor: amiStatus.aor,
          auths: amiStatus.auths,
          contacts: amiStatus.contacts,
          object_type: amiStatus.objectType,
          object_name: amiStatus.objectName,
        },
        data_source: 'asterisk',
      };
    } catch (error) {
      this.logger.warn(`Failed to get AMI details for ${endpoint.id}: ${error.message}`);
      return {
        ...endpoint,
        data_source: 'database_fallback',
        warning: 'AMI unavailable',
      };
    }
  }

  /**
   * ADDED - Force disconnect an endpoint (like old project)
   */
  async forceDisconnect(tenantId: number, displayName: string) {
    const endpoint = await this.findOne(tenantId, displayName);
    
    try {
      const status = await this.amiService.getEndpointStatus(endpoint.id);
      const activeChannels = status.activeChannels || 0;
      
      if (activeChannels === 0) {
        return {
          message: 'No active channels to disconnect',
          endpoint_id: endpoint.id,
          channels_disconnected: 0,
        };
      }
      
      this.logger.log(`Force disconnect requested for endpoint ${endpoint.id}`);
      
      return {
        message: 'Disconnect command sent',
        endpoint_id: endpoint.id,
        active_channels: activeChannels,
        note: 'Channel hangup not yet implemented - requires AMI channel hangup action',
      };
      
    } catch (error) {
      this.logger.error(`Failed to disconnect endpoint ${endpoint.id}: ${error.message}`);
      throw new Error('AMI service unavailable');
    }
  }

  /**
   * Update endpoint
   *
   * Updates 3 related entities atomically
   *
   * @param tenantId - Tenant ID
   * @param displayName - Endpoint display name
   * @param dto - Update data
   * @returns Updated endpoint
   */
  async update(
    tenantId: number,
    displayName: string,
    dto: UpdateEndpointDto,
  ): Promise<PsEndpoint> {
    // Check if endpoint exists first
    const endpoint = await this.findOne(tenantId, displayName);
    const prefixedId = endpoint.id; // Use actual ID from found endpoint

    // Validate role if provided
    if (dto.roleId !== undefined) {
      if (dto.roleId !== null) {
        try {
          await this.rolesService.findOne(tenantId, dto.roleId);
        } catch (error) {
          throw new BadRequestException(
            `Role with ID ${dto.roleId} not found for tenant ${tenantId}`,
          );
        }
      }
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Track if role changed for logging
      const roleChanged = dto.roleId !== undefined && endpoint.roleId !== dto.roleId;
      const oldRoleId = endpoint.roleId;

      // Update endpoint
      if (dto.context !== undefined) endpoint.context = dto.context;
      if (dto.transport !== undefined) endpoint.transport = dto.transport;
      if (dto.codecs !== undefined) endpoint.allow = dto.codecs;
      if (dto.directMedia !== undefined) endpoint.directMedia = dto.directMedia;
      if (dto.dtmfMode !== undefined) endpoint.dtmfMode = dto.dtmfMode;
      if (dto.callerid !== undefined) endpoint.callerid = dto.callerid;
      if (dto.mailboxes !== undefined) endpoint.mailboxes = dto.mailboxes;
      if (dto.roleId !== undefined) endpoint.roleId = dto.roleId;

      await queryRunner.manager.save(endpoint);

      // Log role change for audit purposes
      if (roleChanged) {
        this.logger.log(
          `Endpoint ${prefixedId} role changed: ${oldRoleId || 'none'} → ${dto.roleId || 'none'}`,
        );
      }

      // Update auth if password changed
      if (dto.password !== undefined) {
        const auth = await this.authRepository.findOne({
          where: { id: prefixedId },
        });
        if (auth) {
          auth.password = dto.password;
          await queryRunner.manager.save(auth);
        }
      }

      // Update AoR if needed
      if (dto.maxContacts !== undefined || dto.mailboxes !== undefined) {
        const aor = await this.aorRepository.findOne({
          where: { id: prefixedId },
        });
        if (aor) {
          if (dto.maxContacts !== undefined)
            aor.maxContacts = dto.maxContacts;
          if (dto.mailboxes !== undefined) aor.mailboxes = dto.mailboxes;
          await queryRunner.manager.save(aor);
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Reload PJSIP
      try {
        await this.reloadPJSIP();
      } catch (error) {
        this.logger.warn(`Failed to reload PJSIP: ${error.message}`);
      }

      // Invalidate cache
      await this.cacheService.delPattern(`endpoints:${tenantId}:*`);

      this.logger.log(`Updated endpoint: ${displayName} for tenant ${tenantId}`);
      return endpoint;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update endpoint: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete endpoint
   *
   * Deletes 3 related entities atomically
   *
   * @param tenantId - Tenant ID
   * @param displayName - Endpoint display name
   */
  async remove(tenantId: number, displayName: string): Promise<void> {
    // Check if endpoint exists first
    const endpoint = await this.findOne(tenantId, displayName);
    const prefixedId = endpoint.id; // Use actual ID from found endpoint

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete AoR
      const aor = await this.aorRepository.findOne({
        where: { id: prefixedId },
      });
      if (aor) {
        await queryRunner.manager.remove(aor);
      }

      // Delete Auth
      const auth = await this.authRepository.findOne({
        where: { id: prefixedId },
      });
      if (auth) {
        await queryRunner.manager.remove(auth);
      }

      // Delete Endpoint
      await queryRunner.manager.remove(endpoint);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Reload PJSIP
      try {
        await this.reloadPJSIP();
      } catch (error) {
        this.logger.warn(`Failed to reload PJSIP: ${error.message}`);
      }

      // Invalidate cache
      await this.cacheService.delPattern(`endpoints:${tenantId}:*`);

      this.logger.log(`Deleted endpoint: ${displayName} for tenant ${tenantId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete endpoint: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reload PJSIP module in Asterisk
   *
   * @private
   */
  private async reloadPJSIP(): Promise<void> {
    try {
      await this.amiService.reloadPJSIP();
      this.logger.log('PJSIP reloaded successfully');
    } catch (error) {
      this.logger.error(`Failed to reload PJSIP: ${error.message}`);
      throw new BadRequestException(`Failed to reload PJSIP: ${error.message}`);
    }
  }
}
