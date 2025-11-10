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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { UpdateRoutingDto } from './dto/update-routing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('SIP Trunk Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /**
   * Create a new SIP trunk registration
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new SIP trunk',
    description: 'Create a new SIP trunk registration in pjsip_wizard.conf and reload Asterisk',
  })
  @ApiResponse({
    status: 201,
    description: 'SIP trunk created successfully',
    schema: {
      example: {
        id: 'operator_trunk',
        type: 'wizard',
        sends_registrations: true,
        sends_auth: true,
        remote_hosts: '197.234.218.195:25060',
        outbound_auth: {
          username: '62908521',
          password: '167d458f-8',
        },
        endpoint: {
          transport: 'transport-udp',
          context: 'from-trunk',
        },
        expiration: 3600,
        retry_interval: 60,
        max_retries: 10,
      },
    },
  })
  @ApiResponse({ status: 409, description: 'SIP trunk already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createRegistrationDto: CreateRegistrationDto, @Query('tenantId') tenantId?: number) {
    // For now, default to tenant 1 if not provided (SUPER_ADMIN can create for any tenant)
    const targetTenantId = tenantId || 1;
    return this.registrationsService.create(createRegistrationDto, targetTenantId);
  }

  /**
   * Get all SIP trunk registrations
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all SIP trunks',
    description: 'Retrieve all SIP trunk registrations from the database with full tenant details',
  })
  @ApiQuery({
    name: 'with_status',
    required: false,
    type: String,
    description: 'Include registration status from Asterisk AMI (set to "true")',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'List of SIP trunks retrieved successfully',
    schema: {
      example: [
        {
          id: 'operator_trunk',
          type: 'wizard',
          sends_registrations: true,
          sends_auth: true,
          remote_hosts: '197.234.218.195:25060',
          outbound_auth: {
            username: '62908521',
            password: '167d458f-8',
          },
          endpoint: {
            transport: 'transport-udp',
            context: 'from-trunk',
          },
          expiration: 3600,
          retry_interval: 60,
          max_retries: 10,
          tenantId: 1,
          tenant: {
            id: 1,
            name: 'tenant1',
            displayName: 'Tenant One',
            enabled: true,
          },
          enabled: true,
          status: {
            id: 'operator_trunk-reg-0',
            server_uri: 'sip:197.234.218.195:25060',
            auth: 'operator_trunk-oauth',
            status: 'Registered',
            expiration: 'exp. 3589s',
          },
        },
      ],
    },
  })
  async findAll(@Query('with_status') withStatus?: string) {
    const shouldIncludeStatus = withStatus === 'true' || withStatus === '1';
    if (shouldIncludeStatus) {
      return this.registrationsService.findAllWithStatus();
    }
    return this.registrationsService.findAll();
  }

  /**
   * Get a single SIP trunk registration
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get SIP trunk by ID',
    description: 'Retrieve a specific SIP trunk registration by its ID with full tenant details',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiQuery({
    name: 'with_status',
    required: false,
    type: String,
    description: 'Include registration status from Asterisk AMI (set to "true")',
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'SIP trunk retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'SIP trunk not found' })
  async findOne(@Param('id') id: string, @Query('with_status') withStatus?: string) {
    const shouldIncludeStatus = withStatus === 'true' || withStatus === '1';
    if (shouldIncludeStatus) {
      return this.registrationsService.findOneWithStatus(id);
    }
    return this.registrationsService.findOne(id);
  }

  /**
   * Update a SIP trunk registration
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update SIP trunk',
    description: 'Update an existing SIP trunk registration and reload Asterisk',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiResponse({
    status: 200,
    description: 'SIP trunk updated successfully',
  })
  @ApiResponse({ status: 404, description: 'SIP trunk not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(@Param('id') id: string, @Body() updateRegistrationDto: UpdateRegistrationDto) {
    return this.registrationsService.update(id, updateRegistrationDto);
  }

  /**
   * Delete a SIP trunk registration
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete SIP trunk',
    description: 'Delete a SIP trunk registration from pjsip_wizard.conf and reload Asterisk',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiResponse({
    status: 204,
    description: 'SIP trunk deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'SIP trunk not found' })
  async remove(@Param('id') id: string) {
    await this.registrationsService.remove(id);
  }

  /**
   * Force registration attempt
   */
  @Post(':id/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force SIP trunk registration',
    description: 'Force an immediate registration attempt for the specified SIP trunk',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration attempt initiated successfully',
    schema: {
      example: {
        message: 'Registration attempt initiated for operator_trunk',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'SIP trunk not found' })
  async forceRegister(@Param('id') id: string) {
    await this.registrationsService.forceRegister(id);
    return {
      message: `Registration attempt initiated for ${id}`,
    };
  }

  /**
   * Configure routing for incoming calls on this trunk
   */
  @Patch(':id/routing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure trunk routing',
    description: 'Configure automatic routing for incoming calls on this trunk to a destination (queue, extension, ivr)',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiResponse({
    status: 200,
    description: 'Routing configured successfully',
    schema: {
      example: {
        message: 'Routing configured successfully',
        trunk: {
          id: 'operator_trunk',
          destination_type: 'queue',
          destination_id: 'support',
          did_pattern: '_X.',
        },
        extensions_created: [
          {
            context: 'from-trunk',
            exten: '_X.',
            priority: 1,
            app: 'Queue',
            appdata: 't1_support',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'SIP trunk or destination not found' })
  @ApiResponse({ status: 400, description: 'Invalid routing configuration' })
  async updateRouting(
    @Param('id') id: string,
    @Body() updateRoutingDto: UpdateRoutingDto,
  ) {
    return this.registrationsService.updateRouting(id, updateRoutingDto);
  }

  /**
   * Get routing configuration for a trunk
   */
  @Get(':id/routing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get trunk routing',
    description: 'Get the current routing configuration for this trunk',
  })
  @ApiParam({
    name: 'id',
    description: 'SIP trunk identifier',
    example: 'operator_trunk',
  })
  @ApiResponse({
    status: 200,
    description: 'Routing configuration retrieved successfully',
    schema: {
      example: {
        destination_type: 'queue',
        destination_id: 'support',
        did_pattern: '_X.',
        extensions: [
          {
            context: 'from-trunk',
            exten: '_X.',
            priority: 1,
            app: 'Queue',
            appdata: 't1_support',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'SIP trunk not found' })
  async getRouting(@Param('id') id: string) {
    return this.registrationsService.getRouting(id);
  }

  /**
   * Get registration statuses directly from Asterisk AMI (no file access)
   * Simple endpoint that returns current registration status from 'pjsip show registrations'
   */
  @Get('status/ami')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get registration statuses from AMI',
    description: 'Retrieve current registration status directly from Asterisk (pjsip show registrations)',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration statuses retrieved successfully',
    schema: {
      example: [
        {
          id: 'operator_trunk-reg-0',
          server_uri: 'sip:197.234.218.195:25060',
          auth: 'operator_trunk-oauth',
          status: 'Registered',
          expiration: 'exp. 3589s',
        },
      ],
    },
  })
  async getRegistrationStatusesFromAMI() {
    return this.registrationsService.getAllRegistrationStatusesFromAMI();
  }

  /**
   * Get registration status (for backward compatibility with metadata controller)
   */
  @Get('status/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all registration statuses',
    description: 'Retrieve registration status for all SIP trunks (metadata format)',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    enum: ['en', 'fr'],
    description: 'Response language',
    example: 'en',
  })
  @ApiResponse({
    status: 200,
    description: 'Registration statuses retrieved successfully',
    schema: {
      example: [
        {
          key: 'operator_trunk-reg-0',
          label: { en: 'operator_trunk-reg-0', fr: 'operator_trunk-reg-0' },
          description: {
            en: 'Registered - sip:197.234.218.195:25060',
            fr: 'Enregistré - sip:197.234.218.195:25060',
          },
          metadata: {
            serverUri: 'sip:197.234.218.195:25060',
            auth: 'operator_trunk-oauth',
            status: 'Registered',
            expiration: 'exp. 3589s',
            order: 0,
          },
          numericValue: 0,
        },
      ],
    },
  })
  async getRegistrationStatuses(@Query('lang') lang: 'en' | 'fr' = 'en') {
    const registrations = await this.registrationsService.findAllWithStatus();

    return registrations.map((registration, index) => ({
      key: `${registration.id}-reg-0`,
      label: {
        en: `${registration.id}-reg-0`,
        fr: `${registration.id}-reg-0`,
      },
      description: {
        en: `${registration.status.status} - ${registration.remote_hosts}`,
        fr: `${this.translateStatus(registration.status.status, 'fr')} - ${registration.remote_hosts}`,
      },
      metadata: {
        serverUri: registration.status.server_uri,
        auth: registration.status.auth,
        status: registration.status.status,
        expiration: registration.status.expiration,
        order: index,
      },
      numericValue: index,
    }));
  }

  /**
   * Translate status to specified language
   */
  private translateStatus(status: string, lang: 'en' | 'fr'): string {
    if (lang === 'fr') {
      const translations: Record<string, string> = {
        'Registered': 'Enregistré',
        'Rejected': 'Rejeté',
        'Unregistered': 'Non enregistré',
        'Unknown': 'Inconnu',
      };
      return translations[status] || status;
    }
    return status;
  }
}
