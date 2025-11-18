import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointRole } from './entities/endpoint-role.entity';
import { RolePreset } from './entities/role-preset.entity';
import { RolePresetRole } from './entities/role-preset-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolePresetDto } from './dto/role-preset.dto';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';
import { CustomRoleDto } from './dto/custom-role.dto';

/**
 * Roles Service
 *
 * Manages hierarchical roles for endpoints with call permissions.
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(EndpointRole)
    private readonly roleRepository: Repository<EndpointRole>,
    @InjectRepository(RolePreset)
    private readonly presetRepository: Repository<RolePreset>,
    @InjectRepository(RolePresetRole)
    private readonly presetRoleRepository: Repository<RolePresetRole>,
  ) {}

  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Create a new role
   * @param tenantId - Tenant ID
   * @param dto - Role data
   * @param contextId - Optional context ID (null = tenant-wide, number = context-specific)
   */
  async create(
    tenantId: number,
    dto: CreateRoleDto,
    contextId: number | null = null,
  ): Promise<EndpointRole> {
    // Check if role name already exists for this tenant/context combination
    const nameWhere: any = { tenantId, name: dto.name };
    if (contextId !== null) {
      nameWhere.contextId = contextId;
    } else {
      nameWhere.contextId = null;
    }

    const existingName = await this.roleRepository.findOne({
      where: nameWhere,
    });

    if (existingName) {
      const scope = contextId !== null ? `context ${contextId}` : 'tenant';
      throw new ConflictException(
        `Role with name '${dto.name}' already exists for this ${scope}`,
      );
    }

    // Check if level already exists for this tenant/context combination
    const levelWhere: any = { tenantId, level: dto.level };
    if (contextId !== null) {
      levelWhere.contextId = contextId;
    } else {
      levelWhere.contextId = null;
    }

    const existingLevel = await this.roleRepository.findOne({
      where: levelWhere,
    });

    if (existingLevel) {
      const scope = contextId !== null ? `context ${contextId}` : 'tenant';
      throw new ConflictException(
        `Role with level ${dto.level} already exists for this ${scope} (${existingLevel.name})`,
      );
    }

    // Create the role
    const role = this.roleRepository.create({
      tenantId,
      contextId,
      ...dto,
    });

    const saved = await this.roleRepository.save(role);
    const scopeMsg = contextId !== null ? `context ${contextId}` : 'tenant-wide';
    this.logger.log(
      `Created role ${saved.name} (level ${saved.level}) for tenant ${tenantId} (${scopeMsg})`,
    );

    return saved;
  }

  /**
   * Find all roles for a tenant
   * @param tenantId - Tenant ID
   * @param activeOnly - Only return active roles
   * @param contextId - Optional: filter by context (undefined = all, null = tenant-wide only, number = context-specific + tenant-wide)
   */
  async findAll(
    tenantId: number,
    activeOnly = false,
    contextId?: number | null,
  ): Promise<EndpointRole[]> {
    const query = this.roleRepository
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId });

    if (activeOnly) {
      query.andWhere('role.isActive = :isActive', { isActive: true });
    }

    // Handle context filtering
    if (contextId !== undefined) {
      if (contextId === null) {
        // Only tenant-wide roles
        query.andWhere('role.contextId IS NULL');
      } else {
        // Context-specific roles + tenant-wide roles (both can be used in this context)
        query.andWhere(
          '(role.contextId = :contextId OR role.contextId IS NULL)',
          { contextId },
        );
      }
    }

    query.orderBy('role.level', 'ASC');

    return query.getMany();
  }

  /**
   * Find one role by ID
   */
  async findOne(tenantId: number, id: number): Promise<EndpointRole> {
    const role = await this.roleRepository.findOne({
      where: { id, tenantId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Find role by name
   */
  async findByName(tenantId: number, name: string): Promise<EndpointRole | null> {
    return this.roleRepository.findOne({
      where: { tenantId, name },
    });
  }

  /**
   * Find role by level
   */
  async findByLevel(tenantId: number, level: number): Promise<EndpointRole | null> {
    return this.roleRepository.findOne({
      where: { tenantId, level },
    });
  }

  /**
   * Find context-specific roles only (excludes tenant-wide roles)
   * @param tenantId - Tenant ID
   * @param contextId - Context ID
   * @param activeOnly - Only return active roles
   * @returns Array of context-specific roles
   */
  async findContextSpecificRoles(
    tenantId: number,
    contextId: number,
    activeOnly = false,
  ): Promise<EndpointRole[]> {
    const query = this.roleRepository
      .createQueryBuilder('role')
      .where('role.tenantId = :tenantId', { tenantId })
      .andWhere('role.contextId = :contextId', { contextId });

    if (activeOnly) {
      query.andWhere('role.isActive = :isActive', { isActive: true });
    }

    query.orderBy('role.level', 'ASC');

    return query.getMany();
  }

  /**
   * Update a role
   */
  async update(
    tenantId: number,
    id: number,
    dto: UpdateRoleDto,
  ): Promise<EndpointRole> {
    const role = await this.findOne(tenantId, id);

    // Update fields
    Object.assign(role, dto);

    const updated = await this.roleRepository.save(role);
    this.logger.log(`Updated role ${updated.name} (ID ${id}) for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Delete a role
   */
  async remove(tenantId: number, id: number): Promise<void> {
    const role = await this.findOne(tenantId, id);

    // Check if any endpoints are using this role
    const result = await this.roleRepository.manager.query(
      'SELECT COUNT(*) as count FROM ps_endpoints WHERE role_id = $1',
      [id],
    );
    const endpointsCount = parseInt(result[0]?.count || '0', 10);

    if (endpointsCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${endpointsCount} endpoint(s) are using it`,
      );
    }

    await this.roleRepository.remove(role);
    this.logger.log(`Deleted role ${role.name} (ID ${id}) for tenant ${tenantId}`);
  }

  // ========================================
  // Presets Management
  // ========================================

  /**
   * Get all available presets (from database)
   * Returns only active presets
   */
  async getPresets(): Promise<RolePresetDto[]> {
    const presets = await this.presetRepository.find({
      where: { isActive: true },
      relations: ['roles'],
      order: { name: 'ASC' },
    });

    return presets.map((preset) => this.mapPresetToDto(preset));
  }

  /**
   * Get all presets including inactive ones (ADMIN only)
   */
  async getAllPresets(): Promise<RolePresetDto[]> {
    const presets = await this.presetRepository.find({
      relations: ['roles'],
      order: { name: 'ASC' },
    });

    return presets.map((preset) => this.mapPresetToDto(preset));
  }

  /**
   * Get a specific preset by presetId string
   */
  async getPreset(presetId: string): Promise<RolePresetDto | null> {
    const preset = await this.presetRepository.findOne({
      where: { presetId },
      relations: ['roles'],
    });

    if (!preset) {
      return null;
    }

    return this.mapPresetToDto(preset);
  }

  /**
   * Get a preset by numeric ID
   */
  async getPresetById(id: number): Promise<RolePreset> {
    const preset = await this.presetRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!preset) {
      throw new NotFoundException(`Preset with ID ${id} not found`);
    }

    return preset;
  }

  /**
   * Create a new preset (ADMIN only)
   */
  async createPreset(dto: CreatePresetDto): Promise<RolePreset> {
    // Check if presetId already exists
    const existing = await this.presetRepository.findOne({
      where: { presetId: dto.presetId },
    });

    if (existing) {
      throw new ConflictException(`Preset with ID '${dto.presetId}' already exists`);
    }

    // Validate unique role names and levels
    this.validateRoles(dto.roles);

    // Create preset with roles
    const preset = this.presetRepository.create({
      presetId: dto.presetId,
      name: dto.name,
      description: dto.description,
      roles: dto.roles.map((roleDto, index) => ({
        name: roleDto.name,
        displayName: roleDto.displayName,
        description: roleDto.description,
        level: roleDto.level,
        canCallSameLevel: roleDto.canCallSameLevel,
        canCallLowerLevel: roleDto.canCallLowerLevel,
        canCallHigherLevel: roleDto.canCallHigherLevel,
        sortOrder: index,
      })),
    });

    const saved = await this.presetRepository.save(preset);
    this.logger.log(`Created preset '${saved.name}' (ID: ${saved.presetId})`);

    return saved;
  }

  /**
   * Update an existing preset (ADMIN only)
   */
  async updatePreset(id: number, dto: UpdatePresetDto): Promise<RolePreset> {
    const preset = await this.getPresetById(id);

    // Update basic fields
    if (dto.name !== undefined) {
      preset.name = dto.name;
    }

    if (dto.description !== undefined) {
      preset.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      preset.isActive = dto.isActive;
    }

    // Update roles if provided
    if (dto.roles) {
      // Validate unique role names and levels
      this.validateRoles(dto.roles);

      // Delete existing roles and create new ones
      await this.presetRoleRepository.delete({ presetId: preset.id });

      preset.roles = dto.roles.map((roleDto, index) =>
        this.presetRoleRepository.create({
          presetId: preset.id,
          name: roleDto.name,
          displayName: roleDto.displayName,
          description: roleDto.description,
          level: roleDto.level,
          canCallSameLevel: roleDto.canCallSameLevel,
          canCallLowerLevel: roleDto.canCallLowerLevel,
          canCallHigherLevel: roleDto.canCallHigherLevel,
          sortOrder: index,
        }),
      );
    }

    const saved = await this.presetRepository.save(preset);
    this.logger.log(`Updated preset '${saved.name}' (ID: ${saved.presetId})`);

    return saved;
  }

  /**
   * Delete a preset (ADMIN only)
   */
  async deletePreset(id: number): Promise<void> {
    const preset = await this.getPresetById(id);

    await this.presetRepository.remove(preset);
    this.logger.log(`Deleted preset '${preset.name}' (ID: ${preset.presetId})`);
  }

  /**
   * Apply a preset to a tenant (creates all roles from preset)
   */
  async applyPreset(tenantId: number, presetId: string): Promise<EndpointRole[]> {
    const preset = await this.getPreset(presetId);

    if (!preset) {
      throw new NotFoundException(`Preset '${presetId}' not found`);
    }

    // Check if tenant already has roles
    const existingRoles = await this.findAll(tenantId);
    if (existingRoles.length > 0) {
      throw new BadRequestException(
        `Tenant already has ${existingRoles.length} role(s). Delete existing roles first or create roles manually.`,
      );
    }

    // Create all roles from preset
    const createdRoles: EndpointRole[] = [];

    for (const roleData of preset.roles) {
      try {
        const role = await this.create(tenantId, roleData);
        createdRoles.push(role);
      } catch (error) {
        this.logger.error(
          `Error creating role ${roleData.name} from preset: ${error.message}`,
        );
        // Continue with other roles
      }
    }

    this.logger.log(
      `Applied preset '${presetId}' to tenant ${tenantId}: created ${createdRoles.length} roles`,
    );

    return createdRoles;
  }

  /**
   * Apply a preset to a specific context (creates context-specific roles)
   * @param tenantId - Tenant ID
   * @param contextId - Context ID
   * @param presetId - Preset identifier
   * @param customRoles - Optional custom roles (overrides preset roles)
   */
  async applyPresetToContext(
    tenantId: number,
    contextId: number,
    presetId: string,
    customRoles?: CustomRoleDto[],
  ): Promise<EndpointRole[]> {
    const preset = await this.getPreset(presetId);

    if (!preset) {
      throw new NotFoundException(`Preset '${presetId}' not found`);
    }

    // Check if context already has context-specific roles
    const existingRoles = await this.roleRepository.count({
      where: { tenantId, contextId },
    });

    if (existingRoles > 0) {
      throw new BadRequestException(
        `Context ${contextId} already has ${existingRoles} context-specific role(s). Delete them first or create roles manually.`,
      );
    }

    // Use custom roles if provided, otherwise use preset roles
    const rolesToCreate = customRoles || preset.roles;

    // Create all roles for this context
    const createdRoles: EndpointRole[] = [];

    for (const roleData of rolesToCreate) {
      try {
        const role = await this.create(tenantId, roleData, contextId);
        createdRoles.push(role);
      } catch (error) {
        this.logger.error(
          `Error creating role ${roleData.name} from preset for context ${contextId}: ${error.message}`,
        );
        // Continue with other roles
      }
    }

    const customLabel = customRoles ? ' (with customizations)' : '';
    this.logger.log(
      `Applied preset '${presetId}'${customLabel} to context ${contextId} (tenant ${tenantId}): created ${createdRoles.length} roles`,
    );

    return createdRoles;
  }

  /**
   * Delete all context-specific roles for a given context
   * @param tenantId - Tenant ID
   * @param contextId - Context ID
   */
  async deleteContextRoles(tenantId: number, contextId: number): Promise<void> {
    const roles = await this.roleRepository.find({
      where: { tenantId, contextId },
    });

    if (roles.length === 0) {
      this.logger.log(
        `No context-specific roles to delete for context ${contextId} (tenant ${tenantId})`,
      );
      return;
    }

    // Check if any endpoints are using these roles
    for (const role of roles) {
      const endpointsCount = await this.roleRepository
        .createQueryBuilder('role')
        .leftJoin('ps_endpoints', 'endpoint', 'endpoint.role_id = role.id')
        .where('role.id = :id', { id: role.id })
        .getCount();

      if (endpointsCount > 0) {
        throw new BadRequestException(
          `Cannot delete context roles because role '${role.name}' is used by ${endpointsCount} endpoint(s)`,
        );
      }
    }

    // Delete all context-specific roles
    await this.roleRepository.remove(roles);

    this.logger.log(
      `Deleted ${roles.length} context-specific role(s) for context ${contextId} (tenant ${tenantId})`,
    );
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Check if a call from one role to another is allowed
   */
  canCall(fromRole: EndpointRole, toRole: EndpointRole): boolean {
    if (fromRole.level === toRole.level) {
      return fromRole.canCallSameLevel;
    }

    if (fromRole.level > toRole.level) {
      return fromRole.canCallLowerLevel;
    }

    return fromRole.canCallHigherLevel;
  }

  /**
   * Get roles that a specific role can call
   */
  async getCallableRoles(
    tenantId: number,
    roleId: number,
  ): Promise<EndpointRole[]> {
    const role = await this.findOne(tenantId, roleId);
    const allRoles = await this.findAll(tenantId, true);

    return allRoles.filter((targetRole) =>
      targetRole.id !== roleId && this.canCall(role, targetRole),
    );
  }

  /**
   * Get role statistics for a tenant
   */
  async getStatistics(tenantId: number): Promise<{
    totalRoles: number;
    activeRoles: number;
    inactiveRoles: number;
    levelDistribution: Record<number, number>;
  }> {
    const allRoles = await this.findAll(tenantId);

    const stats = {
      totalRoles: allRoles.length,
      activeRoles: allRoles.filter((r) => r.isActive).length,
      inactiveRoles: allRoles.filter((r) => !r.isActive).length,
      levelDistribution: {} as Record<number, number>,
    };

    // Count roles per level
    for (const role of allRoles) {
      stats.levelDistribution[role.level] =
        (stats.levelDistribution[role.level] || 0) + 1;
    }

    return stats;
  }

  /**
   * Validate roles array for uniqueness of names and levels
   * @private
   */
  private validateRoles(roles: Array<{ name: string; level: number }>): void {
    // Check unique names
    const names = roles.map((r) => r.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new BadRequestException('Role names must be unique within a preset');
    }

    // Check unique levels
    const levels = roles.map((r) => r.level);
    const uniqueLevels = new Set(levels);
    if (levels.length !== uniqueLevels.size) {
      throw new BadRequestException('Role levels must be unique within a preset');
    }

    // Check level range (1-10)
    for (const role of roles) {
      if (role.level < 1 || role.level > 10) {
        throw new BadRequestException(
          `Role level must be between 1 and 10, got ${role.level} for role '${role.name}'`,
        );
      }
    }
  }

  /**
   * Map RolePreset entity to RolePresetDto
   * @private
   */
  private mapPresetToDto(preset: RolePreset): RolePresetDto {
    return {
      id: preset.presetId,
      name: preset.name,
      description: preset.description,
      roles: preset.roles
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((role) => ({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          level: role.level,
          canCallSameLevel: role.canCallSameLevel,
          canCallLowerLevel: role.canCallLowerLevel,
          canCallHigherLevel: role.canCallHigherLevel,
        })),
    };
  }
}
