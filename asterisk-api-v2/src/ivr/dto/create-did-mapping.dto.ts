import { IsBoolean, IsNumber, IsOptional, IsString, Matches } from "class-validator";

  
  // create-did-mapping.dto.ts
  export class CreateDidMappingDto {
    @IsString()
    @Matches(/^\+?[0-9_]+$/, { message: 'DID invalide (format: +33123456789 ou +331________ pour pattern)' })
    did: string;
  
    @IsNumber()
    menu_id: number;
  
    @IsOptional()
    @IsBoolean()
    is_active?: boolean = true;
  }