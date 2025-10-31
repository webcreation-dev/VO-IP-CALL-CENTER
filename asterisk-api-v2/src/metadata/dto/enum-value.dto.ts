import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocalizedTextDto {
  @ApiProperty({ example: 'Administrator', description: 'English text' })
  en: string;

  @ApiProperty({ example: 'Administrateur', description: 'French text' })
  fr: string;
}

export class UIMetadataDto {
  @ApiPropertyOptional({ example: '#e74c3c', description: 'Suggested color (hex format)' })
  color?: string;

  @ApiPropertyOptional({ example: 'shield-check', description: 'Suggested icon name' })
  icon?: string;

  @ApiPropertyOptional({
    enum: ['success', 'warning', 'danger', 'info', 'secondary'],
    example: 'danger',
    description: 'Badge style',
  })
  badge?: 'success' | 'warning' | 'danger' | 'info' | 'secondary';

  @ApiPropertyOptional({ example: 1, description: 'Display order' })
  order?: number;

  @ApiPropertyOptional({ example: false, description: 'Is deprecated' })
  deprecated?: boolean;
}

export class EnumValueDto {
  @ApiProperty({ example: 'admin', description: 'Unique key/identifier' })
  key: string;

  @ApiProperty({ type: LocalizedTextDto, description: 'Localized label' })
  label: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, description: 'Localized description' })
  description: LocalizedTextDto;

  @ApiPropertyOptional({ type: UIMetadataDto, description: 'UI metadata' })
  metadata?: UIMetadataDto;

  @ApiPropertyOptional({ example: 0, description: 'Numeric value (for codes)' })
  numericValue?: number;
}
