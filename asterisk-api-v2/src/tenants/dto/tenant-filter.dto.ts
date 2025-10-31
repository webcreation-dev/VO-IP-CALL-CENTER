import { IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class TenantFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum endpoint limit',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minMaxEndpoints?: number;

  @ApiPropertyOptional({
    description: 'Maximum endpoint limit',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxMaxEndpoints?: number;

  @ApiPropertyOptional({
    description: 'Minimum queue limit',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minMaxQueues?: number;

  @ApiPropertyOptional({
    description: 'Maximum queue limit',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxMaxQueues?: number;
}
