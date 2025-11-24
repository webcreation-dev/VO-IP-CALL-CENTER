import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as ari from 'ari-client';

@Injectable()
export class AriService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AriService.name);
  private client: ari.Client;
  private eventEmitter = new EventEmitter();

  /**
   * List of Stasis applications to start.
   * All apps are started centrally here to ensure proper initialization order.
   */
  private readonly STASIS_APPS = ['ivr-app', 'call-validator'];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Connexion ARI avec WebSocket
      const ariUrl = `http://${this.configService.get('ari.host')}:${this.configService.get('ari.port')}`;
      const ariUser = this.configService.get('ari.user');
      const ariPassword = this.configService.get('ari.password');

      this.logger.log(`Connexion à ARI: ${ariUrl} (user: ${ariUser})`);

      this.client = await ari.connect(ariUrl, ariUser, ariPassword);

      this.logger.log('ARI Client connected via WebSocket');

      // Start all Stasis applications
      await this.client.start(this.STASIS_APPS);
      this.logger.log(`Stasis applications started: ${this.STASIS_APPS.join(', ')}`);

      // Forward all ARI events to internal EventEmitter
      this.setupEventForwarding();
    } catch (error) {
      this.logger.error('❌ Erreur connexion ARI:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.logger.log('Fermeture connexion ARI...');
      // ari-client ferme automatiquement la connexion
    }
  }

  private setupEventForwarding() {
    // Transférer tous les événements ARI vers l'EventEmitter interne
    const events = [
      'StasisStart',
      'StasisEnd',
      'ChannelDtmfReceived',
      'PlaybackFinished',
      'ChannelStateChange',
      'ChannelHangupRequest',
      'ChannelDestroyed',
      'BridgeCreated',
      'BridgeDestroyed',
      'ChannelEnteredBridge',
      'ChannelLeftBridge',
    ];

    events.forEach((eventName) => {
      this.client.on(eventName, (...args) => {
        this.logger.debug(`📡 Événement ARI: ${eventName}`);
        this.eventEmitter.emit(eventName, ...args);
      });
    });
  }

  // ========================================
  // EVENT EMITTER METHODS
  // ========================================

  on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.once(event, listener);
  }

  // ========================================
  // CHANNEL OPERATIONS
  // ========================================

  /**
   * Répondre à un appel
   */
  async answerChannel(channelId: string): Promise<void> {
    try {
      await this.client.channels.answer({ channelId });
      this.logger.log(`Channel ${channelId} répondu`);
    } catch (error) {
      this.logger.error(`Erreur answer channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Raccrocher un channel
   */
  async hangupChannel(channelId: string, reason?: string): Promise<void> {
    try {
      await this.client.channels.hangup({ channelId, reason });
      this.logger.log(`Channel ${channelId} raccroché`);
    } catch (error: any) {
      // Si le channel n'existe plus (404), c'est normal (déjà raccroché)
      if (error?.statusCode === 404 || error?.message?.includes('not found')) {
        this.logger.debug(`Channel ${channelId} déjà fermé`);
      } else {
        this.logger.error(`Erreur hangup ${channelId}:`, error);
      }
    }
  }

  /**
   * Obtenir les informations d'un channel
   */
  async getChannel(channelId: string): Promise<any> {
    try {
      return await this.client.channels.get({ channelId });
    } catch (error) {
      this.logger.error(`Erreur get channel info ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir une variable d'un channel
   */
  async getChannelVar(channelId: string, varName: string): Promise<{ value: string }> {
    try {
      return await this.client.channels.getChannelVar({ channelId, variable: varName });
    } catch (error) {
      this.logger.error(`Erreur get channel var ${varName} sur ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Alias pour hangupChannel (pour compatibilité)
   */
  async hangup(channelId: string, reason?: string): Promise<void> {
    return this.hangupChannel(channelId, reason);
  }

  /**
   * Lister tous les channels actifs
   */
  async getChannels(): Promise<any[]> {
    try {
      const channels = this.client.channels;
      return await channels.list();
    } catch (error) {
      this.logger.error('Erreur list channels:', error);
      throw error;
    }
  }

  /**
   * Mettre un channel en attente (hold)
   */
  async holdChannel(channelId: string): Promise<void> {
    try {
      await this.client.channels.hold({ channelId });
      this.logger.log(`Channel ${channelId} en attente`);
    } catch (error) {
      this.logger.error('Erreur hold:', error);
      throw error;
    }
  }

  /**
   * Reprendre un channel en attente
   */
  async unholdChannel(channelId: string): Promise<void> {
    try {
      await this.client.channels.unhold({ channelId });
      this.logger.log(`Channel ${channelId} repris`);
    } catch (error) {
      this.logger.error('Erreur unhold:', error);
      throw error;
    }
  }

  /**
   * Muet sur un channel
   */
  async muteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.client.channels.mute({ channelId, direction });
      this.logger.log(`Channel ${channelId} muté (${direction})`);
    } catch (error) {
      this.logger.error('Erreur mute:', error);
      throw error;
    }
  }

  /**
   * Démuet sur un channel
   */
  async unmuteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.client.channels.unmute({ channelId, direction });
      this.logger.log(`Channel ${channelId} démuté (${direction})`);
    } catch (error) {
      this.logger.error('Erreur unmute:', error);
      throw error;
    }
  }

  /**
   * Envoyer DTMF sur un channel
   */
  async sendDtmf(channelId: string, dtmf: string): Promise<void> {
    try {
      await this.client.channels.sendDTMF({ channelId, dtmf });
      this.logger.debug(`DTMF envoyé: ${dtmf} sur ${channelId}`);
    } catch (error) {
      this.logger.error('Erreur send DTMF:', error);
      throw error;
    }
  }

  // ========================================
  // PLAYBACK OPERATIONS
  // ========================================

  /**
   * Jouer un son
   */
  async playback(channelId: string, media: string, lang: string = 'fr'): Promise<any> {
    try {
      const playback = await this.client.channels.play({
        channelId,
        media: `sound:${media}`,
        lang,
      });

      this.logger.debug(`Playback démarré: ${playback.id} sur ${channelId}`);
      return playback;
    } catch (error) {
      this.logger.error(`Erreur playback sur ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Arrêter un playback
   */
  async stopPlayback(playbackId: string): Promise<void> {
    try {
      await this.client.playbacks.stop({ playbackId });
      this.logger.log(`Playback ${playbackId} arrêté`);
    } catch (error) {
      this.logger.error(`Erreur stop playback ${playbackId}:`, error);
      throw error;
    }
  }

  /**
   * Jouer plusieurs sons en séquence
   */
  async playbackMultiple(channelId: string, mediaList: string[]): Promise<void> {
    for (const media of mediaList) {
      await this.playback(channelId, media);
      await this.waitForPlaybackFinished(channelId);
    }
  }

  /**
   * Attendre la fin d'un playback
   */
  private waitForPlaybackFinished(channelId: string): Promise<void> {
    return new Promise((resolve) => {
      const handler = (event: any, playback: any) => {
        if (playback.target_uri && playback.target_uri.includes(channelId)) {
          this.eventEmitter.off('PlaybackFinished', handler);
          resolve();
        }
      };
      this.eventEmitter.on('PlaybackFinished', handler);
    });
  }

  // ========================================
  // BRIDGE OPERATIONS
  // ========================================

  /**
   * Créer un bridge
   */
  async createBridge(type: 'mixing' | 'holding' = 'mixing', name?: string): Promise<any> {
    try {
      const bridges = this.client.bridges;
      const bridge = await bridges.create({ type, name });
      this.logger.log(`Bridge créé: ${bridge.id}`);
      return bridge;
    } catch (error) {
      this.logger.error('Erreur création bridge:', error);
      throw error;
    }
  }

  /**
   * Obtenir tous les bridges
   */
  async getBridges(): Promise<any[]> {
    try {
      const bridges = this.client.bridges;
      return await bridges.list();
    } catch (error) {
      this.logger.error('Erreur list bridges:', error);
      throw error;
    }
  }

  /**
   * Ajouter un channel à un bridge
   */
  async addChannelToBridge(bridgeId: string, channelId: string): Promise<void> {
    try {
      await this.client.bridges.addChannel({ bridgeId, channel: channelId });
      this.logger.log(`Channel ${channelId} ajouté au bridge ${bridgeId}`);
    } catch (error) {
      this.logger.error(`Erreur ajout channel au bridge:`, error);
      throw error;
    }
  }

  /**
   * Retirer un channel d'un bridge
   */
  async removeChannelFromBridge(bridgeId: string, channelId: string): Promise<void> {
    try {
      await this.client.bridges.removeChannel({ bridgeId, channel: channelId });
      this.logger.log(`Channel ${channelId} retiré du bridge ${bridgeId}`);
    } catch (error) {
      this.logger.error(`Erreur retrait channel du bridge:`, error);
      throw error;
    }
  }

  /**
   * Détruire un bridge
   */
  async destroyBridge(bridgeId: string): Promise<void> {
    try {
      await this.client.bridges.destroy({ bridgeId });
      this.logger.log(`Bridge ${bridgeId} détruit`);
    } catch (error) {
      this.logger.error(`Erreur destruction bridge:`, error);
    }
  }

  // ========================================
  // ORIGINATE OPERATIONS
  // ========================================

  /**
   * Originer un appel
   */
  async originateCall(params: {
    endpoint: string;
    app?: string;
    appArgs?: string;
    extension?: string;
    context?: string;
    priority?: number;
    callerId?: string;
    timeout?: number;
    variables?: Record<string, string>;
  }): Promise<any> {
    try {
      const channels = this.client.channels;
      const channel = await channels.originate({
        endpoint: params.endpoint,
        app: params.app,
        appArgs: params.appArgs,
        extension: params.extension,
        context: params.context,
        priority: params.priority,
        callerId: params.callerId,
        timeout: params.timeout || 30,
        variables: params.variables,
      });

      this.logger.log(`Appel originé: ${channel.id} vers ${params.endpoint}`);
      return channel;
    } catch (error: any) {
      this.logger.error(`Erreur originate vers ${params.endpoint}:`, {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response?.data,
      });
      throw error;
    }
  }

  // ========================================
  // RECORDING OPERATIONS
  // ========================================

  /**
   * Enregistrer un appel
   */
  async startRecording(
    channelId: string,
    name: string,
    format: string = 'wav',
    maxDuration?: number,
    maxSilence?: number,
  ): Promise<any> {
    try {
      const recording = await this.client.channels.record({
        channelId,
        name,
        format,
        maxDurationSeconds: maxDuration || 0,
        maxSilenceSeconds: maxSilence || 0,
        ifExists: 'overwrite',
      });

      this.logger.log(`Enregistrement démarré: ${recording.name} sur ${channelId}`);
      return recording;
    } catch (error) {
      this.logger.error('Erreur start recording:', error);
      throw error;
    }
  }

  /**
   * Arrêter un enregistrement
   */
  async stopRecording(recordingName: string): Promise<void> {
    try {
      await this.client.recordings.stop({ recordingName });
      this.logger.log(`Enregistrement arrêté: ${recordingName}`);
    } catch (error) {
      this.logger.error('Erreur stop recording:', error);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(recordingName: string): Promise<void> {
    try {
      await this.client.recordings.pause({ recordingName });
      this.logger.log(`Enregistrement pausé: ${recordingName}`);
    } catch (error) {
      this.logger.error('Erreur pause recording:', error);
      throw error;
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(recordingName: string): Promise<void> {
    try {
      await this.client.recordings.unpause({ recordingName });
      this.logger.log(`Enregistrement repris: ${recordingName}`);
    } catch (error) {
      this.logger.error('Erreur resume recording:', error);
      throw error;
    }
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  /**
   * Check ARI availability
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.asterisk.getInfo();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Continuer un channel dans le dialplan (sortir de Stasis)
   */
  async continueInDialplan(
    channelId: string,
    context: string,
    extension: string,
    priority: number = 1,
  ): Promise<void> {
    try {
      await this.client.channels.continueInDialplan({
        channelId,
        context,
        extension,
        priority,
      });
      this.logger.log(`Channel ${channelId} continue dans ${context},${extension},${priority}`);
    } catch (error: any) {
      this.logger.error(`Erreur continueInDialplan ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir le client ARI brut (pour usage avancé)
   */
  getClient(): ari.Client {
    return this.client;
  }
}