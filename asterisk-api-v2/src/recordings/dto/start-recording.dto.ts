import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class StartRecordingDto {
  // TEST MODE: optional tenantId for testing without auth
  @ApiPropertyOptional({ description: 'Tenant ID (for testing)', example: 1 })
  @IsNumber()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    description: 'Channel ID to record',
    example: '1234567890.123',
  })
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @ApiProperty({
    description: 'Recording name',
    example: 'call-recording-101-20241030',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Recording format',
    example: 'wav',
    default: 'wav',
    enum: ['wav', 'gsm', 'mp3', 'g722', 'ulaw'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['wav', 'gsm', 'mp3', 'g722', 'ulaw'])
  format?: string;

  @ApiPropertyOptional({
    description: 'Maximum duration in seconds (0 = unlimited)',
    example: 3600,
    default: 0,
  })
  @IsOptional()
  maxDurationSeconds?: number;

  @ApiPropertyOptional({
    description: 'Max silence seconds before stopping',
    example: 0,
    default: 0,
  })
  @IsOptional()
  maxSilenceSeconds?: number;
}
