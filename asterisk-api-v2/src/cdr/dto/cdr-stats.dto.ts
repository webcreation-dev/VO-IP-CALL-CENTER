import { ApiProperty } from '@nestjs/swagger';

export class CdrStatsDto {
  @ApiProperty({
    description: 'Total number of calls',
    example: 1250,
  })
  totalCalls: number;

  @ApiProperty({
    description: 'Number of answered calls',
    example: 1100,
  })
  answeredCalls: number;

  @ApiProperty({
    description: 'Number of missed calls',
    example: 150,
  })
  missedCalls: number;

  @ApiProperty({
    description: 'Average call duration in seconds',
    example: 145.5,
  })
  avgDuration: number;

  @ApiProperty({
    description: 'Total billable seconds',
    example: 159500,
  })
  totalBillsec: number;

  @ApiProperty({
    description: 'Answer rate percentage',
    example: 88.0,
  })
  answerRate: number;
}
