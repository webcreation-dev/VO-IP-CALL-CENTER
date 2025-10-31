import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

/**
 * Extension Filter DTO
 *
 * Extends BaseFilterDto with extension-specific filters
 * Supports pagination, sorting, search, and field-specific filters
 *
 * @example
 * {
 *   "page": 1,
 *   "limit": 20,
 *   "sortBy": "priority",
 *   "order": "ASC",
 *   "search": "Dial",
 *   "context": "company1",
 *   "exten": "_1XXX",
 *   "app": "Dial"
 * }
 */
export class ExtensionFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by context (exact match)',
    example: 'company1',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Filter by extension pattern (partial match)',
    example: '_1XXX',
  })
  @IsOptional()
  @IsString()
  exten?: string;

  @ApiPropertyOptional({
    description: 'Filter by application name (exact match)',
    example: 'Dial',
  })
  @IsOptional()
  @IsString()
  app?: string;

  @ApiPropertyOptional({
    description: 'Minimum priority',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minPriority?: number;

  @ApiPropertyOptional({
    description: 'Maximum priority',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxPriority?: number;
}
