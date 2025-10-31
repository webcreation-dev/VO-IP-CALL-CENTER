import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { MonitoringService } from './monitoring.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { DashboardDto } from './dto';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved', type: DashboardDto })
  async getDashboard(@CurrentTenant() tenantId: number): Promise<DashboardDto> {
    return await this.monitoringService.getDashboard(tenantId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent events' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Recent events retrieved' })
  async getRecentEvents(
    @CurrentTenant() tenantId: number,
    @Query('limit') limit?: number,
  ) {
    return await this.monitoringService.getRecentEvents(
      tenantId,
      limit || 50,
    );
  }
}
