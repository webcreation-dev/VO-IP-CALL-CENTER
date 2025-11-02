// ivr-action-executor.service.ts
@Injectable()
export class IvrActionExecutorService {
  constructor(
    private ariService: AriService,
    private queuesService: QueuesService,
    private audioService: IvrAudioService,
    private httpService: HttpService,
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
        this.logger.warn(`Action inconnue: ${action.type}`);
        await this.ariService.hangup(session.channelId);
    }
  }

  private async executeQueueAction(
    session: IvrSession,
    action: QueueAction,
  ): Promise<void> {
    // 1. Récupérer la queue
    const queue = await this.queuesService.findOne(action.target, session.tenantId);
    const queueName = TenantPrefixUtil.addPrefix(session.tenantId, queue.name);

    // 2. Jouer l'annonce si configurée
    if (action.announce) {
      const soundPath = await this.audioService.resolveSoundPath(
        action.announce,
        session.tenantId,
      );
      await this.ariService.playback(session.channelId, soundPath);
    }

    // 3. Créer un bridge
    const bridge = await this.ariService.createBridge('mixing');

    // 4. Ajouter le channel au bridge
    await this.ariService.addChannelToBridge(bridge.id, session.channelId);

    // 5. Originer un Local channel vers la queue
    const localChannel = await this.ariService.originate({
      endpoint: `Local/${queueName}@from-stasis`,
      app: 'ivr-app',
      appArgs: 'queue-bridge',
      variables: {
        QUEUE_NAME: queueName,
        BRIDGE_ID: bridge.id,
      },
    });

    // Le reste est géré par Asterisk (queue logic)
  }

  private async executeEndpointAction(
    session: IvrSession,
    action: EndpointAction,
  ): Promise<void> {
    const endpoint = await this.endpointsService.findOne(
      action.target,
      session.tenantId,
    );
    const sipUri = TenantPrefixUtil.addPrefix(session.tenantId, endpoint.name);

    // Dial via ARI
    await this.ariService.dial(
      session.channelId,
      `PJSIP/${sipUri}`,
      action.timeout || 30,
    );
  }

  private async executeSubmenuAction(
    session: IvrSession,
    action: SubmenuAction,
  ): Promise<void> {
    // Charger le sous-menu
    const submenu = await this.ivrService.findMenuById(
      action.target,
      session.tenantId,
    );

    // Empiler le menu actuel
    session.menuStack.push(session.currentMenu.id);
    session.currentMenu = submenu;
    session.retryCount = 0;

    // Jouer le sous-menu
    await this.orchestrator.playMenu(session);
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
      await this.ariService.hangup(session.channelId);
    }
  }

  private async executeHangupAction(
    session: IvrSession,
    action: HangupAction,
  ): Promise<void> {
    await this.ariService.hangup(session.channelId, action.cause);
  }

  private async executeCallbackAction(
    session: IvrSession,
    action: CallbackAction,
  ): Promise<void> {
    // 1. Enregistrer le callback dans une table dédiée
    await this.callbackService.create({
      tenant_id: session.tenantId,
      caller_number: session.callData.callerId,
      queue_id: action.queue_id,
      requested_at: new Date(),
      status: 'pending',
    });

    // 2. Jouer le message de confirmation
    if (action.message) {
      if (action.message.startsWith('say:')) {
        // TTS
        const text = action.message.replace('say:', '');
        await this.ariService.playTTS(session.channelId, text);
      } else {
        const soundPath = await this.audioService.resolveSoundPath(
          action.message,
          session.tenantId,
        );
        await this.ariService.playback(session.channelId, soundPath);
      }
    }

    // 3. Raccrocher
    await this.ariService.hangup(session.channelId);
  }

  private async executeExternalApiAction(
    session: IvrSession,
    action: ExternalApiAction,
  ): Promise<void> {
    try {
      const response = await this.httpService.axiosRef.request({
        method: action.method,
        url: action.url,
        data: {
          tenant_id: session.tenantId,
          caller_id: session.callData.callerId,
          did: session.callData.did,
        },
        timeout: 5000,
      });

      // Action suivante selon réponse
      if (action.then) {
        await this.execute(session, action.then);
      }
    } catch (error) {
      this.logger.error(`Erreur API externe: ${error.message}`);
      await this.ariService.hangup(session.channelId);
    }
  }
}