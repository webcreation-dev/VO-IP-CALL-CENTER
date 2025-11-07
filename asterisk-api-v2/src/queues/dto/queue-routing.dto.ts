import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

/**
 * Queue Routing DTO
 *
 * Defines how calls should be routed to a queue via dialplan extensions.
 *
 * When creating a queue, you can optionally specify routing rules that will
 * automatically create extension entries in the dialplan to route calls to the queue.
 *
 * @example
 * {
 *   "extensionPattern": "_3XXX",     // Route all 3000-3999 calls to this queue
 *   "priority": 1,                    // First priority in dialplan
 *   "queueOptions": "t"               // Allow transfer option
 * }
 */
export class QueueRoutingDto {
  /**
   * Extension pattern that routes to this queue
   *
   * Can be:
   * - Specific number: "3000"
   * - Pattern with wildcards: "_3XXX" (3000-3999)
   * - Pattern with ranges: "_[345]XXX" (3000-5999)
   *
   * See Asterisk dialplan pattern matching documentation
   */
  @ApiProperty({
    description: 'Extension pattern to route to this queue (Asterisk pattern syntax)',
    example: '_3XXX',
    minLength: 1,
    maxLength: 40,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[_0-9a-zA-Z\[\]\-\.\!]+$/, {
    message:
      'Extension pattern must be valid Asterisk pattern (alphanumeric, _, [], -, ., !)',
  })
  extensionPattern: string;

  /**
   * Priority in dialplan (default: 1)
   *
   * For most queue routing, priority 1 is sufficient.
   * Higher priorities are used for multi-step dialplan logic.
   */
  @ApiPropertyOptional({
    description: 'Dialplan priority for this routing rule (default: 1)',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  priority?: number;

  /**
   * Queue application options
   *
   * Common options:
   * - t: Allow caller to transfer
   * - r: Ring instead of music on hold
   * - n: No announce position
   * - c: Continue in dialplan if queue is full
   *
   * Multiple options can be combined: "tr"
   *
   * See Asterisk Queue application documentation
   */
  @ApiPropertyOptional({
    description: 'Queue options (e.g., "t" for transfer, "r" for ringing)',
    example: 't',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[a-zA-Z]*$/, {
    message: 'Queue options must contain only letters',
  })
  queueOptions?: string;
}
