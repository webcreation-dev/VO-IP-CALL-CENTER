// ivr.module.ts (version complète)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { IvrMenu } from './entities/ivr-menu.entity';
import { IvrOption } from './entities/ivr-option.entity';
import { IvrCondition } from './entities/ivr-condition.entity';
import { IvrDidMapping } from './entities/ivr-did-mapping.entity';
import { IvrAudioFile } from './entities/ivr-audio-file.entity';

// Services
import { IvrService } from './services/ivr.service';
import { IvrOrchestratorService } from './services/ivr-orchestrator.service';
import { IvrActionExecutorService } from './services/ivr-action-executor.service';
import { IvrAudioService } from './services/ivr-audio.service';

// Controllers
import { IvrMenusController } from './controllers/ivr-menus.controller';
import { IvrOptionsController } from './controllers/ivr-options.controller';
import { IvrConditionsController } from './controllers/ivr-conditions.controller';
import { IvrDidMappingsController } from './controllers/ivr-did-mappings.controller';
import { IvrAudioController } from './controllers/ivr-audio.controller';

// Gateway
import { IvrAriGateway } from './gateways/ivr-ari.gateway';

// Modules externes  
import { AmiModule } from '../core/asterisk/ami/ami.module';
import { AriModule } from '../core/asterisk/ari/ari.module';
import { QueuesModule } from '../queues/queues.module';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IvrMenu,
      IvrOption,
      IvrCondition,
      IvrDidMapping,
      IvrAudioFile,
    ]),
    AmiModule,
    AriModule,
    HttpModule,
    QueuesModule,
    EndpointsModule,
  ],
  providers: [
    IvrService,
    IvrOrchestratorService,
    IvrActionExecutorService,
    IvrAudioService,
    IvrAriGateway,
  ],
  controllers: [
    IvrMenusController,
    IvrOptionsController,
    IvrConditionsController,
    IvrDidMappingsController,
    IvrAudioController,
  ],
  exports: [
    IvrService,
    IvrOrchestratorService,
    IvrAudioService,
  ],
})
export class IvrModule {}