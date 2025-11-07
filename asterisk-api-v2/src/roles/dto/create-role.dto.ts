import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  IsNotEmpty,
} from 'class-validator';

/**
 * Create Role DTO
 *
 * Defines the data required to create a new endpoint role.
 */
export class CreateRoleDto {
  @ApiPropertyOptional({
    description: 'Tenant ID (for SUPER_ADMIN only, otherwise inferred from auth)',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    description: 'Unique role name (lowercase, alphanumeric, underscores)',
    example: 'supervisor',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Role name must contain only lowercase letters, numbers, and underscores',
  })
  name: string;

  @ApiProperty({
    description: 'Display name for UI',
    example: 'Superviseur',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Superviseur d\'équipe avec accès monitoring',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Hierarchical level (1-10, 1=lowest, 10=highest)',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with the same hierarchical level',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  canCallSameLevel?: boolean = true;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with lower hierarchical levels',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  canCallLowerLevel?: boolean = false;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with higher hierarchical levels',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  canCallHigherLevel?: boolean = false;
}
