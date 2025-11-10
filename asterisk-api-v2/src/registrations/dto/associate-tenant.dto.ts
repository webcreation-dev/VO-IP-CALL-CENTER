import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssociateTenantDto {
  @ApiProperty({
    description: 'ID of the tenant to associate with the trunk',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  tenantId: number;
}
