import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class RecordingFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by call ID',
    example: '1234567890.123',
  })
  @IsString()
  @IsOptional()
  callId?: string;

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
    description: 'Filter by recording format',
    example: 'wav',
    enum: ['wav', 'gsm', 'mp3', 'g722', 'ulaw'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['wav', 'gsm', 'mp3', 'g722', 'ulaw'])
  format?: string;

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
    description: 'Minimum file size in bytes',
    example: 1024,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 10485760,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxSize?: number;

  @ApiPropertyOptional({
    description: 'Include deleted recordings',
    example: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
