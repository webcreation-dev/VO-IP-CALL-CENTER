import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteCommandDto {
  @ApiProperty({
    description: 'Asterisk CLI command to execute',
    example: 'core show channels',
  })
  @IsString()
  @IsNotEmpty()
  command: string;
}
