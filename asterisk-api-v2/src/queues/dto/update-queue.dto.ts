import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { QueueStrategy } from './create-queue.dto';

/**
 * Update Queue DTO
 */
export class UpdateQueueDto {
  @ApiPropertyOptional({
    description: 'Queue description',
    example: 'Updated support queue',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Queue strategy',
    enum: QueueStrategy,
  })
  @IsEnum(QueueStrategy)
  @IsOptional()
  strategy?: QueueStrategy;

  @ApiPropertyOptional({
    description: 'Timeout for ringing (seconds)',
    example: 20,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(300)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Retry delay (seconds)',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  retry?: number;

  @ApiPropertyOptional({
    description: 'Maximum queue length',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxlen?: number;

  @ApiPropertyOptional({
    description: 'Wrap-up time (seconds)',
    example: 15,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(3600)
  wrapuptime?: number;

  @ApiPropertyOptional({
    description: 'Music on hold class',
    example: 'custom',
  })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  musicclass?: string;

  @ApiPropertyOptional({
    description: 'Service level threshold (seconds)',
    example: 90,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  servicelevel?: number;

  @ApiPropertyOptional({
    description: 'Active status',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
