import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SoundsService } from './sounds.service';
import { UploadSoundDto } from './dto/upload-sound.dto';
import { SoundFileQueryDto } from './dto/sound-file-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';

@ApiTags('Sound Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sounds')
export class SoundsController {
  constructor(private readonly soundsService: SoundsService) {}

  /**
   * Upload a sound file
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload sound file',
    description: 'Upload an audio file for use in Music on Hold, announcements, greetings, etc.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (wav, mp3, gsm, ogg, ulaw, alaw)',
        },
        name: {
          type: 'string',
          description: 'Display name for the sound file',
          example: 'Company Welcome Message',
        },
        category: {
          type: 'string',
          enum: ['moh', 'announcement', 'greeting', 'prompt', 'other'],
          description: 'Category of the sound file',
          example: 'moh',
        },
        description: {
          type: 'string',
          description: 'Description of the sound file',
          example: 'Background music for queue hold time',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Sound file uploaded successfully',
    schema: {
      example: {
        id: 1,
        tenantId: 1,
        name: 'Company Welcome Message',
        filename: '1699234567890_company_welcome.wav',
        filepath: '/var/lib/asterisk/sounds/custom/t1/moh/1699234567890_company_welcome.wav',
        format: 'wav',
        duration: 45.5,
        filesize: 1048576,
        category: 'moh',
        description: 'Background music for queue hold time',
        originalName: 'company_welcome.wav',
        createdAt: '2025-11-08T10:00:00.000Z',
        updatedAt: '2025-11-08T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSoundDto,
    @CurrentUser('tenantId') userTenantId: number | null,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // For super admins (userTenantId = null), use tenantId from DTO
    // For tenant admins, use their tenantId
    const effectiveTenantId = userTenantId ?? dto.tenantId;

    if (!effectiveTenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    return this.soundsService.upload(file, dto, effectiveTenantId);
  }

  /**
   * Get all sound files
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Get all sound files',
    description: 'Retrieve all sound files for the tenant with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Sound files retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            tenantId: 1,
            name: 'Company Welcome Message',
            filename: '1699234567890_company_welcome.wav',
            format: 'wav',
            duration: 45.5,
            filesize: 1048576,
            category: 'moh',
            description: 'Background music for queue hold time',
            createdAt: '2025-11-08T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    },
  })
  async findAll(
    @Query() query: SoundFileQueryDto,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    // SUPER_ADMIN can see all sound files
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    return this.soundsService.findAll(query, filterTenantId);
  }

  /**
   * Get a single sound file
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Get sound file by ID',
    description: 'Retrieve a specific sound file by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Sound file ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Sound file retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Sound file not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    return this.soundsService.findOne(id, filterTenantId);
  }

  /**
   * Download a sound file
   */
  @Get(':id/download')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN, UserRole.SUPERVISOR, UserRole.AGENT)
  @ApiOperation({
    summary: 'Download sound file',
    description: 'Download the sound file binary',
  })
  @ApiParam({
    name: 'id',
    description: 'Sound file ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
    content: {
      'audio/wav': {},
      'audio/mpeg': {},
      'audio/gsm': {},
    },
  })
  @ApiResponse({ status: 404, description: 'Sound file not found' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
    @Res() res: Response,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    const { buffer, filename, mimetype } = await this.soundsService.getFileBuffer(id, filterTenantId);

    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  /**
   * Delete a sound file
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Delete sound file',
    description: 'Delete a sound file from the system (both database and file system)',
  })
  @ApiParam({
    name: 'id',
    description: 'Sound file ID',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Sound file deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Sound file not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('tenantId') tenantId: number,
    @CurrentUser('role') role: UserRole,
  ) {
    const filterTenantId = role === UserRole.SUPER_ADMIN ? undefined : tenantId;
    await this.soundsService.remove(id, filterTenantId);
  }
}
