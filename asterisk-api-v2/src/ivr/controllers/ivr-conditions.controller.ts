// controllers/ivr-conditions.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    NotFoundException,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  import { IvrService } from '../services/ivr.service';
  import { CreateIvrConditionDto } from '../dto/create-ivr-condition.dto';
  
  @ApiTags('IVR Conditions')
  // @ApiBearerAuth() // DÉSACTIVÉ POUR TESTS
  @Controller('ivr/conditions')
  export class IvrConditionsController {
    constructor(private ivrService: IvrService) {}
  
    @Get(':conditionId')
    @ApiOperation({ summary: 'Récupérer une condition par ID' })
    async findOne(
      @Query('tenantId') tenantId: number,
      @Param('conditionId') conditionId: string,
    ) {
      // Implémentation simplifiée
      return { message: 'Not implemented yet' };
    }
  
    @Patch(':conditionId')
    @ApiOperation({ summary: 'Mettre à jour une condition' })
    async update(
      @Query('tenantId') tenantId: number,
      @Param('conditionId') conditionId: string,
      @Body() dto: Partial<CreateIvrConditionDto>,
    ) {
      return this.ivrService.updateCondition(Number(conditionId), tenantId, dto);
    }
  
    @Delete(':conditionId')
    @ApiOperation({ summary: 'Supprimer une condition' })
    async remove(
      @Query('tenantId') tenantId: number,
      @Param('conditionId') conditionId: string,
    ) {
      await this.ivrService.removeCondition(Number(conditionId), tenantId);
      return { message: 'Condition supprimée avec succès' };
    }
  
    @Post(':conditionId/toggle')
    @ApiOperation({ summary: 'Activer/désactiver une condition' })
    async toggle(
      @Query('tenantId') tenantId: number,
      @Param('conditionId') conditionId: string,
    ) {
      const condition = await this.ivrService['conditionRepo'].findOne({
        where: { id: Number(conditionId), tenant_id: tenantId },
      });
  
      if (!condition) {
        throw new NotFoundException('Condition introuvable');
      }
  
      return this.ivrService.updateCondition(Number(conditionId), tenantId, {
        is_active: !condition.is_active,
      });
    }
  }