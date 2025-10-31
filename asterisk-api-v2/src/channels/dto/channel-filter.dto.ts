import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { BaseFilterDto } from '../../common/dto/base-filter.dto';

export class ChannelFilterDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by channel state',
    example: 'Up',
    enum: ['Down', 'Rsrvd', 'OffHook', 'Dialing', 'Ring', 'Ringing', 'Up', 'Busy'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['Down', 'Rsrvd', 'OffHook', 'Dialing', 'Ring', 'Ringing', 'Up', 'Busy'])
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by caller ID',
    example: '101',
  })
  @IsString()
  @IsOptional()
  callerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by call direction',
    example: 'inbound',
    enum: ['inbound', 'outbound'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['inbound', 'outbound'])
  direction?: string;
}
