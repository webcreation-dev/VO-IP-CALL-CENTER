import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateMemberDto {
  @ApiPropertyOptional({
    description: 'Penalty',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  penalty?: number;

  @ApiPropertyOptional({
    description: 'Wrap-up time (seconds)',
    example: 15,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  wrapuptime?: number;
}
