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
    @CurrentTenant() tenantId: number | null,
    @Body() dto: CreateQueueDto,
  ) {
    // SUPER_ADMIN: use tenantId from DTO, otherwise use from JWT
    const effectiveTenantId = tenantId ?? dto.tenantId;

    if (!effectiveTenantId) {
      throw new Error('Tenant ID is required');
    }

    return await this.queuesService.create(effectiveTenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all queues' })
  @ApiResponse({ status: 200, description: 'Queues retrieved successfully' })
  async findAll(@CurrentTenant() tenantId: number) {
    return await this.queuesService.findAll(tenantId);
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
  async getAllEnriched(
    @CurrentTenant() tenantId: number,
  ) {
    return await this.queuesService.findAllEnriched(tenantId);
  }

  @Get('stats/global')
  @ApiOperation({ summary: 'Get global aggregated statistics for all queues' })
  @ApiResponse({
    status: 200,
    description: 'Global stats calculated successfully',
    type: GlobalQueueStatsDto,
  })
  async getGlobalStats(@CurrentTenant() tenantId: number) {
    return await this.queuesService.getGlobalStats(tenantId);
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

  // ========================================
  // QUEUE MEMBERS MANAGEMENT
  // ========================================

  @Post(':name/members')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Add member to queue',
    description: 'Add an agent/endpoint as a member of the queue'
  })
  @ApiParam({ name: 'name', description: 'Queue name', example: 't1_support' })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    schema: {
      example: {
        success: true,
        data: {
          queue: 't1_support',
          interface: 'PJSIP/t1_101',
          member_name: '101',
          added: true
        },
        timestamp: '2025-11-04T16:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or AMI not connected' })
  @ApiResponse({ status: 404, description: 'Queue or endpoint not found' })
  async addMember(
    @Param('name') queueName: string,
    @Body() body: { interface: string; memberName?: string; penalty?: number; paused?: boolean }
  ) {
    return await this.queuesService.addMember(
      null,
      queueName,
      body.interface,
      body.memberName,
      body.penalty || 0,
      body.paused ? 1 : 0
    );
  }

  @Delete(':name/members/:memberId')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Remove member from queue',
    description: 'Remove an agent/endpoint from the queue'
  })
  @ApiParam({ name: 'name', description: 'Queue name', example: 't1_support' })
  @ApiParam({ name: 'memberId', description: 'Member interface (e.g., PJSIP/t1_101 or just t1_101)', example: 't1_101' })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    schema: {
      example: {
        success: true,
        data: {
          queue: 't1_support',
          interface: 'PJSIP/t1_101',
          removed: true
        },
        timestamp: '2025-11-04T16:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or AMI not connected' })
  @ApiResponse({ status: 404, description: 'Queue or member not found' })
  async removeMember(
    @Param('name') queueName: string,
    @Param('memberId') memberId: string
  ) {
    return await this.queuesService.removeMember(null, queueName, memberId);
  }

  @Patch(':name/members/:memberId/pause')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Pause/Unpause queue member',
    description: 'Pause or unpause an agent in the queue'
  })
  @ApiParam({ name: 'name', description: 'Queue name', example: 't1_support' })
  @ApiParam({ name: 'memberId', description: 'Member interface', example: 't1_101' })
  @ApiResponse({
    status: 200,
    description: 'Member pause status updated',
    schema: {
      example: {
        success: true,
        data: {
          queue: 't1_support',
          interface: 'PJSIP/t1_101',
          paused: true,
          reason: 'Break'
        },
        timestamp: '2025-11-04T16:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or AMI not connected' })
  @ApiResponse({ status: 404, description: 'Queue or member not found' })
  async pauseMember(
    @Param('name') queueName: string,
    @Param('memberId') memberId: string,
    @Body() body: { paused: boolean; reason?: string }
  ) {
    return await this.queuesService.pauseMember(
      null,
      queueName,
      memberId,
      body.paused,
      body.reason
    );
  }
}
