// dto/reorder-options.dto.ts
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class OptionOrderItem {
  @IsNumber()
  optionId: number;

  @IsNumber()
  priority: number;
}

export class ReorderOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionOrderItem)
  order: OptionOrderItem[];
}