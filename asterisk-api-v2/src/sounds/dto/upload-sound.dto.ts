import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength, IsInt, Min, Allow } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SoundFileCategory } from '../entities/sound-file.entity';

export class UploadSoundDto {
  @ApiPropertyOptional({
    description: 'Display name for the sound file',
    example: 'Company Welcome Message',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Category of the sound file',
    enum: SoundFileCategory,
    example: SoundFileCategory.MOH,
    default: SoundFileCategory.OTHER,
  })
  @IsEnum(SoundFileCategory)
  @IsOptional()
  category?: SoundFileCategory = SoundFileCategory.OTHER;

  @ApiPropertyOptional({
    description: 'Description of the sound file',
    example: 'Background music for queue hold time',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tenant ID (required for super admins, auto-filled for tenant admins)',
    example: 1,
  })
  @Allow()
  @Type(() => Number)
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  @IsOptional()
  tenantId?: number;
}
