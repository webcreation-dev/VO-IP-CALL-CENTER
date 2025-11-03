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
  import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
  import { IvrService } from '../services/ivr.service';
  import { CreateDidMappingDto } from '../dto/create-did-mapping.dto';
  import { UpdateDidMappingDto } from '../dto/update-did-mapping.dto';

  @ApiTags('IVR DID Mappings')
  // @ApiBearerAuth() // DÉSACTIVÉ POUR TESTS
  @Controller('ivr/did-mappings')
export class IvrDidMappingsController {
  constructor(private ivrService: IvrService) {}

  @Post()
  async create(
    @Query('tenantId') tenantId: number,
    @Body() dto: CreateDidMappingDto,
  ) {
    return this.ivrService.createDidMapping(tenantId, dto);
  }

  @Get()
  async findAll(@Query('tenantId') tenantId: number) {
    return this.ivrService.findAllDidMappings(tenantId);
  }

  @Get('by-did/:did')
  async findByDid(@Query('tenantId') tenantId: number, @Param('did') did: string) {
    return this.ivrService.findDidMapping(did);
  }

  @Patch(':id')
  async update(
    @Query('tenantId') tenantId: number,
    @Param('id') id: string,
    @Body() dto: UpdateDidMappingDto,
  ) {
    return this.ivrService.updateDidMapping(Number(id), tenantId, dto);
  }

  @Delete(':id')
  async remove(@Query('tenantId') tenantId: number, @Param('id') id: string) {
    return this.ivrService.removeDidMapping(Number(id), tenantId);
  }
}