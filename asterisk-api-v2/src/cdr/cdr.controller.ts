import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CdrService } from './cdr.service';
import { CdrFilterDto } from './dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@ApiTags('CDR')
@ApiBearerAuth()
@Controller('cdr')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  @Get()
  @ApiOperation({ summary: 'List CDR records with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'CDR records retrieved' })
  async findAll(
    // @CurrentTenant() tenantId: number,
    @Query() filter: CdrFilterDto,
  ) {
    // TEST MODE: use tenantId from filter or null
    return await this.cdrService.findAll(filter.tenantId || null, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get CDR statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(
    // @CurrentTenant() tenantId: number,
    @Query() filter: CdrFilterDto,
  ) {
    // TEST MODE
    return await this.cdrService.getStats(filter.tenantId || null, filter);
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="cdr-export.csv"')
  @ApiOperation({ summary: 'Export CDR records to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file generated' })
  async exportCsv(
    // @CurrentTenant() tenantId: number,
    @Query() filter: CdrFilterDto,
  ): Promise<string> {
    // TEST MODE
    return await this.cdrService.exportToCsv(filter.tenantId || null, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CDR record by ID' })
  @ApiParam({ name: 'id', example: 12345 })
  @ApiResponse({ status: 200, description: 'CDR record retrieved' })
  async findOne(
    // @CurrentTenant() tenantId: number,
    @Param('id') id: number,
  ) {
    // TEST MODE: search without tenant filtering
    const record = await this.cdrService.findOne(null, id);
    if (!record) {
      throw new NotFoundException(`CDR record ${id} not found`);
    }
    return record;
  }
}
