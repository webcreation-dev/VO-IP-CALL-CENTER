import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  AriChannel,
  AriBridge,
  AriPlayback,
  AriRecording,
  OriginateOptions,
} from './ari.types';

@Injectable()
export class AriService {
  private readonly logger = new Logger(AriService.name);
  private ariClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseURL = `http://${this.configService.get('ari.host')}:${this.configService.get('ari.port')}/ari`;
    const auth = {
      username: this.configService.get('ari.user'),
      password: this.configService.get('ari.password'),
    };

    this.ariClient = axios.create({
      baseURL,
      auth,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`ARI client initialized: ${baseURL}`);
  }

  // ========================================
  // CHANNEL OPERATIONS
  // ========================================

  /**
   * Get all active channels
   */
  async getChannels(): Promise<AriChannel[]> {
    try {
      const response = await this.ariClient.get('/channels');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get channels:', error.message);
      throw error;
    }
  }

  /**
   * Get specific channel
   */
  async getChannel(channelId: string): Promise<AriChannel> {
    try {
      const response = await this.ariClient.get(`/channels/${channelId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Originate a call
   */
  async originateCall(options: OriginateOptions): Promise<AriChannel> {
    try {
      const response = await this.ariClient.post('/channels', null, {
        params: {
          endpoint: options.endpoint,
          extension: options.extension,
          context: options.context,
          priority: options.priority,
          label: options.label,
          app: options.app,
          appArgs: options.appArgs,
          callerId: options.callerId,
          timeout: options.timeout || 30,
          variables: options.variables,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to originate call:', error.message);
      throw error;
    }
  }

  /**
   * Hangup a channel
   */
  async hangupChannel(channelId: string, reason: string = 'normal'): Promise<void> {
    try {
      await this.ariClient.delete(`/channels/${channelId}`, {
        params: { reason },
      });
      this.logger.log(`Channel ${channelId} hung up`);
    } catch (error) {
      this.logger.error(`Failed to hangup channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Answer a channel
   */
  async answerChannel(channelId: string): Promise<void> {
    try {
      await this.ariClient.post(`/channels/${channelId}/answer`);
      this.logger.log(`Channel ${channelId} answered`);
    } catch (error) {
      this.logger.error(`Failed to answer channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Hold a channel
   */
  async holdChannel(channelId: string): Promise<void> {
    try {
      await this.ariClient.post(`/channels/${channelId}/hold`);
    } catch (error) {
      this.logger.error(`Failed to hold channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Unhold a channel
   */
  async unholdChannel(channelId: string): Promise<void> {
    try {
      await this.ariClient.delete(`/channels/${channelId}/hold`);
    } catch (error) {
      this.logger.error(`Failed to unhold channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Mute a channel
   */
  async muteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.ariClient.post(`/channels/${channelId}/mute`, null, {
        params: { direction },
      });
    } catch (error) {
      this.logger.error(`Failed to mute channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Unmute a channel
   */
  async unmuteChannel(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.ariClient.delete(`/channels/${channelId}/mute`, {
        params: { direction },
      });
    } catch (error) {
      this.logger.error(`Failed to unmute channel ${channelId}:`, error.message);
      throw error;
    }
  }

  // ========================================
  // BRIDGE OPERATIONS
  // ========================================

  /**
   * Get all bridges
   */
  async getBridges(): Promise<AriBridge[]> {
    try {
      const response = await this.ariClient.get('/bridges');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get bridges:', error.message);
      throw error;
    }
  }

  /**
   * Create a bridge
   */
  async createBridge(type: string = 'mixing', name?: string): Promise<AriBridge> {
    try {
      const response = await this.ariClient.post('/bridges', null, {
        params: { type, name },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create bridge:', error.message);
      throw error;
    }
  }

  /**
   * Add channel to bridge
   */
  async addChannelToBridge(bridgeId: string, channelId: string): Promise<void> {
    try {
      await this.ariClient.post(`/bridges/${bridgeId}/addChannel`, null, {
        params: { channel: channelId },
      });
    } catch (error) {
      this.logger.error(`Failed to add channel ${channelId} to bridge ${bridgeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Remove channel from bridge
   */
  async removeChannelFromBridge(bridgeId: string, channelId: string): Promise<void> {
    try {
      await this.ariClient.post(`/bridges/${bridgeId}/removeChannel`, null, {
        params: { channel: channelId },
      });
    } catch (error) {
      this.logger.error(`Failed to remove channel ${channelId} from bridge ${bridgeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Destroy a bridge
   */
  async destroyBridge(bridgeId: string): Promise<void> {
    try {
      await this.ariClient.delete(`/bridges/${bridgeId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy bridge ${bridgeId}:`, error.message);
      throw error;
    }
  }

  // ========================================
  // PLAYBACK OPERATIONS
  // ========================================

  /**
   * Play media on channel
   */
  async playback(channelId: string, media: string, lang: string = 'en'): Promise<AriPlayback> {
    try {
      const response = await this.ariClient.post(`/channels/${channelId}/play`, null, {
        params: { media, lang },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to play media on channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop playback
   */
  async stopPlayback(playbackId: string): Promise<void> {
    try {
      await this.ariClient.delete(`/playbacks/${playbackId}`);
    } catch (error) {
      this.logger.error(`Failed to stop playback ${playbackId}:`, error.message);
      throw error;
    }
  }

  // ========================================
  // RECORDING OPERATIONS
  // ========================================

  /**
   * Start recording on channel
   */
  async startRecording(
    channelId: string,
    name: string,
    format: string = 'wav',
    maxDuration?: number,
    maxSilence?: number,
  ): Promise<AriRecording> {
    try {
      const response = await this.ariClient.post(`/channels/${channelId}/record`, null, {
        params: {
          name,
          format,
          maxDurationSeconds: maxDuration,
          maxSilenceSeconds: maxSilence,
          ifExists: 'overwrite',
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to start recording on channel ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(recordingName: string): Promise<void> {
    try {
      await this.ariClient.post(`/recordings/live/${recordingName}/stop`);
    } catch (error) {
      this.logger.error(`Failed to stop recording ${recordingName}:`, error.message);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(recordingName: string): Promise<void> {
    try {
      await this.ariClient.post(`/recordings/live/${recordingName}/pause`);
    } catch (error) {
      this.logger.error(`Failed to pause recording ${recordingName}:`, error.message);
      throw error;
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(recordingName: string): Promise<void> {
    try {
      await this.ariClient.delete(`/recordings/live/${recordingName}/pause`);
    } catch (error) {
      this.logger.error(`Failed to resume recording ${recordingName}:`, error.message);
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
      await this.ariClient.get('/asterisk/info');
      return true;
    } catch {
      return false;
    }
  }
}
