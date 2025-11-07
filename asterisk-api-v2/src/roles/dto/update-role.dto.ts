import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Update Role DTO
 *
 * Defines the data that can be updated for an existing role.
 * Note: name and level cannot be updated to maintain consistency.
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Display name for UI',
    example: 'Superviseur Senior',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Superviseur d\'équipe avec accès monitoring avancé',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with the same hierarchical level',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  canCallSameLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with lower hierarchical levels',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  canCallLowerLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Allow calling endpoints with higher hierarchical levels',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  canCallHigherLevel?: boolean;

  @ApiPropertyOptional({
    description: 'Active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
