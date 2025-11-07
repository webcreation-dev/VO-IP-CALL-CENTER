import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsInt,
  IsPositive,
} from 'class-validator';

/**
 * Update Endpoint DTO
 *
 * Data Transfer Object for updating an existing PJSIP endpoint
 * All fields are optional
 *
 * Note: username cannot be changed (it's part of the primary key)
 *
 * This will update the related entities atomically:
 * - ps_endpoints (endpoint configuration)
 * - ps_auths (authentication)
 * - ps_aors (address of record)
 *
 * @example
 * {
 *   "password": "NewSecurePassword456",
 *   "callerid": "Jane Smith <101>",
 *   "codecs": "ulaw,alaw,g722,opus"
 * }
 */
export class UpdateEndpointDto {
  @ApiPropertyOptional({
    description: 'SIP authentication password',
    example: 'NewSecurePassword456',
    minLength: 6,
    maxLength: 80,
  })
  @IsString({ message: 'Password must be a string' })
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(80, { message: 'Password must not exceed 80 characters' })
  password?: string;

  @ApiPropertyOptional({
    description: 'CallerID name and number',
    example: 'Jane Smith <101>',
  })
  @IsString({ message: 'CallerID must be a string' })
  @IsOptional()
  @MaxLength(40)
  callerid?: string;

  @ApiPropertyOptional({
    description: 'Dialplan context for inbound calls',
    example: 'custom-context',
  })
  @IsString({ message: 'Context must be a string' })
  @IsOptional()
  @MaxLength(40)
  context?: string;

  @ApiPropertyOptional({
    description: 'Transport configuration to use',
    example: 'transport-tls',
  })
  @IsString({ message: 'Transport must be a string' })
  @IsOptional()
  @MaxLength(40)
  transport?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of allowed codecs',
    example: 'ulaw,alaw,g722,opus',
  })
  @IsString({ message: 'Codecs must be a string' })
  @IsOptional()
  @MaxLength(200)
  codecs?: string;

  @ApiPropertyOptional({
    description: 'Enable direct media',
    example: 'no',
    enum: ['yes', 'no'],
  })
  @IsString({ message: 'Direct media must be a string' })
  @IsOptional()
  @Matches(/^(yes|no)$/, { message: 'Direct media must be "yes" or "no"' })
  directMedia?: string;

  @ApiPropertyOptional({
    description: 'DTMF mode',
    example: 'inband',
    enum: ['rfc4733', 'inband', 'info', 'auto'],
  })
  @IsString({ message: 'DTMF mode must be a string' })
  @IsOptional()
  dtmfMode?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of simultaneous registrations',
    example: 2,
  })
  @IsOptional()
  maxContacts?: number;

  @ApiPropertyOptional({
    description: 'Mailboxes for message waiting indicator',
    example: '101@default,102@default',
  })
  @IsString({ message: 'Mailboxes must be a string' })
  @IsOptional()
  @MaxLength(100)
  mailboxes?: string;

  @ApiPropertyOptional({
    description: 'Endpoint role ID for permission management',
    example: 1,
  })
  @IsInt({ message: 'Role ID must be an integer' })
  @IsPositive({ message: 'Role ID must be a positive number' })
  @IsOptional()
  roleId?: number;
}
