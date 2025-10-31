import { IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class QueueMemberFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by paused status',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPaused?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum penalty value',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPenalty?: number;

  @ApiPropertyOptional({
    description: 'Maximum penalty value',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxPenalty?: number;
}
