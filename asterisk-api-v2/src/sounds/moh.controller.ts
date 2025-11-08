import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MohService } from './moh.service';
import { CreateMohClassDto } from './dto/create-moh-class.dto';
import { UpdateMohClassDto } from './dto/update-moh-class.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@ApiTags('Music on Hold')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moh')
export class MohController {
  constructor(private readonly mohService: MohService) {}

  /**
   * Create a new Music on Hold class
   */
  @Post('classes')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create MoH class',
    description: 'Create a new Music on Hold class configuration',
  })
  @ApiResponse({
    status: 201,
    description: 'MoH class created successfully',
    schema: {
      example: {
        id: 1,
        tenantId: 1,
        name: 'company_music',
        mode: 'files',
        directory: '/var/lib/asterisk/sounds/custom/t1/moh',
        format: 'wav',
        sort: 'random',
        description: 'Company background music',
        enabled: true,
        createdAt: '2025-11-08T10:00:00.000Z',
        updatedAt: '2025-11-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'MoH class already exists' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async create(
    @Body() dto: CreateMohClassDto,
    @CurrentUser('tenantId') userTenantId: number | null,
  ) {
    // For super admins (userTenantId = null), use tenantId from DTO
    // For tenant admins, use their tenantId
    const effectiveTenantId = userTenantId ?? dto.tenantId;

    if (!effectiveTenantId) {
      throw new Error('Tenant ID is required');
    }

    return this.mohService.create(dto, effectiveTenantId);
  }

  /**
   * Get all MoH classes
   */
  @Get('classes')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Get all MoH classes',
    description: 'Retrieve all Music on Hold classes for the tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'MoH classes retrieved successfully',
    schema: {
      example: [
        {
          id: 1,
          tenantId: 1,
          name: 'company_music',
          mode: 'files',
          directory: '/var/lib/asterisk/sounds/custom/t1/moh',
          format: 'wav',
          sort: 'random',
          description: 'Company background music',
          enabled: true,
          createdAt: '2025-11-08T10:00:00.000Z',
        },
      ],
    },
  })
  async findAll(
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    // SUPER_ADMIN can see all MoH classes
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    return this.mohService.findAll(filterTenantId);
  }

  /**
   * Get a single MoH class
   */
  @Get('classes/:name')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Get MoH class by name',
    description: 'Retrieve a specific Music on Hold class by its name',
  })
  @ApiParam({
    name: 'name',
    description: 'MoH class name',
    example: 'company_music',
  })
  @ApiResponse({
    status: 200,
    description: 'MoH class retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'MoH class not found' })
  async findOne(
    @Param('name') name: string,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    return this.mohService.findOne(name, filterTenantId);
  }

  /**
   * Update a MoH class
   */
  @Put('classes/:name')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Update MoH class',
    description: 'Update an existing Music on Hold class configuration',
  })
  @ApiParam({
    name: 'name',
    description: 'MoH class name',
    example: 'company_music',
  })
  @ApiResponse({
    status: 200,
    description: 'MoH class updated successfully',
  })
  @ApiResponse({ status: 404, description: 'MoH class not found' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  async update(
    @Param('name') name: string,
    @Body() dto: UpdateMohClassDto,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    return this.mohService.update(name, dto, filterTenantId);
  }

  /**
   * Delete a MoH class
   */
  @Delete('classes/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Delete MoH class',
    description: 'Delete a Music on Hold class from the system',
  })
  @ApiParam({
    name: 'name',
    description: 'MoH class name',
    example: 'company_music',
  })
  @ApiResponse({
    status: 204,
    description: 'MoH class deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'MoH class not found' })
  async remove(
    @Param('name') name: string,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    await this.mohService.remove(name, filterTenantId);
  }

  /**
   * Reload Music on Hold module
   */
  @Post('reload')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Reload MoH module',
    description: 'Force reload of the Music on Hold module in Asterisk',
  })
  @ApiResponse({
    status: 200,
    description: 'MoH module reloaded successfully',
    schema: {
      example: {
        message: 'Music on Hold module reloaded successfully',
      },
    },
  })
  async reload() {
    await this.mohService.reloadMoh();
    return {
      message: 'Music on Hold module reloaded successfully',
    };
  }

  /**
   * Get available MoH classes for queues
   */
  @Get('available')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get available MoH classes',
    description: 'Get all available Music on Hold classes that can be assigned to queues',
  })
  @ApiResponse({
    status: 200,
    description: 'Available MoH classes retrieved successfully',
    schema: {
      example: [
        {
          id: 1,
          name: 'company_music',
          fullName: 't1_company_music',
          description: 'Company background music',
          mode: 'files',
        },
      ],
    },
  })
  async getAvailable(@CurrentUser('tenantId') tenantId: number) {
    const mohClasses = await this.mohService.getAvailableForTenant(tenantId);
    return mohClasses.map(mohClass => ({
      id: mohClass.id,
      name: mohClass.name,
      fullName: `t${mohClass.tenantId}_${mohClass.name}`,
      description: mohClass.description,
      mode: mohClass.mode,
    }));
  }
}
