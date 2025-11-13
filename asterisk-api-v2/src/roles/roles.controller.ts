import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role name or level already exists' })
  create(
    @CurrentTenant() tenantId: number,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    const finalTenantId = createRoleDto.tenantId || tenantId;
    return this.rolesService.create(finalTenantId, createRoleDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get all roles for tenant' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'tenantId', required: false, type: Number, description: 'Tenant ID (ADMIN only - optional)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  findAll(
    @CurrentTenant() userTenantId: number,
    @Query('activeOnly') activeOnly?: string,
    @Query('tenantId') queryTenantId?: string,
  ) {
    // ADMIN can specify tenant via query param, otherwise use their own tenant
    const tenantId = queryTenantId ? parseInt(queryTenantId, 10) : userTenantId;
    const active = activeOnly === 'true';
    return this.rolesService.findAll(tenantId, active);
  }

  // ========================================
  // Presets Management
  // ========================================

  @Post('presets')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new role preset (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Preset created successfully' })
  @ApiResponse({ status: 409, description: 'Preset ID already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  createPreset(@Body() createPresetDto: CreatePresetDto) {
    return this.rolesService.createPreset(createPresetDto);
  }

  @Get('presets/all')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all presets including inactive (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'All presets retrieved successfully' })
  getAllPresets() {
    return this.rolesService.getAllPresets();
  }

  @Get('presets')
  @ApiOperation({ summary: 'Get all active role presets' })
  @ApiResponse({ status: 200, description: 'Presets retrieved successfully' })
  getPresets() {
    return this.rolesService.getPresets();
  }

  @Get('presets/:presetId')
  @ApiOperation({ summary: 'Get a specific preset by preset ID' })
  @ApiResponse({ status: 200, description: 'Preset retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  getPreset(@Param('presetId') presetId: string) {
    return this.rolesService.getPreset(presetId);
  }

  @Put('presets/id/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a role preset (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Preset updated successfully' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  updatePreset(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePresetDto: UpdatePresetDto,
  ) {
    return this.rolesService.updatePreset(id, updatePresetDto);
  }

  @Delete('presets/id/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a role preset (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Preset deleted successfully' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  async deletePreset(@Param('id', ParseIntPipe) id: number) {
    await this.rolesService.deletePreset(id);
    return { message: 'Preset deleted successfully' };
  }

  @Post('presets/:id/apply')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Apply a preset to current tenant' })
  @ApiResponse({ status: 201, description: 'Preset applied successfully' })
  @ApiResponse({ status: 400, description: 'Tenant already has roles' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  applyPreset(
    @CurrentTenant() tenantId: number,
    @Param('id') presetId: string,
  ) {
    return this.rolesService.applyPreset(tenantId, presetId);
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get role statistics for tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@CurrentTenant() tenantId: number) {
    return this.rolesService.getStatistics(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Get a specific role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  findOne(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolesService.findOne(tenantId, id);
  }

  @Get(':id/callable-roles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Get roles that this role can call' })
  @ApiResponse({ status: 200, description: 'Callable roles retrieved successfully' })
  getCallableRoles(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolesService.getCallableRoles(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  update(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(tenantId, id, updateRoleDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Role is in use by endpoints' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  remove(
    @CurrentTenant() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.rolesService.remove(tenantId, id);
  }
}
