import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Dialplan Configuration DTO
 *
 * Validates tenant-specific numbering plan and dialing patterns
 */
export class DialplanConfigDto {
  @ApiProperty({
    description: 'Pattern for internal extension dialing (Asterisk pattern format)',
    example: '_1XXX',
    pattern: '^[_\\[\\]0-9XZN.-]+$',
  })
  @IsString()
  @Matches(/^[_\[\]0-9XZN.-]+$/, {
    message: 'Invalid Asterisk pattern format. Use X, Z, N, digits, brackets, underscores, dots, and hyphens only.',
  })
  internalDialPattern: string;

  @ApiPropertyOptional({
    description: 'Timeout in seconds for internal calls',
    example: 20,
    default: 20,
    minimum: 5,
    maximum: 300,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(5)
  @Max(300)
  internalDialTimeout?: number = 20;

  @ApiPropertyOptional({
    description: 'Pattern for queue access numbers',
    example: '_5XXX',
    pattern: '^[_\\[\\]0-9XZN.-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[_\[\]0-9XZN.-]+$/, {
    message: 'Invalid Asterisk pattern format.',
  })
  queuePattern?: string;

  @ApiPropertyOptional({
    description: 'Pattern for voicemail access',
    example: '*XXX',
    pattern: '^[*#_\\[\\]0-9XZN.-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[*#_\[\]0-9XZN.-]+$/, {
    message: 'Invalid Asterisk pattern format.',
  })
  voicemailPattern?: string;

  @ApiPropertyOptional({
    description: 'Test/echo extension number',
    example: '999',
    pattern: '^[*#0-9]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[*#0-9]+$/, {
    message: 'Test extension must contain only digits, *, and #.',
  })
  testExtension?: string;

  @ApiProperty({
    description: 'Allow external calls outside tenant context',
    example: false,
    default: false,
  })
  @IsBoolean()
  allowExternal: boolean = false;

  @ApiPropertyOptional({
    description: 'Pattern for external calls (required if allowExternal is true)',
    example: '_0XXXXXXXXX',
    pattern: '^[_\\[\\]0-9XZN.-]+$',
  })
  @ValidateIf((o) => o.allowExternal === true)
  @IsString()
  @Matches(/^[_\[\]0-9XZN.-]+$/, {
    message: 'Invalid Asterisk pattern format.',
  })
  externalPattern?: string;

  @ApiPropertyOptional({
    description: 'Prefix for outgoing external calls (e.g., dial 9 for outside line)',
    example: '9',
    pattern: '^[0-9*#]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9*#]+$/, {
    message: 'External prefix must contain only digits, *, and #.',
  })
  externalPrefix?: string;
}
