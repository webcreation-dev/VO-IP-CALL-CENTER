import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateRoutingDto {
  @ApiPropertyOptional({
    description: 'Destination type for incoming calls (queue, extension, ivr, null to disable)',
    example: 'queue',
    enum: ['queue', 'extension', 'ivr', null],
  })
  @IsString()
  @IsOptional()
  @IsIn(['queue', 'extension', 'ivr'])
  destination_type?: string | null;

  @ApiPropertyOptional({
    description: 'Destination identifier (queue name, extension number, ivr menu id)',
    example: 'support',
  })
  @IsString()
  @IsOptional()
  destination_id?: string | null;

  @ApiPropertyOptional({
    description: 'DID pattern to match incoming calls (Asterisk dialplan pattern)',
    example: '_X.',
    default: '_X.',
  })
  @IsString()
  @IsOptional()
  did_pattern?: string;
}
