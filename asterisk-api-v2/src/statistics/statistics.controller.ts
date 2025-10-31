import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { StatisticsService } from './statistics.service';
import { StatisticsFilterDto } from './dto';

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get comprehensive dashboard',
    description: 'Retrieve complete dashboard with all statistics',
  })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getDashboard(filter);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get quick summary',
    description: 'Retrieve lightweight summary of key metrics (last 7 days by default)',
  })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getSummary(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getSummary(filter);
  }

  @Get('calls')
  @ApiOperation({
    summary: 'Get call statistics',
    description: 'Retrieve detailed call statistics with filtering',
  })
  @ApiResponse({ status: 200, description: 'Call statistics retrieved' })
  async getCallStatistics(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getCallStatistics(filter);
  }

  @Get('queues')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Retrieve statistics for all queues',
  })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved' })
  async getQueueStatistics(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getQueueStatistics(filter);
  }

  @Get('endpoints')
  @ApiOperation({
    summary: 'Get endpoint statistics',
    description: 'Retrieve statistics for endpoints including registration status',
  })
  @ApiResponse({ status: 200, description: 'Endpoint statistics retrieved' })
  async getEndpointStatistics(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getEndpointStatistics(filter);
  }

  @Get('recordings')
  @ApiOperation({
    summary: 'Get recording statistics',
    description: 'Retrieve statistics about call recordings',
  })
  @ApiResponse({ status: 200, description: 'Recording statistics retrieved' })
  async getRecordingStatistics(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getRecordingStatistics(filter);
  }

  @Get('top-callers')
  @ApiOperation({
    summary: 'Get top callers',
    description: 'Retrieve the most active callers',
  })
  @ApiResponse({ status: 200, description: 'Top callers retrieved' })
  async getTopCallers(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getTopCallers(filter);
  }

  @Get('top-called')
  @ApiOperation({
    summary: 'Get top called numbers',
    description: 'Retrieve the most called destinations',
  })
  @ApiResponse({ status: 200, description: 'Top called numbers retrieved' })
  async getTopCalled(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getTopCalled(filter);
  }

  @Get('active-channels')
  @ApiOperation({
    summary: 'Get active channels (real-time)',
    description: 'Retrieve currently active channels from ARI',
  })
  @ApiResponse({ status: 200, description: 'Active channels retrieved' })
  @ApiResponse({ status: 503, description: 'ARI service unavailable' })
  async getActiveChannels() {
    return await this.statisticsService.getActiveChannels();
  }

  @Get('trend')
  @ApiOperation({
    summary: 'Get call trend over time',
    description: 'Retrieve call volume trends grouped by hour, day, week, or month',
  })
  @ApiResponse({ status: 200, description: 'Trend data retrieved' })
  async getCallsTrend(@Query() filter: StatisticsFilterDto) {
    return await this.statisticsService.getCallsTrend(filter);
  }
}
