import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class EndpointFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by username (exact match)',
    example: '101',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Filter by device state',
    example: 'NOT_INUSE',
    enum: ['UNKNOWN', 'NOT_INUSE', 'INUSE', 'BUSY', 'INVALID', 'UNAVAILABLE', 'RINGING', 'RINGINUSE', 'ONHOLD'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['UNKNOWN', 'NOT_INUSE', 'INUSE', 'BUSY', 'INVALID', 'UNAVAILABLE', 'RINGING', 'RINGINUSE', 'ONHOLD'])
  deviceState?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by transport protocol',
    example: 'udp',
    enum: ['udp', 'tcp', 'tls', 'ws', 'wss'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['udp', 'tcp', 'tls', 'ws', 'wss'])
  transport?: string;

  @ApiPropertyOptional({
    description: 'Filter by dialplan context',
    example: 'default',
  })
  @IsOptional()
  @IsString()
  context?: string;
}
