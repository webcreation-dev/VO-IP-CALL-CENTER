import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlindTransferDto {
  @ApiProperty({
    description: 'Channel name to transfer',
    example: 'PJSIP/t1_101-00000001',
  })
  @IsString()
  @IsNotEmpty()
  channelName: string;

  @ApiProperty({
    description: 'Destination extension',
    example: '102',
  })
  @IsString()
  @IsNotEmpty()
  extension: string;

  @ApiProperty({
    description: 'Dialplan context',
    example: 'from-internal',
  })
  @IsString()
  @IsNotEmpty()
  context: string;
}
