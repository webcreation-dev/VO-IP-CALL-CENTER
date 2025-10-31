import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto, EnumValueDto } from './enum-value.dto';

export class EnumCategoryDto {
  @ApiProperty({ example: 'user-roles', description: 'Category identifier' })
  category: string;

  @ApiProperty({ type: LocalizedTextDto, description: 'Localized category name' })
  label: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, description: 'Localized category description' })
  description: LocalizedTextDto;

  @ApiProperty({ example: 'authentication', description: 'Source module' })
  module: string;

  @ApiProperty({ type: [EnumValueDto], description: 'All enum values' })
  values: EnumValueDto[];
}

export class EnumCategorySummaryDto {
  @ApiProperty({ example: 'user-roles', description: 'Category identifier' })
  category: string;

  @ApiProperty({ type: LocalizedTextDto, description: 'Localized category name' })
  label: LocalizedTextDto;

  @ApiProperty({ example: 'authentication', description: 'Source module' })
  module: string;

  @ApiProperty({ example: 4, description: 'Number of values in this category' })
  valuesCount: number;
}
