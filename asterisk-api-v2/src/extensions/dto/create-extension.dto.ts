import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

/**
 * Create Extension DTO
 *
 * Data Transfer Object for creating a new dialplan extension
 *
 * Validation:
 * - context: required, must belong to tenant
 * - exten: required, Asterisk pattern format
 * - priority: auto-calculated if not provided
 * - app: required, valid Asterisk application
 * - appdata: required (can be empty string)
 *
 * @example
 * {
 *   "context": "company1",
 *   "exten": "_1XXX",
 *   "priority": 1,
 *   "app": "Dial",
 *   "appdata": "PJSIP/${EXTEN},20"
 * }
 */
export class CreateExtensionDto {
  @ApiProperty({
    description: 'Dialplan context (must belong to your tenant)',
    example: 'company1',
    maxLength: 40,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Context must contain only lowercase letters, numbers, underscores, and hyphens',
  })
  context: string;

  @ApiProperty({
    description: 'Extension number or pattern (_1XXX, _[2-9]XX, 999, etc.)',
    example: '_1XXX',
    maxLength: 40,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[_\[\]0-9XZN.*#+-]+$/, {
    message: 'Extension must be a valid Asterisk pattern (digits, X, Z, N, _, [], *, #, +, -, .)',
  })
  exten: string;

  @ApiPropertyOptional({
    description: 'Priority/step number (auto-calculated if not provided)',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  priority?: number;

  @ApiProperty({
    description: 'Asterisk application to execute',
    example: 'Dial',
    maxLength: 40,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'App must be a valid Asterisk application name (letters, digits, underscores, start with letter)',
  })
  app: string;

  @ApiProperty({
    description: 'Application data/arguments (can be empty)',
    example: 'PJSIP/${EXTEN},20',
    maxLength: 256,
  })
  @IsString()
  @MaxLength(256)
  appdata: string;
}
