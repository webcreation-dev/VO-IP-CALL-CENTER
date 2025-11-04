import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNumber,
  IsBoolean,
  IsOptional,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DialplanConfigDto } from '../../common/dto/dialplan-config.dto';

/**
 * Update Tenant DTO
 *
 * Data Transfer Object for updating an existing tenant
 * All fields are optional
 *
 * Note: 'name' field is not updatable (used as unique identifier)
 *
 * @example
 * {
 *   "companyName": "Updated Company Name",
 *   "contactEmail": "newemail@company.com",
 *   "maxEndpoints": 300,
 *   "isActive": false
 * }
 */
export class UpdateTenantDto {
  @ApiPropertyOptional({
    description: 'Tenant name',
    example: 'Updated Company Name',
  })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Company full name',
    example: 'Updated Company Name',
  })
  @IsString({ message: 'Company name must be a string' })
  @IsOptional()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'newemail@company.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+9876543210',
  })
  @IsString({ message: 'Contact phone must be a string' })
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: '456 New Avenue',
  })
  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Los Angeles',
  })
  @IsString({ message: 'City must be a string' })
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
  })
  @IsString({ message: 'Country must be a string' })
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Timezone (IANA timezone identifier)',
    example: 'America/Los_Angeles',
  })
  @IsString({ message: 'Timezone must be a string' })
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of SIP endpoints allowed',
    example: 300,
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
    example: 150,
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber({}, { message: 'Max queues must be a number' })
  @IsOptional()
  @Min(1, { message: 'Max queues must be at least 1' })
  @Max(1000, { message: 'Max queues must not exceed 1000' })
  maxQueues?: number;

  @ApiPropertyOptional({
    description: 'Active status (false = soft delete)',
    example: true,
  })
  @IsBoolean({ message: 'Is active must be a boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Asterisk dialplan context name',
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
  //
  // @ApiPropertyOptional({
  //   description: 'Dialplan configuration (numbering plan)',
  //   type: DialplanConfigDto,
  // })
  // @IsOptional()
  // @ValidateNested()
  // @Type(() => DialplanConfigDto)
  // dialplanConfig?: DialplanConfigDto;
}
