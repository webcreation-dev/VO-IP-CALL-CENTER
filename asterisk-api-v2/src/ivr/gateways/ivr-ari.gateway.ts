// ivr-ari.gateway.ts
@WebSocketGateway()
export class IvrAriGateway implements OnModuleInit {
  private ariClient: any;

  constructor(
    private orchestrator: IvrOrchestratorService,
    private configService: ConfigService,
    private logger: CustomLoggerService,
  ) {}

  async onModuleInit() {
    const ari = require('ari-client');
    
    this.ariClient = await ari.connect(
      this.configService.get('ASTERISK_ARI_URL'),
      this.configService.get('ASTERISK_ARI_USERNAME'),
      this.configService.get('ASTERISK_ARI_PASSWORD'),
    );

    // Démarrer l'application Stasis
    this.ariClient.start('ivr-app');

    // Écouter les événements
    this.setupEventHandlers();
    
    this.logger.log('IVR ARI Gateway démarré');
  }

  private setupEventHandlers() {
    // Nouvel appel entrant
    this.ariClient.on('StasisStart', async (event, channel) => {
      this.logger.log(`Nouvel appel: ${channel.id} (DID: ${event.args[0]})`);
      
      const did = event.args[0];
      const callerId = channel.caller.number;

      await this.orchestrator.handleIncomingCall(channel, did, callerId);
    });

    // DTMF reçu
    this.ariClient.on('ChannelDtmfReceived', (event) => {
      this.logger.debug(`DTMF reçu: ${event.digit} sur ${event.channel.id}`);
      // Géré par l'orchestrateur via EventEmitter
    });

    // Fin de playback
    this.ariClient.on('PlaybackFinished', (event) => {
      this.logger.debug(`Playback terminé: ${event.playback.id}`);
    });

    // Channel raccroché
    this.ariClient.on('StasisEnd', async (event, channel) => {
      this.logger.log(`Appel terminé: ${channel.id}`);
      await this.orchestrator.cleanupSession(channel.id);
    });

    // Gestion des erreurs
    this.ariClient.on('error', (error) => {
      this.logger.error('Erreur ARI:', error);
    });
  }
}