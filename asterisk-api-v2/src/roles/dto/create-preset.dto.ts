import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested, ArrayMinSize, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PresetRoleDto } from './preset-role.dto';

/**
 * DTO pour créer un nouveau preset de rôles
 * Utilisable uniquement par ADMIN
 */
export class CreatePresetDto {
  @ApiProperty({
    description: 'Identifiant technique unique du preset',
    example: 'my_custom_preset',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  presetId: string;

  @ApiProperty({
    description: 'Nom d\'affichage du preset',
    example: 'Mon Preset Personnalisé',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Description du preset',
    example: 'Hiérarchie personnalisée pour mon organisation',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Liste des rôles du preset (minimum 1 rôle requis)',
    type: [PresetRoleDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PresetRoleDto)
  roles: PresetRoleDto[];
}
