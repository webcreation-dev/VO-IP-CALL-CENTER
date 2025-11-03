// dto/update-did-mapping.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDidMappingDto } from './create-did-mapping.dto';

export class UpdateDidMappingDto extends PartialType(CreateDidMappingDto) {}