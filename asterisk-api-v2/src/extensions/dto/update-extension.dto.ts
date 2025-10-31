import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

/**
 * Update Extension DTO
 *
 * Data Transfer Object for updating an existing dialplan extension
 * All fields are optional
 *
 * Note: Changing context/exten/priority effectively creates a new extension
 * Be cautious when updating these fields
 *
 * @example
 * {
 *   "priority": 2,
 *   "app": "Hangup",
 *   "appdata": ""
 * }
 */
export class UpdateExtensionDto {
  @ApiPropertyOptional({
    description: 'Dialplan context',
    example: 'company1',
    maxLength: 40,
  })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Context must contain only lowercase letters, numbers, underscores, and hyphens',
  })
  context?: string;

  @ApiPropertyOptional({
    description: 'Extension number or pattern',
    example: '_1XXX',
    maxLength: 40,
  })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(/^[_\[\]0-9XZN.*#+-]+$/, {
    message: 'Extension must be a valid Asterisk pattern',
  })
  exten?: string;

  @ApiPropertyOptional({
    description: 'Priority/step number',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Asterisk application to execute',
    example: 'Hangup',
    maxLength: 40,
  })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/, {
    message: 'App must be a valid Asterisk application name',
  })
  app?: string;

  @ApiPropertyOptional({
    description: 'Application data/arguments',
    example: '',
    maxLength: 256,
  })
  @IsString()
  @IsOptional()
  @MaxLength(256)
  appdata?: string;
}
