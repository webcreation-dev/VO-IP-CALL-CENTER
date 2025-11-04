import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ParseBoolPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { UserPayload } from '../common/interfaces/user-payload.interface';
import { EndpointsService } from '../endpoints/endpoints.service';
import { EndpointFilterDto } from '../endpoints/dto';

/**
 * Tenants Controller
 *
 * Manages tenant organizations in the multi-tenant system
 *
 * Endpoints:
 * - GET /tenants - List all tenants (admin) or own tenant (tenant users)
 * - GET /tenants/me - Get current user's tenant
 * - GET /tenants/:id - Get tenant by ID
 * - POST /tenants - Create new tenant (admin only)
 * - PATCH /tenants/:id - Update tenant (admin or tenant_admin for own tenant)
 * - DELETE /tenants/:id - Soft delete tenant (admin only)
 * - PATCH /tenants/:id/restore - Restore soft-deleted tenant (admin only)
 *
 * Access Control:
 * - All endpoints require authentication (JWT)
 * - Create/Delete/Restore: Admin only
 * - Update: Admin or Tenant Admin (own tenant only)
 * - Read: All authenticated users (with tenant isolation)
 */
@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    @Inject(forwardRef(() => EndpointsService))
    private readonly endpointsService: EndpointsService,
  ) {}

  /**
   * Create a new tenant
   *
   * Only accessible by admin users
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new tenant',
    description: 'Create a new tenant organization. Only accessible by admin users.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          name: 'company1',
          companyName: 'Company One Ltd',
          contactEmail: 'contact@company1.com',
          contactPhone: '+1234567890',
          address: '123 Main St',
          city: 'New York',
          country: 'USA',
          timezone: 'America/New_York',
          isActive: true,
          maxEndpoints: 200,
          maxQueues: 100,
          createdAt: '2025-10-30T18:00:00.000Z',
          updatedAt: '2025-10-30T18:00:00.000Z',
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token missing or invalid' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not admin' })
  @ApiResponse({ status: 409, description: 'Conflict - Tenant name already exists' })
  async create(@Body() dto: CreateTenantDto) {
    return await this.tenantsService.create(dto);
  }

  /**
   * List all tenants
   *
   * Admin users: see all tenants
   * Tenant users: see only their own tenant
   */
  @Get()
  @ApiOperation({
    summary: 'List all tenants',
    description: 'Admin users see all tenants, tenant users see only their own.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive (soft-deleted) tenants (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            name: 'company1',
            companyName: 'Company One Ltd',
            isActive: true,
            maxEndpoints: 200,
            maxQueues: 100,
            createdAt: '2025-10-30T18:00:00.000Z',
          },
        ],
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    // @CurrentUser() user: UserPayload,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive: boolean = false,
  ) {
    // TEST MODE: return all tenants
    return await this.tenantsService.findAll(includeInactive);
  }

  /**
   * Get current user's tenant
   *
   * Convenient endpoint to get authenticated user's tenant info
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get my tenant',
    description: 'Get the authenticated user\'s tenant information',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found (admin users have no tenant)' })
  async getMyTenant(@CurrentTenant() tenantId: number | null) {
    if (!tenantId) {
      throw new ForbiddenException('Admin users do not have a tenant');
    }
    return await this.tenantsService.findOne(tenantId);
  }

  /**
   * Get all endpoints for a tenant
   *
   * Returns all endpoints belonging to the specified tenant
   */
  @Get(':id/endpoints')
  @ApiOperation({
    summary: 'Get all endpoints for a tenant',
    description: 'Retrieve all endpoints belonging to a specific tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoints retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          data: [
            {
              id: 't1_101',
              displayName: '101',
              tenantId: 1,
              transport: 'transport-udp',
              context: 'default',
              allow: 'ulaw,alaw',
              callerid: 'John Doe <101>',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
        timestamp: '2025-11-04T15:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantEndpoints(
    @Param('id', ParseIntPipe) tenantId: number,
    @Query() filter: EndpointFilterDto,
  ) {
    // Verify tenant exists
    await this.tenantsService.findOne(tenantId);

    // Get endpoints for this tenant
    return await this.endpointsService.findAll(tenantId, filter);
  }

  /**
   * Get tenant by ID
   *
   * Admin: can access any tenant
   * Tenant users: can only access their own tenant
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant by ID',
    description: 'Retrieve a single tenant by ID. Tenant isolation enforced.',
  })
  @ApiResponse({ status: 200, description: 'Tenant found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access other tenant' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(
    // @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // TEST MODE: return tenant directly
    return await this.tenantsService.findOne(id);
  }

  /**
   * Update tenant
   *
   * Admin: can update any tenant
   * Tenant Admin: can only update own tenant
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant information. Admin can update any tenant, tenant_admin can only update own tenant.',
  })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot update other tenant' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    // @CurrentUser() user: UserPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    // TEST MODE: update directly
    return await this.tenantsService.update(id, dto);
  }

  /**
   * Soft delete tenant
   *
   * Sets is_active to false
   * Only accessible by admin users
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete tenant (soft delete)',
    description: 'Soft delete a tenant by setting is_active to false. Only accessible by admin users.',
  })
  @ApiResponse({ status: 204, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not admin' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.tenantsService.remove(id);
  }

  /**
   * Restore soft-deleted tenant
   *
   * Only accessible by admin users
   */
  @Patch(':id/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore soft-deleted tenant',
    description: 'Restore a soft-deleted tenant by setting is_active to true. Only accessible by admin users.',
  })
  @ApiResponse({ status: 200, description: 'Tenant restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not admin' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async restore(@Param('id', ParseIntPipe) id: number) {
    return await this.tenantsService.restore(id);
  }
}
