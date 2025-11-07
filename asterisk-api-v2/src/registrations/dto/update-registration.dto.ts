import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRegistrationDto } from './create-registration.dto';

/**
 * DTO for updating a SIP trunk registration
 * All fields from CreateRegistrationDto are optional except 'name' which is omitted
 * (the name is provided in the URL path parameter)
 */
export class UpdateRegistrationDto extends PartialType(
  OmitType(CreateRegistrationDto, ['name'] as const),
) {}
