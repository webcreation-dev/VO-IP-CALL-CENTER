import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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

import { EndpointsService } from './endpoints.service';
import { CreateEndpointDto, UpdateEndpointDto, EndpointFilterDto } from './dto';

import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Endpoints Controller
 *
 * Manages PJSIP endpoints (SIP users/extensions) with multi-tenant support
 *
 * Endpoints:
 * - GET /endpoints - List all endpoints for tenant
 * - GET /endpoints/:username - Get endpoint details
 * - GET /endpoints/:username/status - Get endpoint with real-time AMI status
 * - POST /endpoints - Create new endpoint (admin or tenant_admin)
 * - PATCH /endpoints/:username - Update endpoint (admin or tenant_admin)
 * - DELETE /endpoints/:username - Delete endpoint (admin or tenant_admin)
 *
 * Access Control:
 * - All endpoints require authentication (JWT)
 * - Create/Update/Delete: Admin or Tenant Admin only
 * - Read: All authenticated users (with tenant isolation)
 *
 * Multi-Tenant:
 * - Automatic tenant prefixing (t{tenantId}_username)
 * - API always uses display names (username without prefix)
 * - Tenant isolation enforced via @CurrentTenant decorator
 */
@ApiTags('Endpoints')
@ApiBearerAuth()
@Controller('endpoints')
export class EndpointsController {
  constructor(private readonly endpointsService: EndpointsService) {}

  /**
   * Create a new endpoint
   *
   * Creates PJSIP endpoint with authentication and AoR configuration
   * Requires admin or tenant_admin role
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create new endpoint',
    description:
      'Create a new PJSIP endpoint. This creates 3 related entities atomically (endpoint, auth, aor). Only accessible by admin or tenant_admin users.',
  })
  @ApiResponse({
    status: 201,
    description: 'Endpoint created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 't1_101',
          displayName: '101',
          tenantId: 1,
          transport: 'transport-udp',
          context: 'default',
          allow: 'ulaw,alaw',
          callerid: 'John Doe <101>',
          createdAt: '2025-10-30T18:00:00.000Z',
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input or tenant limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 409, description: 'Endpoint already exists' })
  async create(
    @CurrentTenant() tenantId: number,
    @Body() dto: CreateEndpointDto,
  ) {
    return await this.endpointsService.create(tenantId, dto);
  }

  /**
   * List all endpoints for tenant
   */
  @Get()
  @ApiOperation({
    summary: 'List all endpoints',
    description:
      'Get all endpoints for the authenticated user\'s tenant. Admin users see all endpoints.',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoints retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 't1_101',
            displayName: '101',
            tenantId: 1,
            transport: 'transport-udp',
            context: 'default',
            allow: 'ulaw,alaw',
            callerid: 'John Doe <101>',
            createdAt: '2025-10-30T18:00:00.000Z',
          },
        ],
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentTenant() tenantId: number | null,
    @Query() filter: EndpointFilterDto,
  ) {
    return await this.endpointsService.findAll(tenantId, filter);
  }

  /**
   * Get endpoint by username (display name)
   */
  @Get(':username')
  @ApiOperation({
    summary: 'Get endpoint by username',
    description: 'Retrieve a single endpoint by username (without tenant prefix)',
  })
  @ApiParam({
    name: 'username',
    description: 'Endpoint username (without prefix)',
    example: '101',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async findOne(
    @CurrentTenant() tenantId: number,
    @Param('username') username: string,
  ) {
    return await this.endpointsService.findOne(tenantId, username);
  }

  /**
   * Get endpoint with real-time status from Asterisk AMI
   */
  @Get(':username/status')
  @ApiOperation({
    summary: 'Get endpoint with real-time status',
    description:
      'Get endpoint details with real-time device state and active channels from Asterisk AMI',
  })
  @ApiParam({
    name: 'username',
    description: 'Endpoint username',
    example: '101',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint with status retrieved',
    schema: {
      example: {
        success: true,
        data: {
          id: 't1_101',
          displayName: '101',
          tenantId: 1,
          transport: 'transport-udp',
          context: 'default',
          deviceState: 'Not in use',
          activeChannels: 0,
          createdAt: '2025-10-30T18:00:00.000Z',
        },
        timestamp: '2025-10-30T18:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async getStatus(
    @CurrentTenant() tenantId: number,
    @Param('username') username: string,
  ) {
    return await this.endpointsService.findOneWithStatus(tenantId, username);
  }

  /**
   * Update endpoint
   */
  @Patch(':username')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update endpoint',
    description:
      'Update endpoint configuration. This updates 3 related entities atomically. Only accessible by admin or tenant_admin users.',
  })
  @ApiParam({
    name: 'username',
    description: 'Endpoint username',
    example: '101',
  })
  @ApiResponse({ status: 200, description: 'Endpoint updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async update(
    @CurrentTenant() tenantId: number,
    @Param('username') username: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    return await this.endpointsService.update(tenantId, username, dto);
  }

  /**
   * Delete endpoint
   */
  @Delete(':username')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete endpoint',
    description:
      'Delete an endpoint. This deletes 3 related entities atomically. Only accessible by admin or tenant_admin users.',
  })
  @ApiParam({
    name: 'username',
    description: 'Endpoint username',
    example: '101',
  })
  @ApiResponse({ status: 204, description: 'Endpoint deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient role' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async remove(
    @CurrentTenant() tenantId: number,
    @Param('username') username: string,
  ) {
    await this.endpointsService.remove(tenantId, username);
  }
}
