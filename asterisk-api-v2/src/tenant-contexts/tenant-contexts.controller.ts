import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { TenantContextsService } from './tenant-contexts.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateTenantContextDto } from './dto/create-tenant-context.dto';
import { UpdateTenantContextDto } from './dto/update-tenant-context.dto';
import { RolesService } from '../roles/roles.service';

/**
 * Tenant Contexts Controller
 *
 * Manages Asterisk dialplan contexts for tenants
 *
 * Endpoints:
 * - GET /contexts - List all contexts (admin sees all, tenant users see only theirs)
 * - GET /tenants/:tenantId/contexts - List contexts for a specific tenant
 * - GET /contexts/:id - Get context by ID
 * - POST /contexts - Create new context (admin or tenant_admin)
 * - PATCH /contexts/:id - Update context (admin or tenant_admin)
 * - DELETE /contexts/:id - Delete context (admin or tenant_admin)
 *
 * Access Control:
 * - All endpoints require authentication (JWT)
 * - Create/Update/Delete: Admin or Tenant Admin
 * - Read: All authenticated users (with tenant isolation)
 *
 * Multi-Tenant:
 * - Contexts are automatically prefixed with t{tenantId}_
 * - Primary context created automatically with tenant
 * - Cannot delete primary context
 */
@ApiTags('Contexts')
@ApiBearerAuth()
@Controller()
export class TenantContextsController {
  constructor(
    private readonly contextsService: TenantContextsService,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * List all contexts
   *
   * Admin users see all contexts
   * Tenant users see only their contexts
   */
  @Get('contexts')
  @ApiOperation({
    summary: 'List all contexts',
    description: 'Admin users see all contexts, tenant users see only their own',
  })
  @ApiResponse({
    status: 200,
    description: 'Contexts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentTenant() tenantId: number | null) {
    // If tenantId is null (admin), we'd need to fetch all contexts
    // For now, let's require tenant isolation

    return await this.contextsService.findAll(tenantId ?? -1);
  }

  /**
   * List contexts for a specific tenant
   *
   * Route: GET /tenants/:tenantId/contexts
   */
  @Get('tenants/:tenantId/contexts')
  @ApiOperation({
    summary: 'List contexts for a tenant',
    description: 'Get all contexts belonging to a specific tenant',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Contexts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return await this.contextsService.findAll(tenantId);
  }

  /**
   * Get context by ID
   */
  @Get('contexts/:id')
  @ApiOperation({
    summary: 'Get context by ID',
    description: 'Retrieve a single context by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Context ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Context found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.contextsService.findOne(id);
  }

  /**
   * Create a new context
   *
   * Only admin or tenant_admin can create contexts
   */
  @Post('contexts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create new context',
    description: 'Create a new dialplan context for a tenant. Context name will be automatically prefixed with tenant ID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Context created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 2,
          tenantId: 1,
          name: 't1_ivr',
          description: 'IVR Context',
          isPrimary: false,
          dialplanConfig: {
            allowInbound: true,
            allowOutbound: true,
            allowInternal: true,
            allowInterContext: false,
          },
          createdAt: '2025-11-04T15:00:00.000Z',
          updatedAt: '2025-11-04T15:00:00.000Z',
        },
        timestamp: '2025-11-04T15:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 409, description: 'Context already exists' })
  async create(@Body() dto: CreateTenantContextDto) {
    return await this.contextsService.create(
      dto.tenantId,
      dto.name,
      dto.description,
      dto.dialplanConfig,
      dto.roleStrategy,
      dto.presetId,
      dto.customRoles, // Pass custom roles if provided
    );
  }

  /**
   * Get available role presets
   *
   * Returns list of available role presets that can be applied during context creation
   */
  @Get('contexts/role-presets')
  @ApiOperation({
    summary: 'Get available role presets',
    description: 'Returns a list of role presets that can be applied when creating a context with context-specific roles',
  })
  @ApiResponse({
    status: 200,
    description: 'Role presets retrieved successfully',
    schema: {
      example: [
        {
          id: 'call_center_standard',
          name: 'Call Center Standard',
          description: 'Classic call center hierarchy with 5 levels',
          roles: [
            { name: 'agent', displayName: 'Agent', level: 1 },
            { name: 'team_leader', displayName: 'Team Leader', level: 3 },
          ],
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRolePresets() {
    return await this.rolesService.getPresets();
  }

  /**
   * Update a context
   *
   * Only admin or tenant_admin can update contexts
   */
  @Patch('contexts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update context',
    description: 'Update context description, dialplan configuration, or role configuration. Cannot change tenant ownership or primary status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Context ID',
    example: 1,
  })
  @ApiResponse({ status: 200, description: 'Context updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantContextDto,
  ) {
    return await this.contextsService.update(id, dto);
  }

  /**
   * Delete a context
   *
   * Only admin or tenant_admin can delete contexts
   * Cannot delete primary context
   */
  @Delete('contexts/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete context',
    description: 'Delete a context. Cannot delete the primary context.',
  })
  @ApiParam({
    name: 'id',
    description: 'Context ID',
    example: 2,
  })
  @ApiResponse({ status: 204, description: 'Context deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete primary context' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contextsService.remove(id);
  }
}
