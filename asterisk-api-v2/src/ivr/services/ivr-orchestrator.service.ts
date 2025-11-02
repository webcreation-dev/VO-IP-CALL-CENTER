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
        await this.ariService.hangup(channelId);
        return;
      }

      const menu = await this.ivrService.findMenuById(
        mapping.menu_id,
        mapping.tenant_id,
      );

      // 2. Évaluer les conditions (heure, caller_id, etc.)
      const evaluatedMenu = await this.evaluateConditions(
        menu,
        { did, callerId, datetime: new Date() },
      );

      // 3. Créer une session IVR
      const session: IvrSession = {
        channelId,
        tenantId: mapping.tenant_id,
        currentMenu: evaluatedMenu,
        menuStack: [evaluatedMenu.id],
        retryCount: 0,
        callData: { did, callerId },
      };
      this.activeSessions.set(channelId, session);

      // 4. Répondre à l'appel
      await this.ariService.answer(channelId);

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
      currentMenu.id,
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
      const timer = setTimeout(() => {
        this.removeListeners();
        resolve(null);
      }, timeout * 1000);

      const onDtmf = (event: AriDtmfEvent) => {
        if (event.channel.id !== channelId) return;

        buffer += event.digit;
        
        if (buffer.length >= maxDigits) {
          clearTimeout(timer);
          this.removeListeners();
          resolve(buffer);
        }
      };

      const removeListeners = () => {
        this.ariService.off('ChannelDtmfReceived', onDtmf);
      };

      this.ariService.on('ChannelDtmfReceived', onDtmf);
    });
  }

  /**
   * Gestion du timeout
   */
  private async handleTimeout(session: IvrSession): Promise<void> {
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
    const conditions = await this.ivrService.findConditionsByMenu(menu.id);
    
    for (const condition of conditions.sort((a, b) => a.priority - b.priority)) {
      if (!condition.is_active) continue;

      const isValid = await this.evaluateCondition(condition, context);
      if (isValid && condition.action.type === 'submenu') {
        // Rediriger vers un autre menu
        return this.ivrService.findMenuById(
          condition.action.target,
          menu.tenant_id,
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

  private async cleanupSession(channelId: string): Promise<void> {
    this.activeSessions.delete(channelId);
  }
}