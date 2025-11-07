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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolePresetDto } from './dto/role-preset.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Roles Service
 *
 * Manages hierarchical roles for endpoints with call permissions.
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private readonly presetsPath = path.join(__dirname, 'presets');

  constructor(
    @InjectRepository(EndpointRole)
    private readonly roleRepository: Repository<EndpointRole>,
  ) {}

  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Create a new role
   */
  async create(tenantId: number, dto: CreateRoleDto): Promise<EndpointRole> {
    // Check if role name already exists for this tenant
    const existingName = await this.roleRepository.findOne({
      where: { tenantId, name: dto.name },
    });

    if (existingName) {
      throw new ConflictException(
        `Role with name '${dto.name}' already exists for this tenant`,
      );
    }

    // Check if level already exists for this tenant
    const existingLevel = await this.roleRepository.findOne({
      where: { tenantId, level: dto.level },
    });

    if (existingLevel) {
      throw new ConflictException(
        `Role with level ${dto.level} already exists for this tenant (${existingLevel.name})`,
      );
    }

    // Create the role
    const role = this.roleRepository.create({
      tenantId,
      ...dto,
    });

    const saved = await this.roleRepository.save(role);
    this.logger.log(`Created role ${saved.name} (level ${saved.level}) for tenant ${tenantId}`);

    return saved;
  }

  /**
   * Find all roles for a tenant
   */
  async findAll(tenantId: number, activeOnly = false): Promise<EndpointRole[]> {
    const where: any = { tenantId };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.roleRepository.find({
      where,
      order: { level: 'ASC' },
    });
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
    const endpointsCount = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('ps_endpoints', 'endpoint', 'endpoint.role_id = role.id')
      .where('role.id = :id', { id })
      .getCount();

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
   * Get all available presets
   */
  async getPresets(): Promise<RolePresetDto[]> {
    const presets: RolePresetDto[] = [];

    try {
      const files = fs.readdirSync(this.presetsPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.presetsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const preset = JSON.parse(content);
          presets.push(preset);
        }
      }
    } catch (error) {
      this.logger.error(`Error loading presets: ${error.message}`);
    }

    return presets;
  }

  /**
   * Get a specific preset by ID
   */
  async getPreset(presetId: string): Promise<RolePresetDto | null> {
    try {
      const filePath = path.join(this.presetsPath, `${presetId}.json`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Error loading preset ${presetId}: ${error.message}`);
      return null;
    }
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
}
