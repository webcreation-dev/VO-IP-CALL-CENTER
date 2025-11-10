import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

/**
 * DTO pour les rôles personnalisés (modifications temporaires)
 *
 * Utilisé par les TENANT_ADMIN lors de la création d'un contexte pour
 * ajuster un preset avant application. Ces modifications ne sont pas
 * sauvegardées dans le preset template.
 *
 * Identique à PresetRoleDto mais représente un concept différent
 * (modification temporaire vs définition de template)
 */
export class CustomRoleDto {
  @ApiProperty({
    description: 'Nom technique du rôle',
    example: 'agent',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Nom d\'affichage du rôle',
    example: 'Agent',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    description: 'Description du rôle',
    example: 'Agent de base gérant les appels clients',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Niveau hiérarchique (1-10, 1=bas, 10=haut)',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  level: number;

  @ApiProperty({
    description: 'Autoriser les appels vers le même niveau',
    example: true,
  })
  @IsBoolean()
  canCallSameLevel: boolean;

  @ApiProperty({
    description: 'Autoriser les appels vers les niveaux inférieurs',
    example: false,
  })
  @IsBoolean()
  canCallLowerLevel: boolean;

  @ApiProperty({
    description: 'Autoriser les appels vers les niveaux supérieurs',
    example: false,
  })
  @IsBoolean()
  canCallHigherLevel: boolean;
}
