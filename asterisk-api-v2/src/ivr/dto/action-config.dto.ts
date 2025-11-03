import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";

  // action-config.dto.ts
  export class ActionConfigDto {
    @IsEnum(['queue', 'endpoint', 'submenu', 'playback', 'hangup', 'voicemail', 'callback', 'external_api'])
    type: string;
  
    @IsOptional()
    @IsString()
    target?: string;
  
    @IsOptional()
    @IsString()
    announce?: string;
  
    @IsOptional()
    @IsNumber()
    timeout?: number;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    sounds?: string[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => ActionConfigDto)
    then?: ActionConfigDto;
  
    @IsOptional()
    @IsString()
    cause?: string;
  
    @IsOptional()
    @IsString()
    mailbox?: string;
  
    @IsOptional()
    @IsString()
    queue_id?: string;
  
    @IsOptional()
    @IsString()
    message?: string;
  
    @IsOptional()
    @IsUrl()
    url?: string;
  
    @IsOptional()
    @IsEnum(['GET', 'POST'])
    method?: 'GET' | 'POST';
  }
  