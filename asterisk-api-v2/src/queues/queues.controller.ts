import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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

import { QueuesService } from './queues.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrichedQueueDto } from './dto/enriched-queue.dto';
import { GlobalQueueStatsDto } from './dto/global-stats.dto';
import { QueueDetailsDto } from './dto/queue-details.dto';
import { QueueCallsDto } from './dto/queue-calls.dto';
import { QueueReloadResultDto } from './dto/queue-reload.dto';

@ApiTags('Queues')
@ApiBearerAuth()
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create new queue' })
  @ApiResponse({ status: 201, description: 'Queue created successfully' })
  async create(
    // @CurrentTenant() tenantId: number,
    @Body() dto: CreateQueueDto,
  ) {
    // TEST MODE: use tenantId from DTO or default 1
    const tenantId = dto.tenantId || 1;
    return await this.queuesService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all queues' })
  @ApiResponse({ status: 200, description: 'Queues retrieved successfully' })
  async findAll(/* @CurrentTenant() tenantId: number | null */) {
    // TEST MODE: return all queues
    return await this.queuesService.findAll(null);
  }

  // ========================================
  // NEW ENRICHED APIs
  // ========================================

  @Get('enriched')
  @ApiOperation({ summary: 'Get all queues with full AMI enrichment' })
  @ApiResponse({
    status: 200,
    description: 'Enriched queues retrieved successfully',
    type: [EnrichedQueueDto],
  })
  async getAllEnriched(/* @CurrentTenant() tenantId: number | null */) {
    // TEST MODE: return all queues enriched
    return await this.queuesService.findAllEnriched(null);
  }

  @Get('stats/global')
  @ApiOperation({ summary: 'Get global aggregated statistics for all queues' })
  @ApiResponse({
    status: 200,
    description: 'Global stats calculated successfully',
    type: GlobalQueueStatsDto,
  })
  async getGlobalStats(/* @CurrentTenant() tenantId: number | null */) {
    // TEST MODE: return global stats for all
    return await this.queuesService.getGlobalStats(null);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get queue by name' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({ status: 200, description: 'Queue found' })
  async findOne(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE: find by name directly
    return await this.queuesService.findOne(null, name);
  }

  @Get(':name/stats')
  @ApiOperation({ summary: 'Get queue with real-time stats from AMI' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({ status: 200, description: 'Queue with stats retrieved' })
  async getStats(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE
    return await this.queuesService.findOneWithStats(null, name);
  }

  @Get(':name/details')
  @ApiOperation({ summary: 'Get complete queue details with full DB + AMI data' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({
    status: 200,
    description: 'Queue details retrieved successfully',
    type: QueueDetailsDto,
  })
  async getDetails(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE
    return await this.queuesService.getQueueDetails(null, name);
  }

  @Get(':name/calls')
  @ApiOperation({ summary: 'Get waiting calls in a queue' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({
    status: 200,
    description: 'Queue calls retrieved successfully',
    type: QueueCallsDto,
  })
  async getQueueCalls(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE
    return await this.queuesService.getQueueCalls(null, name);
  }

  @Post(':name/reload')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Reload a specific queue configuration' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({
    status: 200,
    description: 'Queue reloaded successfully',
    type: QueueReloadResultDto,
  })
  async reloadQueue(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE
    return await this.queuesService.reloadQueue(null, name);
  }

  @Patch(':name')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update queue' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({ status: 200, description: 'Queue updated successfully' })
  async update(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
    @Body() dto: UpdateQueueDto,
  ) {
    // TEST MODE
    return await this.queuesService.update(null, name, dto);
  }

  @Delete(':name')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete queue' })
  @ApiParam({ name: 'name', description: 'Queue name', example: 'support' })
  @ApiResponse({ status: 204, description: 'Queue deleted successfully' })
  async remove(
    // @CurrentTenant() tenantId: number,
    @Param('name') name: string,
  ) {
    // TEST MODE
    await this.queuesService.remove(null, name);
  }
}
