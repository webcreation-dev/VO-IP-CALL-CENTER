import { IsString, IsNumber, IsOptional, IsIn, IsObject, IsArray, MinLength, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CustomRoleDto } from '../../roles/dto/custom-role.dto';

/**
 * DTO for creating a new tenant context
 */
export class CreateTenantContextDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  @IsNumber()
  tenantId: number;

  @ApiProperty({
    description: 'Context name (will be prefixed with tenant ID)',
    example: 'sales',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Context description',
    example: 'Sales department context',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Dialplan configuration',
    example: {
      allowInbound: true,
      allowOutbound: true,
      allowInternal: true,
      allowInterContext: false,
      allowedContexts: [],
    },
  })
  @IsObject()
  @IsOptional()
  dialplanConfig?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Role strategy for this context',
    example: 'context-specific',
    enum: ['context-specific', 'use-tenant-roles'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['context-specific', 'use-tenant-roles'])
  roleStrategy?: 'context-specific' | 'use-tenant-roles';

  @ApiPropertyOptional({
    description: 'Role preset ID to apply (required if roleStrategy is context-specific)',
    example: 'call_center_standard',
    enum: ['call_center_standard', 'technical_support', 'flat_organization'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['call_center_standard', 'technical_support', 'flat_organization'])
  presetId?: string;

  @ApiPropertyOptional({
    description: 'Custom roles to apply (optional modifications to preset roles). If provided, these roles will be created instead of the preset roles.',
    type: [CustomRoleDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomRoleDto)
  customRoles?: CustomRoleDto[];
}
