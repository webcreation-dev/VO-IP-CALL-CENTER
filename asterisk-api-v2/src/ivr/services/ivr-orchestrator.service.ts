import { Injectable } from '@nestjs/common';
import { AriService } from 'src/core/asterisk/ari/ari.service';
import { CustomLoggerService } from 'src/core/logger/logger.service';
import { IvrService } from './ivr.service';
import { IvrActionExecutorService } from './ivr-action-executor.service';
import { IvrAudioService } from './ivr-audio.service';
import type { IvrSession } from '../interfaces/ivr-session.interface';
import type { IvrMenu } from '../entities/ivr-menu.entity';
import type { IvrCondition } from '../entities/ivr-condition.entity';

// Types ARI
interface AriChannel {
  id: string;
  name?: string;
  state?: string;
  caller?: {
    number: string;
    name: string;
  };
}

interface AriDtmfEvent {
  channel: {
    id: string;
  };
  digit: string;
}

// ivr-orchestrator.service.ts
@Injectable()
export class IvrOrchestratorService {
  private activeSessions = new Map<string, IvrSession>();
  
  constructor(
    private ariService: AriService,
    private ivrService: IvrService,
    private actionExecutor: IvrActionExecutorService,
    private audioService: IvrAudioService,
    private logger: CustomLoggerService,
  ) {}

  /**
   * Point d'entrée : Nouvel appel arrive via Stasis
   */
  async handleIncomingCall(
    channel: AriChannel,
    did: string,
    callerId: string,
  ): Promise<void> {
    const channelId = channel.id;
    
    try {
      // 1. Trouver le menu IVR correspondant au DID
      const mapping = await this.ivrService.findDidMapping(did);
      if (!mapping) {
        this.logger.warn(`Aucun IVR configuré pour le DID ${did}`);
        await this.ariService.playback(channelId, 'tt-monkeys'); // Son d'erreur
        await this.ariService.hangupChannel(channelId);
        return;
      }

      const menu = await this.ivrService.findMenuById(
        Number(mapping.menu_id),
        Number(mapping.tenant_id),
      );

      // 2. Évaluer les conditions (heure, caller_id, etc.)
      const evaluatedMenu = await this.evaluateConditions(
        menu,
        { did, callerId, datetime: new Date() },
      );

      // 3. Créer une session IVR
      const session: IvrSession = {
        channelId,
        tenantId: Number(mapping.tenant_id),
        currentMenu: evaluatedMenu,
        menuStack: [Number(evaluatedMenu.id)],
        retryCount: 0,
        callData: { did, callerId },
      };
      this.activeSessions.set(channelId, session);

      // 4. Répondre à l'appel
      await this.ariService.answerChannel(channelId);

      // 5. Lancer le menu
      await this.playMenu(session);

    } catch (error) {
      this.logger.error(`Erreur IVR pour channel ${channelId}:`, error);
      await this.cleanupSession(channelId);
    }
  }

  /**
   * Joue un menu IVR et attend l'input DTMF
   */
  private async playMenu(session: IvrSession): Promise<void> {
    const { channelId, currentMenu, retryCount } = session;

    // 1. Jouer le son de bienvenue
    const soundPath = await this.audioService.resolveSoundPath(
      currentMenu.welcome_sound,
      session.tenantId,
    );
    await this.ariService.playback(channelId, soundPath);

    // 2. Attendre le DTMF avec timeout
    const dtmf = await this.waitForDtmf(
      channelId,
      currentMenu.timeout,
      currentMenu.max_digits,
    );

    if (!dtmf) {
      // Timeout
      await this.handleTimeout(session);
      return;
    }

    // 3. Trouver l'option correspondante
    const option = await this.ivrService.findOptionByDigit(
      Number(currentMenu.id),
      dtmf,
    );

    if (!option) {
      // Choix invalide
      await this.handleInvalidInput(session);
      return;
    }

    // 4. Exécuter l'action
    session.retryCount = 0; // Reset
    await this.actionExecutor.execute(session, option.action);
  }

  /**
   * Attend l'input DTMF avec timeout
   */
  private waitForDtmf(
    channelId: string,
    timeout: number,
    maxDigits: number,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      let buffer = '';
      
      const removeListeners = () => {
        this.ariService.off('ChannelDtmfReceived', onDtmf);
      };

      const timer = setTimeout(() => {
        removeListeners();
        resolve(null);
      }, timeout * 1000);

      const onDtmf = (event: AriDtmfEvent) => {
        if (event.channel.id !== channelId) return;

        buffer += event.digit;
        
        if (buffer.length >= maxDigits) {
          clearTimeout(timer);
          removeListeners();
          resolve(buffer);
        }
      };

      this.ariService.on('ChannelDtmfReceived', onDtmf);
    });
  }

  /**
   * Gestion du timeout
   */
  private async handleTimeout(session: IvrSession): Promise<void> {
    // Vérifier que la session existe encore (peut avoir été fermée entre-temps)
    if (!this.activeSessions.has(session.channelId)) {
      this.logger.debug(`Session ${session.channelId} déjà fermée, ignorer timeout`);
      return;
    }

    session.retryCount++;

    if (session.retryCount >= session.currentMenu.max_retries) {
      // Max retries atteint → action par défaut
      await this.actionExecutor.execute(
        session,
        session.currentMenu.timeout_action,
      );
    } else {
      // Rejouer le son de timeout et recommencer
      if (session.currentMenu.timeout_sound) {
        const soundPath = await this.audioService.resolveSoundPath(
          session.currentMenu.timeout_sound,
          session.tenantId,
        );
        await this.ariService.playback(session.channelId, soundPath);
      }
      await this.playMenu(session);
    }
  }

  /**
   * Gestion de l'input invalide
   */
  private async handleInvalidInput(session: IvrSession): Promise<void> {
    // Vérifier que la session existe encore (peut avoir été fermée entre-temps)
    if (!this.activeSessions.has(session.channelId)) {
      this.logger.debug(`Session ${session.channelId} déjà fermée, ignorer input invalide`);
      return;
    }

    session.retryCount++;

    if (session.retryCount >= session.currentMenu.max_retries) {
      await this.actionExecutor.execute(
        session,
        session.currentMenu.invalid_action,
      );
    } else {
      if (session.currentMenu.invalid_sound) {
        const soundPath = await this.audioService.resolveSoundPath(
          session.currentMenu.invalid_sound,
          session.tenantId,
        );
        await this.ariService.playback(session.channelId, soundPath);
      }
      await this.playMenu(session);
    }
  }

  /**
   * Évalue les conditions d'un menu
   */
  private async evaluateConditions(
    menu: IvrMenu,
    context: { did: string; callerId: string; datetime: Date },
  ): Promise<IvrMenu> {
    const conditions = await this.ivrService.findConditionsByMenu(Number(menu.id));
    
    for (const condition of conditions.sort((a, b) => a.priority - b.priority)) {
      if (!condition.is_active) continue;

      const isValid = await this.evaluateCondition(condition, context);
      if (isValid && condition.action.type === 'submenu') {
        // Rediriger vers un autre menu
        return this.ivrService.findMenuById(
          Number(condition.action.target),
          Number(menu.tenant_id),
        );
      }
    }

    return menu; // Aucune condition ne match, retourner le menu original
  }

  /**
   * Évalue une condition spécifique
   */
  private async evaluateCondition(
    condition: IvrCondition,
    context: { did: string; callerId: string; datetime: Date },
  ): Promise<boolean> {
    switch (condition.condition_type) {
      case 'time':
        return this.evaluateTimeCondition(
          condition.condition_config,
          context.datetime,
        );
      
      case 'caller_id':
        return this.evaluateCallerIdCondition(
          condition.condition_config,
          context.callerId,
        );
      
      case 'did':
        return this.evaluateDidCondition(
          condition.condition_config,
          context.did,
        );
      
      default:
        return false;
    }
  }

  private evaluateCallerIdCondition(config: any, callerId: string): boolean {
    if (!config.caller_pattern) return false;
    const pattern = new RegExp(config.caller_pattern);
    return pattern.test(callerId);
  }

  private evaluateDidCondition(config: any, did: string): boolean {
    if (!config.did_pattern) return false;
    const pattern = new RegExp(config.did_pattern);
    return pattern.test(did);
  }

  private evaluateTimeCondition(config: any, datetime: Date): boolean {
    // Convertir en timezone configurée
    const localTime = datetime; // TODO: utiliser date-fns-tz
    const hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const day = localTime.getDay(); // 0 = Dimanche

    // Vérifier le jour de la semaine
    if (config.days && !config.days.includes(day)) {
      return false;
    }

    // Vérifier l'heure
    if (config.start_time) {
      const [startH, startM] = config.start_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const currentMinutes = hours * 60 + minutes;
      if (currentMinutes < startMinutes) return false;
    }

    if (config.end_time) {
      const [endH, endM] = config.end_time.split(':').map(Number);
      const endMinutes = endH * 60 + endM;
      const currentMinutes = hours * 60 + minutes;
      if (currentMinutes > endMinutes) return false;
    }

    return true;
  }

  async cleanupSession(channelId: string): Promise<void> {
    this.activeSessions.delete(channelId);
  }
}