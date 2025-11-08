import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength, MinLength, Matches, IsInt, Min, Allow } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MohMode, MohSort } from '../entities/moh-class.entity';

export class CreateMohClassDto {
  @ApiProperty({
    description: 'Name of the Music on Hold class',
    example: 'company_music',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Name can only contain letters, numbers, underscores and hyphens',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'MoH mode',
    enum: MohMode,
    example: MohMode.FILES,
    default: MohMode.FILES,
  })
  @IsEnum(MohMode)
  @IsOptional()
  mode?: MohMode = MohMode.FILES;

  @ApiPropertyOptional({
    description: 'Directory containing music files (required for files mode)',
    example: '/var/lib/asterisk/sounds/custom/t1/moh',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  directory?: string;

  @ApiPropertyOptional({
    description: 'Custom application command (required for custom mode)',
    example: '/usr/bin/mpg123 -q -r 8000 -f 8192 -b 0 --mono -s',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  application?: string;

  @ApiPropertyOptional({
    description: 'Audio format',
    example: 'wav',
    default: 'wav',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  format?: string = 'wav';

  @ApiPropertyOptional({
    description: 'Sort order for files',
    enum: MohSort,
    example: MohSort.RANDOM,
    default: MohSort.RANDOM,
  })
  @IsEnum(MohSort)
  @IsOptional()
  sort?: MohSort = MohSort.RANDOM;

  @ApiPropertyOptional({
    description: 'Description of the MoH class',
    example: 'Company background music for queue hold time',
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
