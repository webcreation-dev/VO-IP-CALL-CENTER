import { Module, Global } from '@nestjs/common';
import { AriService } from './ari.service';

@Global() // Make ARI service available globally
@Module({
  providers: [AriService],
  exports: [AriService],
})
export class AriModule {}
