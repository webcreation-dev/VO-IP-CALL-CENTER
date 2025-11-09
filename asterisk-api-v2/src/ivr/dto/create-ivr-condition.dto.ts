// dto/create-ivr-condition.dto.ts (VERSION COMPLÈTE)
import { IsEnum, IsObject, IsOptional, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ActionConfigDto } from './action-config.dto';

export enum ConditionType {
  TIME = 'time',
  CALLER_ID = 'caller_id',
  DID = 'did',
  CUSTOM = 'custom',
  TIME_BASED = 'time_based',
}

export class CreateIvrConditionDto {
  @IsEnum(ConditionType)
  condition_type: ConditionType;

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