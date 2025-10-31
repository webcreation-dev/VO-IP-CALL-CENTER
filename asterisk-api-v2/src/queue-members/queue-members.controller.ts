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

import { QueueMembersService } from './queue-members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { EnrichedMemberDto } from './dto/enriched-member.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Queue Members')
@ApiBearerAuth()
@Controller('queues/:queueName/members')
export class QueueMembersController {
  constructor(private readonly membersService: QueueMembersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Add member to queue' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
    @Body() dto: AddMemberDto,
  ) {
    // TEST MODE: use tenantId from DTO or default 1
    const tenantId = dto.tenantId || 1;
    return await this.membersService.addMember(tenantId, queueName, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List queue members' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiResponse({ status: 200, description: 'Members retrieved' })
  async findAll(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
  ) {
    // TEST MODE
    return await this.membersService.findAll(null, queueName);
  }

  @Get('enriched')
  @ApiOperation({ summary: 'Get all members with enriched endpoint data' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiResponse({
    status: 200,
    description: 'Enriched members retrieved successfully',
    type: [EnrichedMemberDto],
  })
  async getAllEnriched(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
  ) {
    // TEST MODE
    return await this.membersService.findAllEnriched(null, queueName);
  }

  @Patch(':memberName/pause')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Pause member' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiParam({ name: 'memberName', example: '101' })
  @ApiResponse({ status: 200, description: 'Member paused' })
  async pause(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
    @Param('memberName') memberName: string,
  ) {
    // TEST MODE
    await this.membersService.pause(null, queueName, memberName);
    return { message: 'Member paused successfully' };
  }

  @Patch(':memberName/unpause')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Unpause member' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiParam({ name: 'memberName', example: '101' })
  @ApiResponse({ status: 200, description: 'Member unpaused' })
  async unpause(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
    @Param('memberName') memberName: string,
  ) {
    // TEST MODE
    await this.membersService.unpause(null, queueName, memberName);
    return { message: 'Member unpaused successfully' };
  }

  @Patch(':memberName')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Update member penalty' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiParam({ name: 'memberName', example: '101' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  async update(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
    @Param('memberName') memberName: string,
    @Body() dto: UpdateMemberDto,
  ) {
    if (dto.penalty !== undefined) {
      await this.membersService.updatePenalty(
        null,
        queueName,
        memberName,
        dto.penalty,
      );
    }
    return { message: 'Member updated successfully' };
  }

  @Delete(':memberName')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from queue' })
  @ApiParam({ name: 'queueName', example: 'support' })
  @ApiParam({ name: 'memberName', example: '101' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async remove(
    // @CurrentTenant() tenantId: number,
    @Param('queueName') queueName: string,
    @Param('memberName') memberName: string,
  ) {
    // TEST MODE
    await this.membersService.removeMember(null, queueName, memberName);
  }
}
