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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IvrService } from '../services/ivr.service';
import { CreateIvrMenuDto } from '../dto/create-ivr-menu.dto';
import { UpdateIvrMenuDto } from '../dto/update-ivr-menu.dto';
import { CreateIvrOptionDto } from '../dto/create-ivr-option.dto';
import { UpdateIvrOptionDto } from '../dto/update-ivr-option.dto';
import { CreateIvrConditionDto } from '../dto/create-ivr-condition.dto';
import { ReorderOptionsDto } from '../dto/reorder-options.dto';
import { ActionConfigDto } from '../dto/action-config.dto';

@ApiTags('IVR Menus')
@ApiBearerAuth()
@Controller('ivr/menus')
export class IvrMenusController {
  constructor(private ivrService: IvrService) {}

  @Post()
  async create(@Query('tenantId') tenantId: number, @Body() dto: CreateIvrMenuDto) {
    return this.ivrService.createMenu(tenantId, dto);
  }

  @Get()
  async findAll(@Query('tenantId') tenantId: number) {
    return this.ivrService.findAllMenus(tenantId);
  }

  @Get(':id')
  async findOne(@Query('tenantId') tenantId: number, @Param('id') id: string) {
    return this.ivrService.findMenuById(Number(id), tenantId);
  }

  @Patch(':id')
  async update(
    @Query('tenantId') tenantId: number,
    @Param('id') id: string,
    @Body() dto: UpdateIvrMenuDto,
  ) {
    return this.ivrService.updateMenu(Number(id), tenantId, dto);
  }

  @Delete(':id')
  async remove(@Query('tenantId') tenantId: number, @Param('id') id: string) {
    return this.ivrService.removeMenu(Number(id), tenantId);
  }

  // Gestion des options
  @Post(':menuId/options')
  async addOption(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Body() dto: CreateIvrOptionDto,
  ) {
    return this.ivrService.addOption(Number(menuId), tenantId, dto);
  }

  @Get(':menuId/options')
  async getOptions(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
  ) {
    return this.ivrService.findOptionsByMenu(Number(menuId), tenantId);
  }

  @Patch(':menuId/options/:optionId')
  async updateOption(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateIvrOptionDto,
  ) {
    return this.ivrService.updateOption(Number(optionId), tenantId, dto);
  }

  @Delete(':menuId/options/:optionId')
  async removeOption(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.ivrService.removeOption(Number(optionId), tenantId);
  }

  // Gestion des conditions
  @Post(':menuId/conditions')
  async addCondition(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Body() dto: CreateIvrConditionDto,
  ) {
    return this.ivrService.addCondition(Number(menuId), tenantId, dto);
  }

  @Get(':menuId/conditions')
  async getConditions(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
  ) {
    return this.ivrService.findConditionsByMenu(Number(menuId), tenantId);
  }

  // Test d'un menu IVR
  @Post(':menuId/test')
  async testMenu(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Body() testData: { callerId?: string; did?: string; datetime?: string },
  ) {
    return this.ivrService.testMenuConfiguration(Number(menuId), tenantId, testData);
  }

  // Dupliquer un menu
  @Post(':menuId/duplicate')
  async duplicateMenu(
    @Query('tenantId') tenantId: number,
    @Param('menuId') menuId: string,
    @Body() dto: { name: string },
  ) {
    return this.ivrService.duplicateMenu(Number(menuId), tenantId, dto.name);
  }

  // Ajouter dans ivr-menus.controller.ts

@Post(':menuId/options/reorder')
@ApiOperation({ summary: 'Réorganiser l\'ordre des options d\'un menu' })
@ApiResponse({ status: 200, description: 'Options réorganisées' })
async reorderOptions(
  @Query('tenantId') tenantId: number,
  @Param('menuId') menuId: string,
  @Body() dto: ReorderOptionsDto,
) {
  return this.ivrService.reorderOptions(Number(menuId), tenantId, dto.order);
}

@Post(':menuId/validate')
@ApiOperation({ summary: 'Valider la configuration complète d\'un menu' })
@ApiResponse({ status: 200, description: 'Validation effectuée' })
async validateMenu(
  @Query('tenantId') tenantId: number,
  @Param('menuId') menuId: string,
) {
  const menu = await this.ivrService.findMenuById(Number(menuId), tenantId);
  const options = await this.ivrService.findOptionsByMenu(Number(menuId), tenantId);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier qu'il y a au moins une option active
  const activeOptions = options.filter((opt) => opt.is_active);
  if (activeOptions.length === 0) {
    errors.push('Aucune option active dans ce menu');
  }

  // Vérifier que tous les fichiers audio existent
  const audioFiles = [
    menu.welcome_sound,
    menu.invalid_sound,
    menu.timeout_sound,
  ].filter(Boolean);

  // TODO: Vérifier l'existence réelle des fichiers via IvrAudioService

  // Vérifier que toutes les actions sont valides
  for (const option of options) {
    const isValid = await this.ivrService.validateAction(
      option.action,
      tenantId,
    );
    if (!isValid) {
      errors.push(
        `Option "${option.digit}" : action invalide (${option.action.type})`,
      );
    }
  }

  // Vérifier les actions par défaut
  const defaultActions = [menu.timeout_action, menu.invalid_action];
  for (const action of defaultActions) {
    const isValid = await this.ivrService.validateAction(action, tenantId);
    if (!isValid) {
      warnings.push(`Action par défaut invalide : ${action.type}`);
    }
  }

  // Vérifier les boucles infinies dans les sous-menus
  // TODO: Implémenter la détection de cycles

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      total_options: options.length,
      active_options: activeOptions.length,
      inactive_options: options.length - activeOptions.length,
    },
  };
}

@Get(':menuId/export')
@ApiOperation({ summary: 'Exporter la configuration d\'un menu en JSON' })
@ApiResponse({ status: 200, description: 'Configuration exportée' })
async exportMenu(
  @Query('tenantId') tenantId: number,
  @Param('menuId') menuId: string,
) {
  const menu = await this.ivrService.findMenuById(Number(menuId), tenantId);
  const options = await this.ivrService.findOptionsByMenu(Number(menuId), tenantId);
  const conditions = await this.ivrService.findConditionsByMenu(Number(menuId), tenantId);

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    menu: {
      name: menu.name,
      description: menu.description,
      welcome_sound: menu.welcome_sound,
      invalid_sound: menu.invalid_sound,
      timeout_sound: menu.timeout_sound,
      timeout: menu.timeout,
      max_retries: menu.max_retries,
      max_digits: menu.max_digits,
      timeout_action: menu.timeout_action,
      invalid_action: menu.invalid_action,
    },
    options: options.map((opt) => ({
      digit: opt.digit,
      description: opt.description,
      action: opt.action,
      priority: opt.priority,
      is_active: opt.is_active,
    })),
    conditions: conditions.map((cond) => ({
      condition_type: cond.condition_type,
      condition_config: cond.condition_config,
      action: cond.action,
      priority: cond.priority,
      is_active: cond.is_active,
    })),
  };
}

@Post('import')
@ApiOperation({ summary: 'Importer une configuration de menu depuis JSON' })
@ApiResponse({ status: 201, description: 'Menu importé avec succès' })
async importMenu(
  @Query('tenantId') tenantId: number,
  @Body() config: any,
) {
  // Créer le menu
  const menu = await this.ivrService.createMenu(tenantId, config.menu);

  // Créer les options
  for (const option of config.options || []) {
    await this.ivrService.addOption(Number(menu.id), tenantId, option);
  }

  // Créer les conditions
  for (const condition of config.conditions || []) {
    await this.ivrService.addCondition(Number(menu.id), tenantId, condition);
  }

  return this.ivrService.findMenuById(Number(menu.id), tenantId);
}

@Post(':menuId/clone-to-tenant')
@ApiOperation({
  summary: 'Cloner un menu vers un autre tenant (admin uniquement)',
})
@ApiResponse({ status: 201, description: 'Menu cloné avec succès' })
async cloneToTenant(
  @Query('tenantId') sourceTenantId: number,
  @Param('menuId') menuId: string,
  @Body() dto: { target_tenant_id: number; new_name: string },
) {
  // TODO: Vérifier les permissions (admin seulement)
  
  const sourceMenu = await this.ivrService.findMenuById(Number(menuId), sourceTenantId);
  const options = await this.ivrService.findOptionsByMenu(Number(menuId), sourceTenantId);
  const conditions = await this.ivrService.findConditionsByMenu(Number(menuId), sourceTenantId);

  // Créer le menu dans le tenant cible
  const newMenu = await this.ivrService.createMenu(dto.target_tenant_id, {
    name: dto.new_name,
    description: sourceMenu.description,
    welcome_sound: sourceMenu.welcome_sound,
    invalid_sound: sourceMenu.invalid_sound,
    timeout_sound: sourceMenu.timeout_sound,
    timeout: sourceMenu.timeout,
    max_retries: sourceMenu.max_retries,
    max_digits: sourceMenu.max_digits,
    timeout_action: sourceMenu.timeout_action as ActionConfigDto,
    invalid_action: sourceMenu.invalid_action as ActionConfigDto,
  });

  // Cloner les options
  for (const option of options) {
    await this.ivrService.addOption(Number(newMenu.id), dto.target_tenant_id, {
      digit: option.digit,
      description: option.description,
      action: option.action as ActionConfigDto,
      priority: option.priority,
      is_active: option.is_active,
    });
  }

  // Cloner les conditions
  for (const condition of conditions) {
    await this.ivrService.addCondition(Number(newMenu.id), dto.target_tenant_id, {
      condition_type: condition.condition_type as any,
      condition_config: condition.condition_config,
      action: condition.action as any,
      priority: condition.priority,
      is_active: condition.is_active,
    });                                                                                                             
  }

  return this.ivrService.findMenuById(Number(newMenu.id), dto.target_tenant_id);
}
}