import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Recipient endpoint or address',
    example: 'sip:101@domain.com',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({
    description: 'Sender endpoint or address',
    example: 'asterisk',
  })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiProperty({
    description: 'Message body',
    example: 'Hello from Asterisk',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
