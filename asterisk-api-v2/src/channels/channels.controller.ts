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
  ApiQuery,
} from '@nestjs/swagger';

import { ChannelsService } from './channels.service';
import { OriginateCallDto, ChannelFilterDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'List active channels' })
  @ApiResponse({ status: 200, description: 'Channels retrieved' })
  async findAll(
    // @CurrentTenant() tenantId: number,
    @Query() filter: ChannelFilterDto,
  ) {
    // TEST MODE
    return await this.channelsService.findAll(null, filter);
  }

  @Get(':channelId')
  @ApiOperation({ summary: 'Get channel details' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiResponse({ status: 200, description: 'Channel details retrieved' })
  async findOne(@Param('channelId') channelId: string) {
    return await this.channelsService.findOne(channelId);
  }

  @Post('originate')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({ summary: 'Originate an outbound call' })
  @ApiResponse({ status: 201, description: 'Call originated successfully' })
  async originate(
    // @CurrentTenant() tenantId: number,
    @Body() dto: OriginateCallDto,
  ) {
    // TEST MODE: use tenantId from DTO or default 1
    const tenantId = dto.tenantId || 1;
    return await this.channelsService.originate(tenantId, dto);
  }

  @Patch(':channelId/answer')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({ summary: 'Answer a ringing channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiResponse({ status: 200, description: 'Channel answered' })
  async answer(@Param('channelId') channelId: string) {
    await this.channelsService.answer(channelId);
    return { message: 'Channel answered successfully' };
  }

  @Delete(':channelId')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Hangup a channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiResponse({ status: 204, description: 'Channel hung up' })
  async hangup(
    @Param('channelId') channelId: string,
    @Query('reason') reason?: string,
  ) {
    await this.channelsService.hangup(channelId, reason);
  }

  @Patch(':channelId/hold')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({ summary: 'Hold a channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiResponse({ status: 200, description: 'Channel held' })
  async hold(@Param('channelId') channelId: string) {
    await this.channelsService.hold(channelId);
    return { message: 'Channel held successfully' };
  }

  @Patch(':channelId/unhold')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({ summary: 'Unhold a channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiResponse({ status: 200, description: 'Channel unheld' })
  async unhold(@Param('channelId') channelId: string) {
    await this.channelsService.unhold(channelId);
    return { message: 'Channel unheld successfully' };
  }

  @Patch(':channelId/mute')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Mute a channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['in', 'out', 'both'],
    example: 'both',
  })
  @ApiResponse({ status: 200, description: 'Channel muted' })
  async mute(
    @Param('channelId') channelId: string,
    @Query('direction') direction?: 'in' | 'out' | 'both',
  ) {
    await this.channelsService.mute(channelId, direction || 'both');
    return { message: 'Channel muted successfully' };
  }

  @Patch(':channelId/unmute')
  @Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Unmute a channel' })
  @ApiParam({ name: 'channelId', example: '1234567890.123' })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['in', 'out', 'both'],
    example: 'both',
  })
  @ApiResponse({ status: 200, description: 'Channel unmuted' })
  async unmute(
    @Param('channelId') channelId: string,
    @Query('direction') direction?: 'in' | 'out' | 'both',
  ) {
    await this.channelsService.unmute(channelId, direction || 'both');
    return { message: 'Channel unmuted successfully' };
  }
}
