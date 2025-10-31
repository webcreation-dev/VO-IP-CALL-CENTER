import { ApiProperty } from '@nestjs/swagger';

export class QueueStatsDto {
  @ApiProperty({ description: 'Queue name', example: 'support' })
  name: string;

  @ApiProperty({ description: 'Active calls in queue', example: 5 })
  activeCalls: number;

  @ApiProperty({ description: 'Available members', example: 8 })
  availableMembers: number;

  @ApiProperty({ description: 'Total members', example: 10 })
  totalMembers: number;

  @ApiProperty({ description: 'Average hold time (seconds)', example: 45 })
  avgHoldTime: number;
}

export class ChannelStatsDto {
  @ApiProperty({ description: 'Total active channels', example: 25 })
  totalActive: number;

  @ApiProperty({ description: 'Channels in Up state', example: 20 })
  upChannels: number;

  @ApiProperty({ description: 'Channels ringing', example: 3 })
  ringingChannels: number;

  @ApiProperty({ description: 'Channels dialing', example: 2 })
  dialingChannels: number;
}

export class AgentStatsDto {
  @ApiProperty({ description: 'Total agents', example: 50 })
  totalAgents: number;

  @ApiProperty({ description: 'Available agents', example: 30 })
  availableAgents: number;

  @ApiProperty({ description: 'Busy agents', example: 15 })
  busyAgents: number;

  @ApiProperty({ description: 'Paused agents', example: 5 })
  pausedAgents: number;
}

export class SystemStatsDto {
  @ApiProperty({ description: 'System uptime (seconds)', example: 86400 })
  uptime: number;

  @ApiProperty({ description: 'Asterisk version', example: '20.0.0' })
  version: string;

  @ApiProperty({ description: 'Active calls', example: 25 })
  activeCalls: number;

  @ApiProperty({ description: 'Calls processed today', example: 450 })
  callsToday: number;
}

export class DashboardDto {
  @ApiProperty({ description: 'Timestamp of data', example: '2024-10-30T10:30:00Z' })
  timestamp: string;

  @ApiProperty({ description: 'System statistics', type: SystemStatsDto })
  system: SystemStatsDto;

  @ApiProperty({ description: 'Channel statistics', type: ChannelStatsDto })
  channels: ChannelStatsDto;

  @ApiProperty({ description: 'Agent statistics', type: AgentStatsDto })
  agents: AgentStatsDto;

  @ApiProperty({
    description: 'Queue statistics',
    type: [QueueStatsDto],
  })
  queues: QueueStatsDto[];
}
