import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for endpoint SIP credentials response
 * Used when admins need to retrieve credentials for connecting softphone
 */
export class EndpointCredentialsDto {
  @ApiProperty({
    description: 'SIP username (random generated)',
    example: 'qwer5678',
  })
  username: string;

  @ApiProperty({
    description: 'SIP password',
    example: 'SecurePass123',
  })
  password: string;

  @ApiProperty({
    description: 'SIP server IP address (for WebSocket connection)',
    example: '161.97.106.134',
  })
  server: string;

  @ApiProperty({
    description: 'SIP domain (for SIP URI)',
    example: 'pishon.kabou.bj',
  })
  domain: string;

  @ApiProperty({
    description: 'WebSocket port for WebRTC',
    example: 8089,
  })
  port: number;

  @ApiProperty({
    description: 'Display name for the endpoint',
    example: 'Agent 1000',
  })
  displayName: string;

  @ApiProperty({
    description: 'SIP realm for authentication',
    example: 'pishon.kabou.bj',
  })
  realm: string;

  @ApiProperty({
    description: 'Endpoint username/ID',
    example: 't1_1000',
  })
  endpointId: string;
}
