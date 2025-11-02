import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export class OriginateCallDto {
  // TEST MODE: optional tenantId for testing without auth
  @ApiPropertyOptional({ description: 'Tenant ID (for testing)', example: 1 })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    description: 'Endpoint username to originate from',
    example: '101',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({
    description: 'Destination number to call',
    example: '0123456789',
  })
  @IsString()
  @IsNotEmpty()
  extension: string;

  @ApiPropertyOptional({
    description: 'Dialplan context',
    example: 'default',
    default: 'default',
  })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({
    description: 'Call timeout in seconds',
    example: 30,
    default: 30,
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(300)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Caller ID name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  callerIdName?: string;

  @ApiPropertyOptional({
    description: 'Caller ID number',
    example: '101',
  })
  @IsString()
  @IsOptional()
  callerIdNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional channel variables',
    example: { CALLERID_TAG: 'sales' },
  })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
