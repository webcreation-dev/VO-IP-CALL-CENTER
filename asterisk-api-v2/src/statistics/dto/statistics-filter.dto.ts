import { IsOptional, IsDateString, IsInt, IsEnum, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum GroupByPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class StatisticsFilterDto {
  @ApiPropertyOptional({
    description: 'Tenant ID filter',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenant_id?: number;

  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Limit results',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Group by period',
    enum: GroupByPeriod,
    example: GroupByPeriod.DAY,
  })
  @IsOptional()
  @IsEnum(GroupByPeriod)
  group_by?: GroupByPeriod;
}
