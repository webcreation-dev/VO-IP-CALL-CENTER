import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { AsteriskService } from './asterisk.service';
import { BlindTransferDto, SendMessageDto, ExecuteCommandDto } from './dto';

@ApiTags('Asterisk')
@ApiBearerAuth()
@Controller('asterisk')
export class AsteriskController {
  constructor(private readonly asteriskService: AsteriskService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get Asterisk server status',
    description: 'Retrieve comprehensive server status including core status, system info, and settings',
  })
  @ApiResponse({ status: 200, description: 'Server status retrieved' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getServerStatus() {
    return await this.asteriskService.getServerStatus();
  }

  @Get('uptime')
  @ApiOperation({
    summary: 'Get Asterisk uptime',
    description: 'Retrieve system uptime information',
  })
  @ApiResponse({ status: 200, description: 'Uptime retrieved' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getUptime() {
    return await this.asteriskService.getUptime();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get global statistics',
    description: 'Retrieve global Asterisk statistics including active channels and core status',
  })
  @ApiResponse({ status: 200, description: 'Global statistics retrieved' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getGlobalStats() {
    return await this.asteriskService.getGlobalStats();
  }

  @Post('transfer/blind')
  @ApiOperation({
    summary: 'Perform blind transfer',
    description: 'Transfer an active call to another extension without supervision',
  })
  @ApiResponse({ status: 200, description: 'Transfer initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async blindTransfer(@Body() dto: BlindTransferDto) {
    return await this.asteriskService.blindTransfer(dto);
  }

  @Get('extensions/available')
  @ApiOperation({
    summary: 'Get available extensions',
    description: 'Get list of available (non-busy) extensions for a given context',
  })
  @ApiQuery({
    name: 'context',
    required: true,
    description: 'Dialplan context',
    example: 'from-internal',
  })
  @ApiResponse({ status: 200, description: 'Available extensions retrieved' })
  @ApiResponse({ status: 400, description: 'Context parameter required' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getAvailableExtensions(@Query('context') context: string) {
    if (!context) {
      throw new Error('Context parameter is required');
    }
    return await this.asteriskService.getAvailableExtensions(context);
  }

  @Post('reload')
  @ApiOperation({
    summary: 'Reload all configurations',
    description: 'Reload all Asterisk configuration files',
  })
  @ApiResponse({ status: 200, description: 'Configuration reloaded' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async reloadAll() {
    return await this.asteriskService.reloadAll();
  }

  @Post('reload/pjsip')
  @ApiOperation({
    summary: 'Reload PJSIP',
    description: 'Reload PJSIP module and configuration',
  })
  @ApiResponse({ status: 200, description: 'PJSIP reloaded' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async reloadPJSIP() {
    return await this.asteriskService.reloadPJSIP();
  }

  @Post('reload/dialplan')
  @ApiOperation({
    summary: 'Reload dialplan',
    description: 'Reload dialplan configuration',
  })
  @ApiResponse({ status: 200, description: 'Dialplan reloaded' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async reloadDialplan() {
    return await this.asteriskService.reloadDialplan();
  }

  @Post('reload/:module')
  @ApiOperation({
    summary: 'Reload specific module',
    description: 'Reload a specific Asterisk module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name to reload',
    example: 'res_pjsip.so',
  })
  @ApiResponse({ status: 200, description: 'Module reloaded' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async reloadModule(@Param('module') module: string) {
    return await this.asteriskService.reloadModule(module);
  }

  @Get('modules')
  @ApiOperation({
    summary: 'Get loaded modules',
    description: 'Retrieve list of all loaded Asterisk modules',
  })
  @ApiResponse({ status: 200, description: 'Loaded modules retrieved' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getLoadedModules() {
    return await this.asteriskService.getLoadedModules();
  }

  @Get('peers')
  @ApiOperation({
    summary: 'Get SIP/PJSIP peers',
    description: 'Retrieve list of SIP or PJSIP peers',
  })
  @ApiQuery({
    name: 'technology',
    required: false,
    description: 'Technology type (pjsip or sip)',
    example: 'pjsip',
  })
  @ApiResponse({ status: 200, description: 'Peers retrieved' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async getPeers(@Query('technology') technology?: string) {
    return await this.asteriskService.getPeers(technology || 'pjsip');
  }

  @Post('message')
  @ApiOperation({
    summary: 'Send SIP message',
    description: 'Send a SIP MESSAGE to an endpoint',
  })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async sendMessage(@Body() dto: SendMessageDto) {
    return await this.asteriskService.sendMessage(dto);
  }

  @Post('command')
  @ApiOperation({
    summary: 'Execute CLI command',
    description: 'Execute a custom Asterisk CLI command',
  })
  @ApiResponse({ status: 200, description: 'Command executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 503, description: 'AMI service unavailable' })
  async executeCommand(@Body() dto: ExecuteCommandDto) {
    return await this.asteriskService.executeCommand(dto);
  }
}
