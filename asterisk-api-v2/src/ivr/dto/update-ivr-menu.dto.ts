// dto/update-ivr-menu.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateIvrMenuDto } from './create-ivr-menu.dto';

export class UpdateIvrMenuDto extends PartialType(CreateIvrMenuDto) {}