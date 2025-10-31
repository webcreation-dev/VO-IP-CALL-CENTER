import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class QueueFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by queue name (exact match)',
    example: 'support',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by queue strategy',
    example: 'ringall',
    enum: ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear', 'wrandom'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear', 'wrandom'])
  strategy?: string;

  @ApiPropertyOptional({
    description: 'Minimum number of calls in queue',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCalls?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of calls in queue',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCalls?: number;
}
