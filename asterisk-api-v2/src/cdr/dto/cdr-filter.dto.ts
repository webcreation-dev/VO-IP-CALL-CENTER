import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class CdrFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by source number',
    example: '101',
  })
  @IsString()
  @IsOptional()
  src?: string;

  @ApiPropertyOptional({
    description: 'Filter by destination number',
    example: '0123456789',
  })
  @IsString()
  @IsOptional()
  dst?: string;

  @ApiPropertyOptional({
    description: 'Filter by disposition',
    example: 'ANSWERED',
    enum: ['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CONGESTION'])
  disposition?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO format)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Minimum duration in seconds',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({
    description: 'Maximum duration in seconds',
    example: 3600,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDuration?: number;

  @ApiPropertyOptional({
    description: 'Filter by call direction',
    example: 'inbound',
    enum: ['inbound', 'outbound'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['inbound', 'outbound'])
  direction?: string;

  @ApiPropertyOptional({
    description: 'Filter by account code',
    example: 'SALES001',
  })
  @IsString()
  @IsOptional()
  accountcode?: string;
}
