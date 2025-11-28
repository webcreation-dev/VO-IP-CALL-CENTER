import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AriService } from '../../core/asterisk/ari/ari.service';
import { DirectoryService, DirectorySession } from '../services/directory.service';

/**
 * Directory ARI Gateway
 *
 * Handles ARI events for the directory application:
 * - StasisStart: New incoming call or outbound call answered
 * - ChannelDtmfReceived: User input for endpoint selection
 * - StasisEnd / ChannelHangupRequest: Cleanup sessions
 */
@Injectable()
export class DirectoryAriGateway implements OnModuleInit {
  private readonly logger = new Logger(DirectoryAriGateway.name);
  private readonly APP_NAME = 'directory-app';

  constructor(
    private readonly ariService: AriService,
    private readonly directoryService: DirectoryService,
  ) {}

  onModuleInit() {
    this.setupEventHandlers();
    this.logger.log('Directory ARI Gateway initialized');
  }

  private setupEventHandlers() {
    // StasisStart - New call or outbound answered
    this.ariService.on('StasisStart', async (event: any, channel: any) => {
      // Only handle events for our app
      if (!event.application || event.application !== this.APP_NAME) {
        return;
      }

      const args = event.args || [];
      this.logger.log(
        `Directory: StasisStart - Channel: ${channel.id}, Args: ${args.join(',')}`,
      );

      if (args[0] === 'outbound') {
        // Outbound call to target endpoint answered
        const callerChannelId = args[1];
        await this.directoryService.handleOutboundAnswer(
          channel.id,
          callerChannelId,
        );
      } else {
        // Incoming call to directory
        await this.handleDirectoryCall(event, channel);
      }
    });

    // DTMF received - User selection
    this.ariService.on('ChannelDtmfReceived', async (event: any) => {
      const channelId = event.channel?.id;
      const digit = event.digit;

      if (!channelId) return;

      const session = this.directoryService.getSession(channelId);
      if (!session) return;

      this.logger.log(`Directory: DTMF received - ${digit} on ${channelId}`);
      await this.handleDtmfSelection(session, digit);
    });

    // StasisEnd - Call ended
    this.ariService.on('StasisEnd', async (event: any, channel: any) => {
      if (!event.application || event.application !== this.APP_NAME) {
        return;
      }

      this.logger.log(`Directory: StasisEnd - Channel: ${channel.id}`);
      await this.directoryService.cleanupSession(channel.id);
    });

    // Channel hangup - Cleanup
    this.ariService.on('ChannelHangupRequest', async (event: any, channel: any) => {
      const session = this.directoryService.findSessionByChannel(channel.id);
      if (session) {
        this.logger.log(`Directory: HangupRequest - Channel: ${channel.id}`);
        await this.directoryService.cleanupSession(channel.id);
      }
    });
  }

  /**
   * Handle incoming directory call
   */
  private async handleDirectoryCall(event: any, channel: any): Promise<void> {
    try {
      // Extract caller info
      const callerId = channel.caller?.number || 'unknown';
      const channelName = channel.name || '';

      // Extract tenant ID and context from channel name
      // Format: PJSIP/t{tenantId}_{extension}-XXXXX
      const match = channelName.match(/PJSIP\/t(\d+)_(\d+)/);
      if (!match) {
        this.logger.warn(`Cannot extract tenant from channel: ${channelName}`);
        await this.ariService.hangupChannel(channel.id);
        return;
      }

      const tenantId = parseInt(match[1], 10);
      const callerExtension = match[2];

      // Get context from channel (or derive from tenant)
      const contextVar = await this.ariService
        .getChannelVar(channel.id, 'CHANNEL(context)')
        .catch(() => ({ value: `t${tenantId}_default` }));
      const context = contextVar.value || `t${tenantId}_default`;

      this.logger.log(
        `Directory: Incoming call from ${callerId} (ext: ${callerExtension}), tenant: ${tenantId}, context: ${context}`,
      );

      // Answer the call
      await this.ariService.answerChannel(channel.id);

      // Get available endpoints
      const endpoints = await this.directoryService.getAvailableEndpoints(
        tenantId,
        context,
      );

      // Build menu
      const menu = this.directoryService.buildDirectoryMenu(endpoints);

      // Create session
      const session: DirectorySession = {
        channelId: channel.id,
        tenantId,
        context,
        callerEndpoint: `t${tenantId}_${callerExtension}`,
        menu,
        state: 'announcing',
      };
      this.directoryService.createSession(session);

      // Announce directory
      await this.directoryService.announceDirectory(channel.id, menu);

      // Update state to wait for input
      session.state = 'waiting_input';

      // If no endpoints, hangup after announcement
      if (menu.size === 0) {
        this.logger.log('Directory: No endpoints available, hanging up');
        await this.ariService.hangupChannel(channel.id);
        this.directoryService.deleteSession(channel.id);
      }
    } catch (error) {
      this.logger.error(`Directory call handling failed: ${error.message}`);
      await this.ariService.hangupChannel(channel.id).catch(() => {});
    }
  }

  /**
   * Handle DTMF selection
   */
  private async handleDtmfSelection(
    session: DirectorySession,
    digit: string,
  ): Promise<void> {
    // Ignore input during announcement or connecting
    if (session.state !== 'waiting_input') {
      return;
    }

    try {
      if (digit === '*') {
        // Hangup
        this.logger.log('Directory: User pressed * - hanging up');
        await this.ariService.hangupChannel(session.channelId);
        this.directoryService.deleteSession(session.channelId);
        return;
      }

      if (digit === '#') {
        // Repeat menu
        this.logger.log('Directory: User pressed # - repeating menu');
        session.state = 'announcing';
        await this.directoryService.announceDirectory(
          session.channelId,
          session.menu,
        );
        session.state = 'waiting_input';
        return;
      }

      // Check if digit is valid (1-9 and in menu)
      const targetEndpoint = session.menu.get(digit);
      if (!targetEndpoint) {
        this.logger.log(`Directory: Invalid digit ${digit}`);
        // Play error and wait for new input
        await this.ariService.playback(session.channelId, 'pbx-invalid');
        return;
      }

      // Connect to selected endpoint
      this.logger.log(
        `Directory: User selected ${digit} - connecting to ${targetEndpoint.id}`,
      );
      await this.directoryService.connectToEndpoint(session, targetEndpoint);
    } catch (error) {
      this.logger.error(`DTMF handling failed: ${error.message}`);
      // On error, hangup
      await this.ariService.hangupChannel(session.channelId).catch(() => {});
      this.directoryService.deleteSession(session.channelId);
    }
  }
}
