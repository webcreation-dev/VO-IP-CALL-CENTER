// controllers/ivr-options.controller.ts (VERSION COMPLÈTE)
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  import { IvrService } from '../services/ivr.service';
  import { UpdateIvrOptionDto } from '../dto/update-ivr-option.dto';
  
  @ApiTags('IVR Options')
  // @ApiBearerAuth() // DÉSACTIVÉ POUR TESTS
  @Controller('ivr/options')
  export class IvrOptionsController {
    constructor(private ivrService: IvrService) {}
  
    @Get(':optionId')
    @ApiOperation({ summary: 'Récupérer une option par ID' })
    @ApiResponse({ status: 200, description: 'Option trouvée' })
    @ApiResponse({ status: 404, description: 'Option introuvable' })
    async findOne(
      @Query('tenantId') tenantId: number,
      @Param('optionId') optionId: string,
    ) {
      return this.ivrService.findOptionById(Number(optionId), tenantId);
    }
  
    @Patch(':optionId')
    @ApiOperation({ summary: 'Mettre à jour une option' })
    @ApiResponse({ status: 200, description: 'Option mise à jour' })
    @ApiResponse({ status: 404, description: 'Option introuvable' })
    @ApiResponse({ status: 409, description: 'Digit déjà utilisé' })
    async update(
      @Query('tenantId') tenantId: number,
      @Param('optionId') optionId: string,
      @Body() dto: UpdateIvrOptionDto,
    ) {
      return this.ivrService.updateOption(Number(optionId), tenantId, dto);
    }
  
    @Delete(':optionId')
    @ApiOperation({ summary: 'Supprimer une option' })
    @ApiResponse({ status: 200, description: 'Option supprimée' })
    @ApiResponse({ status: 404, description: 'Option introuvable' })
    async remove(
      @Query('tenantId') tenantId: number,
      @Param('optionId') optionId: string,
    ) {
      await this.ivrService.removeOption(Number(optionId), tenantId);
      return { message: 'Option supprimée avec succès' };
    }
  
    @Post(':optionId/toggle')
    @ApiOperation({ summary: 'Activer/désactiver une option' })
    @ApiResponse({ status: 200, description: 'État modifié' })
    async toggle(
      @Query('tenantId') tenantId: number,
      @Param('optionId') optionId: string,
    ) {
      return this.ivrService.toggleOption(Number(optionId), tenantId);
    }
  
    @Patch(':optionId/priority')
    @ApiOperation({ summary: 'Modifier la priorité d\'une option' })
    @ApiResponse({ status: 200, description: 'Priorité mise à jour' })
    async updatePriority(
      @Query('tenantId') tenantId: number,
      @Param('optionId') optionId: string,
      @Body() dto: { priority: number },
    ) {
      return this.ivrService.updateOption(Number(optionId), tenantId, {
        priority: dto.priority,
      });
    }
  
    @Post('validate-action')
    @ApiOperation({ summary: 'Valider une action avant de l\'enregistrer' })
    @ApiResponse({ status: 200, description: 'Action valide' })
    @ApiResponse({ status: 400, description: 'Action invalide' })
    async validateAction(
      @Query('tenantId') tenantId: number,
      @Body() action: any,
    ) {
      const isValid = await this.ivrService.validateAction(action, tenantId);
      
      if (!isValid) {
        return {
          valid: false,
          message: 'Action invalide : cible introuvable ou configuration incorrecte',
        };
      }
  
      return {
        valid: true,
        message: 'Action valide',
      };
    }
  }