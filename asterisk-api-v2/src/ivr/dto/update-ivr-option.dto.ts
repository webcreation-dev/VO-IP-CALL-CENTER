// dto/update-ivr-option.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateIvrOptionDto } from './create-ivr-option.dto';

export class UpdateIvrOptionDto extends PartialType(CreateIvrOptionDto) {}