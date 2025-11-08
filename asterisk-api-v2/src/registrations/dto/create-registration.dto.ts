import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  Max,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty({
    description: 'Unique identifier for the SIP trunk',
    example: 'operator_trunk',
    minLength: 3,
    maxLength: 40,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Name can only contain letters, numbers, underscores and hyphens',
  })
  name: string;

  @ApiProperty({
    description: 'Remote SIP server (IP:PORT or hostname:PORT)',
    example: '197.234.218.195:25060',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9.-]+(:\d{1,5})?$/, {
    message: 'Remote host must be a valid hostname or IP with optional port',
  })
  remote_host: string;

  @ApiProperty({
    description: 'SIP username for authentication',
    example: '62908521',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username: string;

  @ApiProperty({
    description: 'SIP password for authentication',
    example: '167d458f-8',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  password: string;

  @ApiProperty({
    description: 'Transport to use (must exist in pjsip.conf)',
    example: 'transport-udp',
    default: 'transport-udp',
  })
  @IsString()
  transport: string = 'transport-udp';

  @ApiProperty({
    description: 'Dialplan context for incoming calls from this trunk',
    example: 'from-trunk',
    default: 'from-trunk',
  })
  @IsString()
  context: string = 'from-trunk';

  @ApiPropertyOptional({
    description: 'Enable sending registrations',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sends_registrations?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable authentication',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sends_auth?: boolean = true;

  @ApiPropertyOptional({
    description: 'Client URI (defaults to sip:username@remote_host)',
    example: 'sip:62908521@197.234.218.195:25060',
  })
  @IsString()
  @IsOptional()
  client_uri?: string;

  @ApiPropertyOptional({
    description: 'Server URI (defaults to sip:remote_host)',
    example: 'sip:197.234.218.195:25060',
  })
  @IsString()
  @IsOptional()
  server_uri?: string;

  @ApiPropertyOptional({
    description: 'Registration retry interval in seconds',
    default: 60,
    minimum: 10,
    maximum: 3600,
  })
  @IsInt()
  @Min(10)
  @Max(3600)
  @IsOptional()
  retry_interval?: number = 60;

  @ApiPropertyOptional({
    description: 'Registration expiration in seconds',
    default: 3600,
    minimum: 60,
    maximum: 7200,
  })
  @IsInt()
  @Min(60)
  @Max(7200)
  @IsOptional()
  expiration?: number = 3600;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  max_retries?: number = 10;

  @ApiPropertyOptional({
    description: 'Forbidden retry interval in seconds',
    default: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  forbidden_retry_interval?: number = 0;

  @ApiPropertyOptional({
    description: 'Enable line parameter',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  line?: boolean = false;

  @ApiPropertyOptional({
    description: 'Outbound proxy',
    example: 'sip:proxy.example.com:5060',
  })
  @IsString()
  @IsOptional()
  outbound_proxy?: string;

  @ApiPropertyOptional({
    description: 'Enable path support',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  support_path?: boolean = false;

  @ApiPropertyOptional({
    description: 'Destination type for incoming calls (queue, extension, ivr)',
    example: 'queue',
    enum: ['queue', 'extension', 'ivr'],
  })
  @IsString()
  @IsOptional()
  destination_type?: string;

  @ApiPropertyOptional({
    description: 'Destination identifier (queue name, extension number, ivr menu id)',
    example: 'support',
  })
  @IsString()
  @IsOptional()
  destination_id?: string;

  @ApiPropertyOptional({
    description: 'DID pattern to match incoming calls (Asterisk dialplan pattern)',
    example: '_X.',
    default: '_X.',
  })
  @IsString()
  @IsOptional()
  did_pattern?: string = '_X.';
}
