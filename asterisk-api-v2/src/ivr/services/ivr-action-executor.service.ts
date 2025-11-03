import { Injectable } from "@nestjs/common";
import { AriService } from "src/core/asterisk/ari/ari.service";
import { QueuesService } from "src/queues/queues.service";
import { EndpointsService } from "src/endpoints/endpoints.service";
import { IvrAudioService } from "./ivr-audio.service";
import { IvrService } from "./ivr.service";
import { CustomLoggerService } from "src/core/logger/logger.service";
import { TenantPrefixUtil } from "src/common/utils/tenant-prefix.util";
import type { IvrSession } from '../interfaces/ivr-session.interface';
import type { 
  ActionConfig,
  QueueAction,
  EndpointAction,
  SubmenuAction,
  PlaybackAction,
  HangupAction,
  VoicemailAction,
  CallbackAction,
  ExternalApiAction
} from '../interfaces/action-config.interface';

// ivr-action-executor.service.ts
@Injectable()
export class IvrActionExecutorService {
  constructor(
    private ariService: AriService,
    private queuesService: QueuesService,
    private endpointsService: EndpointsService,
    private ivrService: IvrService,
    private audioService: IvrAudioService,
    private logger: CustomLoggerService,
  ) {}

  async execute(session: IvrSession, action: ActionConfig): Promise<void> {
    this.logger.log(`Exécution action ${action.type} pour channel ${session.channelId}`);

    switch (action.type) {
      case 'queue':
        return this.executeQueueAction(session, action as QueueAction);
      
      case 'endpoint':
        return this.executeEndpointAction(session, action as EndpointAction);
      
      case 'submenu':
        return this.executeSubmenuAction(session, action as SubmenuAction);
      
      case 'playback':
        return this.executePlaybackAction(session, action as PlaybackAction);
      
      case 'hangup':
        return this.executeHangupAction(session, action as HangupAction);
      
      case 'voicemail':
        return this.executeVoicemailAction(session, action as VoicemailAction);
      
      case 'callback':
        return this.executeCallbackAction(session, action as CallbackAction);
      
      case 'external_api':
        return this.executeExternalApiAction(session, action as ExternalApiAction);
      
      default:
        this.logger.warn(`Action inconnue: ${(action as any).type}`);
        await this.ariService.hangupChannel(session.channelId);
    }
  }

  private async executeQueueAction(
    session: IvrSession,
    action: QueueAction,
  ): Promise<void> {
    // 1. Récupérer la queue
    const queue = await this.queuesService.findOne(Number(session.tenantId), action.target);
    const queueName = queue.name;

    // 2. Jouer l'annonce si configurée
    if (action.announce) {
      const soundPath = await this.audioService.resolveSoundPath(
        action.announce,
        session.tenantId,
      );
      await this.ariService.playback(session.channelId, soundPath);
    }

    // 3. Sortir de Stasis et continuer dans le dialplan [from-stasis]
    // Le channel va exécuter Queue() et Asterisk gérera le reste
    this.logger.log(`Redirection channel ${session.channelId} vers queue ${queueName}`);
    
    await this.ariService.continueInDialplan(
      session.channelId,
      'from-stasis',
      queueName,
      1,
    );
  }

  private async executeEndpointAction(
    session: IvrSession,
    action: EndpointAction,
  ): Promise<void> {
    const endpoint = await this.endpointsService.findOne(
      Number(session.tenantId),
      action.target,
    );
    const sipUri = TenantPrefixUtil.addPrefix(Number(session.tenantId), endpoint.id);

    // Créer un bridge et originer l'appel
    const bridge = await this.ariService.createBridge('mixing');
    await this.ariService.addChannelToBridge(bridge.id, session.channelId);
    
    const outboundChannel = await this.ariService.originateCall({
      endpoint: `PJSIP/${sipUri}`,
      app: 'ivr-app',
      timeout: action.timeout || 30,
    });
    
    await this.ariService.addChannelToBridge(bridge.id, outboundChannel.id);
  }

  private async executeSubmenuAction(
    session: IvrSession,
    action: SubmenuAction,
  ): Promise<void> {
    // Charger le sous-menu
    const submenu = await this.ivrService.findMenuById(
      Number(action.target),
      session.tenantId,
    );

    // Empiler le menu actuel
    session.menuStack.push(Number(session.currentMenu.id));
    session.currentMenu = submenu;
    session.retryCount = 0;

    // TODO: Jouer le sous-menu via l'orchestrateur
    this.logger.log(`Redirection vers sous-menu: ${submenu.name}`);
  }

  private async executePlaybackAction(
    session: IvrSession,
    action: PlaybackAction,
  ): Promise<void> {
    // Jouer tous les sons
    for (const sound of action.sounds) {
      const soundPath = await this.audioService.resolveSoundPath(
        sound,
        session.tenantId,
      );
      await this.ariService.playback(session.channelId, soundPath);
    }

    // Action suivante
    if (action.then) {
      await this.execute(session, action.then);
    } else {
      await this.ariService.hangupChannel(session.channelId);
    }
  }

  private async executeHangupAction(
    session: IvrSession,
    action: HangupAction,
  ): Promise<void> {
    await this.ariService.hangupChannel(session.channelId, action.cause);
  }

  private async executeVoicemailAction(
    session: IvrSession,
    action: VoicemailAction,
  ): Promise<void> {
    // TODO: Implémenter l'action voicemail
    this.logger.warn('Action voicemail non implémentée');
    await this.ariService.hangupChannel(session.channelId);
  }

  private async executeCallbackAction(
    session: IvrSession,
    action: CallbackAction,
  ): Promise<void> {
    // TODO: Implémenter service de callback
    this.logger.log(`Callback demandé pour ${session.callData.callerId}`);

    // 2. Jouer le message de confirmation
    if (action.message) {
      if (action.message.startsWith('say:')) {
        // TTS - TODO: implémenter
        this.logger.warn('TTS non implémenté');
      } else {
        const soundPath = await this.audioService.resolveSoundPath(
          action.message,
          session.tenantId,
        );
        await this.ariService.playback(session.channelId, soundPath);
      }
    }

    // 3. Raccrocher
    await this.ariService.hangupChannel(session.channelId);
  }

  private async executeExternalApiAction(
    session: IvrSession,
    action: ExternalApiAction,
  ): Promise<void> {
    // TODO: Implémenter l'appel API externe avec axios
    this.logger.warn('Action external_api non implémentée');
    
    // Action suivante
    if (action.then) {
      await this.execute(session, action.then);
    } else {
      await this.ariService.hangupChannel(session.channelId);
    }
  }
}