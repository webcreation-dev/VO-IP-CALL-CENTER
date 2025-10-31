import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Create Endpoint DTO
 *
 * Data Transfer Object for creating a new PJSIP endpoint
 *
 * This will create 3 related entities atomically:
 * - ps_endpoints (endpoint configuration)
 * - ps_auths (authentication)
 * - ps_aors (address of record)
 *
 * Validation:
 * - username: required, 3-40 characters, alphanumeric + underscore
 * - password: required, 6-80 characters (SIP password)
 * - callerid: optional, valid CallerID format
 *
 * @example
 * {
 *   "username": "101",
 *   "password": "SecurePassword123",
 *   "callerid": "John Doe <101>",
 *   "context": "default",
 *   "transport": "transport-udp",
 *   "codecs": "ulaw,alaw,g722",
 *   "maxContacts": 1
 * }
 */
export class CreateEndpointDto {
  @ApiProperty({
    description: 'Endpoint username (unique within tenant, will be prefixed)',
    example: '101',
    minLength: 3,
    maxLength: 40,
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(40, { message: 'Username must not exceed 40 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({
    description: 'SIP authentication password',
    example: 'SecurePassword123',
    minLength: 6,
    maxLength: 80,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(80, { message: 'Password must not exceed 80 characters' })
  password: string;

  @ApiPropertyOptional({
    description: 'CallerID name and number (format: "Name <number>")',
    example: 'John Doe <101>',
    maxLength: 40,
  })
  @IsString({ message: 'CallerID must be a string' })
  @IsOptional()
  @MaxLength(40, { message: 'CallerID must not exceed 40 characters' })
  callerid?: string;

  @ApiPropertyOptional({
    description: 'Dialplan context for inbound calls',
    example: 'default',
    default: 'default',
    maxLength: 40,
  })
  @IsString({ message: 'Context must be a string' })
  @IsOptional()
  @MaxLength(40, { message: 'Context must not exceed 40 characters' })
  context?: string;

  @ApiPropertyOptional({
    description: 'Transport configuration to use',
    example: 'transport-udp',
    default: 'transport-udp',
    maxLength: 40,
  })
  @IsString({ message: 'Transport must be a string' })
  @IsOptional()
  @MaxLength(40, { message: 'Transport must not exceed 40 characters' })
  transport?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of allowed codecs',
    example: 'ulaw,alaw,g722',
    default: 'ulaw,alaw',
    maxLength: 200,
  })
  @IsString({ message: 'Codecs must be a string' })
  @IsOptional()
  @MaxLength(200, { message: 'Codecs must not exceed 200 characters' })
  codecs?: string;

  @ApiPropertyOptional({
    description: 'Enable direct media (RTP directly between endpoints)',
    example: 'yes',
    default: 'yes',
    enum: ['yes', 'no'],
  })
  @IsString({ message: 'Direct media must be a string' })
  @IsOptional()
  @Matches(/^(yes|no)$/, { message: 'Direct media must be "yes" or "no"' })
  directMedia?: string;

  @ApiPropertyOptional({
    description: 'DTMF mode',
    example: 'rfc4733',
    default: 'rfc4733',
    enum: ['rfc4733', 'inband', 'info', 'auto'],
  })
  @IsString({ message: 'DTMF mode must be a string' })
  @IsOptional()
  dtmfMode?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of simultaneous registrations',
    example: 1,
    default: 1,
  })
  @IsOptional()
  maxContacts?: number;

  @ApiPropertyOptional({
    description: 'Mailboxes for message waiting indicator (comma-separated)',
    example: '101@default',
    maxLength: 100,
  })
  @IsString({ message: 'Mailboxes must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Mailboxes must not exceed 100 characters' })
  mailboxes?: string;
}
