import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DialplanConfigDto } from '../../common/dto/dialplan-config.dto';

/**
 * Create Tenant DTO
 *
 * Data Transfer Object for creating a new tenant
 *
 * Validation:
 * - name: required, unique, 3-255 characters
 * - company_name: optional, max 255 characters
 * - contact_email: optional, valid email format
 * - max_endpoints: optional, 1-10000 (default 100)
 * - max_queues: optional, 1-1000 (default 50)
 *
 * @example
 * {
 *   "name": "company1",
 *   "companyName": "Company One Ltd",
 *   "contactEmail": "contact@company1.com",
 *   "contactPhone": "+1234567890",
 *   "address": "123 Main St",
 *   "city": "New York",
 *   "country": "USA",
 *   "timezone": "America/New_York",
 *   "maxEndpoints": 200,
 *   "maxQueues": 100
 * }
 */
export class CreateTenantDto {
  // SIMPLIFIED FOR TESTING - Only accept 'name' like old project
  @ApiProperty({
    description: 'Tenant unique name (used as identifier)',
    example: 'company1',
    minLength: 3,
    maxLength: 255,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Company full name',
    example: 'Company One Ltd',
    maxLength: 255,
  })
  @IsString({ message: 'Company name must be a string' })
  @IsOptional()
  @MaxLength(255, { message: 'Company name must not exceed 255 characters' })
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@company1.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1234567890',
    maxLength: 50,
  })
  @IsString({ message: 'Contact phone must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Contact phone must not exceed 50 characters' })
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: '123 Main St',
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
    maxLength: 100,
  })
  @IsString({ message: 'City must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
    maxLength: 100,
  })
  @IsString({ message: 'Country must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Country must not exceed 100 characters' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Timezone (IANA timezone identifier)',
    example: 'America/New_York',
    default: 'UTC',
    maxLength: 50,
  })
  @IsString({ message: 'Timezone must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Timezone must not exceed 50 characters' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of SIP endpoints allowed',
    example: 200,
    default: 100,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Max endpoints must be a number' })
  @IsOptional()
  @Min(1, { message: 'Max endpoints must be at least 1' })
  @Max(10000, { message: 'Max endpoints must not exceed 10000' })
  maxEndpoints?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of queues allowed',
    example: 100,
    default: 50,
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber({}, { message: 'Max queues must be a number' })
  @IsOptional()
  @Min(1, { message: 'Max queues must be at least 1' })
  @Max(1000, { message: 'Max queues must not exceed 1000' })
  maxQueues?: number;

  @ApiPropertyOptional({
    description: 'Asterisk dialplan context name (auto-generated from tenant name if not provided)',
    example: 'company1_context',
    maxLength: 40,
    pattern: '^[a-z0-9_-]+$',
  })
  @IsString({ message: 'Context must be a string' })
  @IsOptional()
  @MaxLength(40, { message: 'Context must not exceed 40 characters' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Context must contain only lowercase letters, numbers, underscores, and hyphens',
  })
  context?: string;

  @ApiPropertyOptional({
    description: 'Dialplan configuration (numbering plan)',
    type: DialplanConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DialplanConfigDto)
  dialplanConfig?: DialplanConfigDto;
}
