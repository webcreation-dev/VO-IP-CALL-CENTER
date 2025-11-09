import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";

  // action-config.dto.ts

  export enum ActionType {
    QUEUE = 'queue',
    ENDPOINT = 'endpoint',
    SUBMENU = 'submenu',
    PLAYBACK = 'playback',
    HANGUP = 'hangup',
    VOICEMAIL = 'voicemail',
    CALLBACK = 'callback',
    EXTERNAL_API = 'external_api',
    REPEAT = 'repeat',
  }

  export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
  }

  export class ActionConfigDto {
    @IsEnum(ActionType)
    type: ActionType;
  
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
    @IsEnum(HttpMethod)
    method?: HttpMethod;
  }
  