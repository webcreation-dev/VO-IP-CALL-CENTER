import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SoundFileCategory } from '../entities/sound-file.entity';

export class SoundFileQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: SoundFileCategory,
    example: SoundFileCategory.MOH,
  })
  @IsEnum(SoundFileCategory)
  @IsOptional()
  category?: SoundFileCategory;

  @ApiPropertyOptional({
    description: 'Page number (starts at 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
