import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsBoolean, ValidateNested, ArrayMinSize, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PresetRoleDto } from './preset-role.dto';

/**
 * DTO pour mettre à jour un preset existant
 * Utilisable uniquement par ADMIN
 *
 * Note: Le presetId ne peut pas être modifié après création
 */
export class UpdatePresetDto {
  @ApiPropertyOptional({
    description: 'Nom d\'affichage du preset',
    example: 'Mon Preset Mis à Jour',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description du preset',
    example: 'Description mise à jour',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Indique si le preset est actif',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Liste des rôles du preset (remplace tous les rôles existants)',
    type: [PresetRoleDto],
    minItems: 1,
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PresetRoleDto)
  roles?: PresetRoleDto[];
}
