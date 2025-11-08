import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
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

import { ExtensionsService } from './extensions.service';
import { CreateExtensionDto } from './dto/create-extension.dto';
import { UpdateExtensionDto } from './dto/update-extension.dto';
import { ExtensionFilterDto } from './dto/extension-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Extensions Controller
 *
 * Manages dialplan extensions (Asterisk Realtime)
 *
 * Access Control:
 * - Create/Update/Delete: Admin or Tenant Admin
 * - Read: All authenticated users (with tenant isolation)
 *
 * Routes:
 * - GET /extensions - List all extensions (paginated, filtered)
 * - GET /extensions/contexts - List contexts
 * - GET /extensions/context/:context - Get extensions by context
 * - GET /extensions/:id - Get extension by ID
 * - POST /extensions - Create extension
 * - PUT /extensions/:id - Update extension
 * - DELETE /extensions/:id - Delete extension
 */
@ApiTags('Extensions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly extensionsService: ExtensionsService) {}

  /**
   * Create a new extension
   *
   * Access: Admin, Tenant Admin
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create a new dialplan extension',
    description:
      'Creates a new extension in the Asterisk Realtime dialplan. Context must belong to your tenant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Extension created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid extension data',
  })
  @ApiResponse({
    status: 403,
    description: 'Context does not belong to your tenant',
  })
  @ApiResponse({
    status: 409,
    description: 'Extension already exists',
  })
  async create(
    @CurrentTenant() tenantId: number,
    @Body() dto: CreateExtensionDto,
  ) {
    return await this.extensionsService.create(tenantId, dto);
  }

  /**
   * Get all extensions with filters
   *
   * Access: All authenticated users (tenant-isolated)
   */
  @Get()
  @ApiOperation({
    summary: 'List all extensions',
    description:
      'Returns paginated list of extensions with optional filters. Automatically filtered by tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Extensions retrieved successfully',
  })
  async findAll(
    @CurrentTenant() tenantId: number,
    @Query() filter: ExtensionFilterDto,
  ) {
    return await this.extensionsService.findAll(tenantId, filter);
  }

  /**
   * Get list of contexts
   *
   * Access: All authenticated users (tenant-isolated)
   */
  @Get('contexts')
  @ApiOperation({
    summary: 'List all contexts',
    description:
      'Returns list of unique context names for the tenant.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contexts retrieved successfully',
  })
  async getContexts(@CurrentTenant() tenantId: number) {
    return await this.extensionsService.getContexts(tenantId);
  }

  /**
   * Get extensions by context
   *
   * Access: All authenticated users (tenant-isolated)
   */
  @Get('context/:context')
  @ApiOperation({
    summary: 'Get extensions by context',
    description:
      'Returns all extensions for a specific context. Context must belong to your tenant.',
  })
  @ApiParam({
    name: 'context',
    description: 'Context name',
    example: 'company1',
  })
  @ApiResponse({
    status: 200,
    description: 'Extensions retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Context does not belong to your tenant',
  })
  async getByContext(
    @CurrentTenant() tenantId: number,
    @Param('context') context: string,
  ) {
    return await this.extensionsService.getByContext(tenantId, context);
  }

  /**
   * Get extension by ID
   *
   * Access: All authenticated users (tenant-isolated)
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get extension by ID',
    description: 'Returns a single extension by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Extension ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Extension retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Extension not found',
  })
  async findOne(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.extensionsService.findOne(tenantId, id);
  }

  /**
   * Update extension
   *
   * Access: Admin, Tenant Admin
   */
  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update an extension',
    description: 'Updates an existing extension. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Extension ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Extension updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Extension not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Context does not belong to your tenant',
  })
  @ApiResponse({
    status: 409,
    description: 'Update creates duplicate extension',
  })
  async update(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExtensionDto,
  ) {
    return await this.extensionsService.update(tenantId, id, dto);
  }

  /**
   * Delete extension
   *
   * Access: Admin, Tenant Admin
   */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an extension',
    description: 'Permanently deletes an extension.',
  })
  @ApiParam({
    name: 'id',
    description: 'Extension ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Extension deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Extension not found',
  })
  async remove(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.extensionsService.remove(tenantId, id);
  }
}
