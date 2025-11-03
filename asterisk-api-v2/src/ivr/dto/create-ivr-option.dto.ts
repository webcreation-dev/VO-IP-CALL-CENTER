import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Matches, ValidateNested } from "class-validator";
import { ActionConfigDto } from "./action-config.dto";
export class CreateIvrOptionDto {
    @IsString()
    @Matches(/^[0-9*#]$/, { message: 'Digit doit être 0-9, *, ou #' })
    digit: string;
  
    @ValidateNested()
    @Type(() => ActionConfigDto)
    action: ActionConfigDto;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsNumber()
    priority?: number = 0;
  
    @IsOptional()
    @IsBoolean()
    is_active?: boolean = true;
  }
  