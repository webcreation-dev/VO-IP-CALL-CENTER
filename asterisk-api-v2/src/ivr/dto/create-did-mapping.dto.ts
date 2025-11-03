import { IsBoolean, IsNumber, IsOptional, IsString, Matches } from "class-validator";

  
  // create-did-mapping.dto.ts
  export class CreateDidMappingDto {
    @IsString()
    @Matches(/^\+?[0-9]+$/, { message: 'DID invalide' })
    did: string;
  
    @IsNumber()
    menu_id: number;
  
    @IsOptional()
    @IsBoolean()
    is_active?: boolean = true;
  }