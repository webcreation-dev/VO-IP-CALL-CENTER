import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { MetadataService } from './metadata.service';
import { EnumCategoryDto, EnumCategorySummaryDto } from './dto';

@ApiTags('Metadata')
@ApiBearerAuth()
@Controller('metadata')
export class MetadataController {
  constructor(private readonly metadataService: MetadataService) {}

  /**
   * Get list of all enum categories (summary)
   */
  @Get('enums')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all enum categories',
    description: 'Get a summary of all available enum categories with value counts',
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
    description: 'Enum categories retrieved successfully',
    type: [EnumCategorySummaryDto],
    schema: {
      example: [
        {
          category: 'user-roles',
          label: { en: 'User Roles', fr: 'Rôles Utilisateurs' },
          module: 'authentication',
          valuesCount: 4,
        },
        {
          category: 'queue-strategies',
          label: { en: 'Queue Strategies', fr: 'Stratégies de File' },
          module: 'queues',
          valuesCount: 7,
        },
      ],
    },
  })
  getAllCategories(@Query('lang') lang: 'en' | 'fr' = 'en') {
    return this.metadataService.getAllCategories(lang);
  }

  /**
   * Get all enums with full details
   */
  @Get('enums/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all enums with full details',
    description: 'Retrieve all enum categories with complete values, labels, and metadata',
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
    description: 'All enums retrieved successfully',
    type: [EnumCategoryDto],
  })
  getAllEnums(@Query('lang') lang: 'en' | 'fr' = 'en') {
    return this.metadataService.getAllEnums(lang);
  }

  /**
   * Get a specific enum category
   */
  @Get('enums/:category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get specific enum category',
    description: 'Retrieve a single enum category with all its values',
  })
  @ApiParam({
    name: 'category',
    description: 'Enum category identifier',
    example: 'user-roles',
    enum: [
      'user-roles',
      'sort-orders',
      'boolean-options',
      'queue-strategies',
      'queue-member-status',
      'paused-status',
      'channel-states',
      'call-directions',
      'mute-directions',
      'device-states',
      'endpoint-device-states',
      'transport-protocols',
      'dtmf-modes',
      'call-dispositions',
      'recording-formats',
    ],
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
    description: 'Enum category retrieved successfully',
    type: EnumCategoryDto,
    schema: {
      example: {
        category: 'user-roles',
        label: { en: 'User Roles', fr: 'Rôles Utilisateurs' },
        description: {
          en: 'Available roles for authentication and authorization',
          fr: "Rôles disponibles pour l'authentification et l'autorisation",
        },
        module: 'authentication',
        values: [
          {
            key: 'admin',
            label: { en: 'Administrator', fr: 'Administrateur' },
            description: {
              en: 'Global system administrator with full access',
              fr: 'Administrateur système global avec accès complet',
            },
            metadata: {
              color: '#e74c3c',
              icon: 'shield-check',
              badge: 'danger',
              order: 1,
            },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Enum category not found' })
  getEnumByCategory(
    @Param('category') category: string,
    @Query('lang') lang: 'en' | 'fr' = 'en',
  ) {
    return this.metadataService.getEnumByCategory(category, lang);
  }

  /**
   * Search enums by keyword
   */
  @Get('enums/search/:keyword')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search enums by keyword',
    description: 'Search across all enum categories by keyword',
  })
  @ApiParam({
    name: 'keyword',
    description: 'Search keyword',
    example: 'admin',
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
    description: 'Search results',
    type: [EnumCategoryDto],
  })
  searchEnums(
    @Param('keyword') keyword: string,
    @Query('lang') lang: 'en' | 'fr' = 'en',
  ) {
    return this.metadataService.searchEnums(keyword, lang);
  }

  /**
   * Get list of available category identifiers
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available category identifiers',
    description: 'Get a simple list of all available enum category identifiers',
  })
  @ApiResponse({
    status: 200,
    description: 'Category identifiers retrieved',
    schema: {
      example: [
        'user-roles',
        'sort-orders',
        'boolean-options',
        'queue-strategies',
        'queue-member-status',
        'paused-status',
        'channel-states',
        'call-directions',
        'mute-directions',
        'device-states',
        'endpoint-device-states',
        'transport-protocols',
        'dtmf-modes',
        'call-dispositions',
        'recording-formats',
      ],
    },
  })
  getAvailableCategories() {
    return this.metadataService.getAvailableCategories();
  }
}
