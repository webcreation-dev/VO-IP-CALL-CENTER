// dto/create-ivr-condition.dto.ts (VERSION COMPLÈTE)
import { IsEnum, IsObject, IsOptional, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActionConfigDto } from './action-config.dto';

export class CreateIvrConditionDto {
  @IsEnum(['time', 'caller_id', 'did', 'custom'])
  condition_type: 'time' | 'caller_id' | 'did' | 'custom';

  @IsObject()
  condition_config: {
    // Pour 'time'
    days?: number[];
    start_time?: string;
    end_time?: string;
    timezone?: string;
    
    // Pour 'caller_id'
    caller_pattern?: string;
    
    // Pour 'did'
    did_pattern?: string;
    
    // Pour 'custom'
    custom_rule?: string;
  };

  @ValidateNested()
  @Type(() => ActionConfigDto)
  action: ActionConfigDto;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}