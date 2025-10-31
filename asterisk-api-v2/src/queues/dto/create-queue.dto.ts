import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';

export enum QueueStrategy {
  RINGALL = 'ringall',
  LEASTRECENT = 'leastrecent',
  FEWESTCALLS = 'fewestcalls',
  RANDOM = 'random',
  RRMEMORY = 'rrmemory',
}

/**
 * Create Queue DTO
 */
export class CreateQueueDto {
  @ApiProperty({
    description: 'Queue name (unique within tenant)',
    example: 'support',
    minLength: 3,
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Queue name must contain only letters, numbers, underscores and hyphens',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Queue description',
    example: 'Customer support queue',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Queue strategy',
    enum: QueueStrategy,
    default: QueueStrategy.RINGALL,
  })
  @IsEnum(QueueStrategy)
  @IsOptional()
  strategy?: QueueStrategy;

  @ApiPropertyOptional({
    description: 'Timeout for ringing (seconds)',
    example: 15,
    default: 15,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(300)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Retry delay (seconds)',
    example: 5,
    default: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(60)
  retry?: number;

  @ApiPropertyOptional({
    description: 'Maximum queue length (0 = unlimited)',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxlen?: number;

  @ApiPropertyOptional({
    description: 'Wrap-up time (seconds)',
    example: 10,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(3600)
  wrapuptime?: number;

  @ApiPropertyOptional({
    description: 'Music on hold class',
    example: 'default',
  })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  musicclass?: string;

  @ApiPropertyOptional({
    description: 'Service level threshold (seconds)',
    example: 60,
    default: 60,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  servicelevel?: number;
}
