import { Injectable, OnModuleInit } from "@nestjs/common";
import { IvrOrchestratorService } from "../services/ivr-orchestrator.service";
import { AriService } from "src/core/asterisk/ari/ari.service";
import { CustomLoggerService } from "src/core/logger/logger.service";

// ivr-ari.gateway.ts - Connecte les événements ARI à l'orchestrateur IVR
@Injectable()
export class IvrAriGateway implements OnModuleInit {
  constructor(
    private ariService: AriService,
    private orchestrator: IvrOrchestratorService,
    private logger: CustomLoggerService,
  ) {}

  onModuleInit() {
    // Note: Stasis app 'ivr-app' is started centrally by AriService
    this.setupEventHandlers();
    this.logger.log('IVR ARI Gateway initialized');
  }

  private setupEventHandlers() {
    // Nouvel appel entrant
    this.ariService.on('StasisStart', async (event, channel) => {
      this.logger.log(`Nouvel appel: ${channel.id} (DID: ${event.args[0]})`);
      
      const did = event.args[0];
      const callerId = channel.caller?.number || 'unknown';

      await this.orchestrator.handleIncomingCall(channel, did, callerId);
    });

    // DTMF reçu - Log seulement, l'orchestrateur gère via son propre listener
    this.ariService.on('ChannelDtmfReceived', (event) => {
      this.logger.debug(`DTMF reçu: ${event.digit} sur ${event.channel.id}`);
    });

    // Fin de playback
    this.ariService.on('PlaybackFinished', (event) => {
      this.logger.debug(`Playback terminé: ${event.playback.id}`);
    });

    // Channel raccroché
    this.ariService.on('StasisEnd', async (event, channel) => {
      this.logger.log(`Appel terminé: ${channel.id}`);
      await this.orchestrator.cleanupSession(channel.id);
    });
  }
}