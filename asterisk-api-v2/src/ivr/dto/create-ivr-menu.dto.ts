import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from "class-validator";
import { ActionConfigDto } from "./action-config.dto";

// create-ivr-menu.dto.ts
export class CreateIvrMenuDto {
    @IsString()
    @MinLength(2)
    name: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsString()
    welcome_sound: string;
  
    @IsOptional()
    @IsString()
    invalid_sound?: string;
  
    @IsOptional()
    @IsString()
    timeout_sound?: string;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(60)
    timeout?: number = 5;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    max_retries?: number = 3;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    max_digits?: number = 1;
  
    @ValidateNested()
    @Type(() => ActionConfigDto)
    timeout_action: ActionConfigDto;
  
    @ValidateNested()
    @Type(() => ActionConfigDto)
    invalid_action: ActionConfigDto;
  
    @IsOptional()
    @IsBoolean()
    is_active?: boolean = true;
  }
  
  