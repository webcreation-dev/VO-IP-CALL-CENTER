import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class AddMemberDto {
  // TEST MODE: optional tenantId for testing without auth
  @ApiPropertyOptional({ description: 'Tenant ID (for testing)', example: 1 })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    description: 'Endpoint username to add',
    example: '101',
  })
  @IsString()
  @IsNotEmpty()
  endpointName: string;

  @ApiPropertyOptional({
    description: 'Member display name',
    example: 'Agent 101',
  })
  @IsString()
  @IsOptional()
  memberName?: string;

  @ApiPropertyOptional({
    description: 'Penalty (priority, lower = higher priority)',
    example: 0,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  penalty?: number;

  @ApiPropertyOptional({
    description: 'Start paused',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  paused?: boolean;

  @ApiPropertyOptional({
    description: 'Wrap-up time (seconds)',
    example: 10,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  wrapuptime?: number;
}
