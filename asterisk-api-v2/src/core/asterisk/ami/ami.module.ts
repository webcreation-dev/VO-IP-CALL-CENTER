import { Module, Global } from '@nestjs/common';
import { AmiService } from './ami.service';

@Global() // Make AMI service available globally without explicit imports
@Module({
  providers: [AmiService],
  exports: [AmiService],
})
export class AmiModule {}
