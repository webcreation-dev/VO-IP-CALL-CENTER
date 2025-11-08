import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMohClassDto } from './create-moh-class.dto';

export class UpdateMohClassDto extends PartialType(
  OmitType(CreateMohClassDto, ['name'] as const),
) {}
