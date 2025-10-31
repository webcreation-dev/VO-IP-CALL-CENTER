import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
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
import { TenantPrefixUtil } from '../common/utils/tenant-prefix.util';

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
    private readonly tenantsService: TenantsService,
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

    // Generate prefixed ID
    const prefixedId = TenantPrefixUtil.addPrefix(tenantId, dto.username);

    // Check if endpoint already exists
    const existing = await this.endpointRepository.findOne({
      where: { id: prefixedId },
    });

    if (existing) {
      throw new ConflictException(
        `Endpoint with username "${dto.username}" already exists`,
      );
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create endpoint
      const endpoint = this.endpointRepository.create({
        id: prefixedId,
        displayName: dto.username,
        tenantId,
        transport: dto.transport || 'transport-udp',
        aors: prefixedId, // Reference to AoR
        auth: prefixedId, // Reference to Auth
        context: dto.context || 'default',
        disallow: 'all',
        allow: dto.codecs || 'ulaw,alaw',
        directMedia: dto.directMedia || 'yes',
        dtmfMode: dto.dtmfMode || 'rfc4733',
        callerid: dto.callerid,
        mailboxes: dto.mailboxes,
      });
      await queryRunner.manager.save(endpoint);

      // Create auth
      const auth = this.authRepository.create({
        id: prefixedId,
        displayName: dto.username,
        tenantId,
        authType: 'userpass',
        username: dto.username,
        password: dto.password,
      });
      await queryRunner.manager.save(auth);

      // Create AoR
      const aor = this.aorRepository.create({
        id: prefixedId,
        displayName: dto.username,
        tenantId,
        maxContacts: dto.maxContacts || 1,
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
        `Created endpoint: ${dto.username} (ID: ${prefixedId}) for tenant ${tenantId}`,
      );
      return endpoint;
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
   * Find all endpoints for tenant with filtering and pagination
   *
   * @param tenantId - Tenant ID (null for admin)
   * @param filter - Filter and pagination options
   * @returns Paginated endpoints with metadata
   */
  async findAll(
    tenantId: number | null,
    filter?: EndpointFilterDto,
  ): Promise<{ data: PsEndpoint[]; total: number; page: number; limit: number }> {
    const page = filter?.page || 1;
    const limit = filter?.limit || 20;
    const skip = (page - 1) * limit;

    // Query database
    const query = this.endpointRepository.createQueryBuilder('endpoint');

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
      query.andWhere(
        '(endpoint.displayName LIKE :search OR endpoint.id LIKE :search)',
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
    const sortBy = filter?.sortBy || 'displayName';
    const order = filter?.order || 'ASC';

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['id', 'displayName', 'transport', 'context', 'tenantId'];
    if (allowedSortFields.includes(sortBy)) {
      query.orderBy(`endpoint.${sortBy}`, order);
    } else {
      query.orderBy('endpoint.displayName', 'ASC');
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
  async findOne(tenantId: number, displayName: string): Promise<PsEndpoint> {
    const prefixedId = TenantPrefixUtil.addPrefix(tenantId, displayName);

    const endpoint = await this.endpointRepository.findOne({
      where: { id: prefixedId, tenantId },
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

    try {
      const status = await this.amiService.getEndpointStatus(endpoint.id);
      deviceState = status.deviceState || 'Unknown';
      activeChannels = status.activeChannels || 0;
    } catch (error) {
      this.logger.warn(
        `Failed to get AMI status for endpoint ${endpoint.id}: ${error.message}`,
      );
    }

    return {
      ...endpoint,
      deviceState,
      activeChannels,
    };
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
    const prefixedId = TenantPrefixUtil.addPrefix(tenantId, displayName);

    // Check if endpoint exists
    const endpoint = await this.findOne(tenantId, displayName);

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update endpoint
      if (dto.context !== undefined) endpoint.context = dto.context;
      if (dto.transport !== undefined) endpoint.transport = dto.transport;
      if (dto.codecs !== undefined) endpoint.allow = dto.codecs;
      if (dto.directMedia !== undefined) endpoint.directMedia = dto.directMedia;
      if (dto.dtmfMode !== undefined) endpoint.dtmfMode = dto.dtmfMode;
      if (dto.callerid !== undefined) endpoint.callerid = dto.callerid;
      if (dto.mailboxes !== undefined) endpoint.mailboxes = dto.mailboxes;

      await queryRunner.manager.save(endpoint);

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
    const prefixedId = TenantPrefixUtil.addPrefix(tenantId, displayName);

    // Check if endpoint exists
    const endpoint = await this.findOne(tenantId, displayName);

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
