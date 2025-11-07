import { ApiProperty } from '@nestjs/swagger';

/**
 * Role Preset DTO
 *
 * Represents a predefined role configuration template.
 */
export class RolePresetDto {
  @ApiProperty({
    description: 'Unique preset identifier',
    example: 'call_center_standard',
  })
  id: string;

  @ApiProperty({
    description: 'Display name',
    example: 'Centre d\'appels standard',
  })
  name: string;

  @ApiProperty({
    description: 'Preset description',
    example: 'Hiérarchie classique pour centre d\'appels avec agents, superviseurs et managers',
  })
  description: string;

  @ApiProperty({
    description: 'List of roles in this preset',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'agent' },
        displayName: { type: 'string', example: 'Agent' },
        description: { type: 'string' },
        level: { type: 'number', example: 1 },
        canCallSameLevel: { type: 'boolean', example: true },
        canCallLowerLevel: { type: 'boolean', example: false },
        canCallHigherLevel: { type: 'boolean', example: false },
      },
    },
  })
  roles: Array<{
    name: string;
    displayName: string;
    description?: string;
    level: number;
    canCallSameLevel: boolean;
    canCallLowerLevel: boolean;
    canCallHigherLevel: boolean;
  }>;
}
