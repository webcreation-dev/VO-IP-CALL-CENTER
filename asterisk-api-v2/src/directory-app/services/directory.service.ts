import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TenantContext } from '../../core/database/entities/tenant-context.entity';
import { Extension } from '../../core/database/entities/extension.entity';
import { ExtensionsService } from '../../extensions/extensions.service';
import { EndpointsService } from '../../endpoints/endpoints.service';
import { AsteriskConfigService } from '../../core/asterisk-config/asterisk-config.service';
import { AriService } from '../../core/asterisk/ari/ari.service';

/**
 * Interface for directory session tracking
 */
export interface DirectorySession {
  channelId: string;
  tenantId: number;
  context: string;
  callerEndpoint: string;
  menu: Map<string, any>; // digit → endpoint (enriched with AMI data)
  bridgeId?: string;
  targetChannelId?: string;
  state: 'announcing' | 'waiting_input' | 'connecting' | 'connected';
}

/**
 * Directory Service
 *
 * Manages the directory IVR application that allows callers to:
 * - List available endpoints in their context
 * - Select an endpoint by pressing a digit (1-9)
 * - Connect to the selected endpoint via a bridge
 *
 * Auto-creates *411 extension for all contexts on startup.
 */
@Injectable()
export class DirectoryService implements OnModuleInit {
  private readonly logger = new Logger(DirectoryService.name);
  private sessions = new Map<string, DirectorySession>();

  constructor(
    @InjectRepository(TenantContext)
    private readonly tenantContextRepo: Repository<TenantContext>,
    @InjectRepository(Extension)
    private readonly extensionRepo: Repository<Extension>,
    private readonly extensionsService: ExtensionsService,
    private readonly endpointsService: EndpointsService,
    private readonly asteriskConfigService: AsteriskConfigService,
    private readonly ariService: AriService,
  ) {}

  async onModuleInit() {
    await this.ensureDirectoryExtensions();
  }

  /**
   * Create *411 extension for all contexts if it doesn't exist
   * Uses the same pattern as TenantContextsService.createDefaultDialplan()
   */
  private async ensureDirectoryExtensions(): Promise<void> {
    try {
      const contexts = await this.tenantContextRepo.find();
      let createdCount = 0;

      for (const ctx of contexts) {
        // Check if *411 extension already exists
        const existing = await this.extensionRepo.findOne({
          where: {
            tenantId: ctx.tenantId,
            context: ctx.name,
            exten: '*411',
          },
        });

        if (!existing) {
          // Create extension via service (handles validation)
          await this.extensionsService.create(ctx.tenantId, {
            context: ctx.name,
            exten: '*411',
            priority: 1,
            app: 'Stasis',
            appdata: 'directory-app',
          });
          createdCount++;
          this.logger.log(`Created *411 extension for context ${ctx.name}`);
        }
      }

      // Reload dialplan once at the end if extensions were created
      if (createdCount > 0) {
        await this.asteriskConfigService.reloadDialplan();
        this.logger.log(
          `✅ Directory extensions created: ${createdCount} context(s), dialplan reloaded`,
        );
      } else {
        this.logger.log(
          `Directory extensions already exist for all ${contexts.length} context(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure directory extensions: ${error.message}`,
      );
      // Don't fail module startup
    }
  }

  /**
   * Get available endpoints for directory listing
   * Filters: registered + agents or no role (excludes supervisors/admins)
   * Limits to 9 max (digits 1-9)
   */
  async getAvailableEndpoints(
    tenantId: number,
    context: string,
  ): Promise<any[]> {
    try {
      // Get all endpoints for tenant with AMI enrichment
      const result = await this.endpointsService.findAllEnriched(tenantId, {
        context,
      });

      // Filter: registered + agents or no role (level <= 2)
      const available = result.data.filter(
        (ep: any) =>
          ep.registered &&
          (ep.roleId === null || (ep.role && ep.role.level <= 2)),
      );

      // Limit to 9 max
      return available.slice(0, 9);
    } catch (error) {
      this.logger.error(
        `Failed to get available endpoints: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Build directory menu mapping digits to endpoints
   */
  buildDirectoryMenu(endpoints: any[]): Map<string, any> {
    const menu = new Map<string, any>();

    endpoints.forEach((endpoint, index) => {
      const digit = String(index + 1); // 1-9
      menu.set(digit, endpoint);
    });

    return menu;
  }

  /**
   * Announce directory menu using Asterisk sound files
   */
  async announceDirectory(
    channelId: string,
    menu: Map<string, any>,
  ): Promise<void> {
    try {
      // Welcome message
      await this.playAndWait(channelId, 'dir-welcome');

      if (menu.size === 0) {
        // No endpoints available
        await this.playAndWait(channelId, 'vm-nobodyavail');
        return;
      }

      // For each endpoint
      for (const [digit, endpoint] of menu.entries()) {
        await this.playAndWait(channelId, 'press');
        await this.playAndWait(channelId, `digits/${digit}`);
        await this.playAndWait(channelId, 'for');
        await this.playAndWait(channelId, 'extension');

        // Play extension number digit by digit
        const extension = endpoint.id.split('_')[1]; // e.g., "t1_1001" → "1001"
        for (const d of extension) {
          await this.playAndWait(channelId, `digits/${d}`);
        }
      }

      // Final instructions
      await this.playAndWait(channelId, 'to-repeat-press-star');
    } catch (error) {
      this.logger.error(`Failed to announce directory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Play a sound file and wait for completion
   */
  private async playAndWait(channelId: string, media: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const playback = await this.ariService.playback(channelId, media);

        const handler = (event: any) => {
          if (event.playback?.id === playback.id) {
            this.ariService.off('PlaybackFinished', handler);
            resolve();
          }
        };

        this.ariService.on('PlaybackFinished', handler);

        // Timeout after 30 seconds
        setTimeout(() => {
          this.ariService.off('PlaybackFinished', handler);
          resolve(); // Don't reject, just continue
        }, 30000);
      } catch (error) {
        this.logger.warn(`Playback failed for ${media}: ${error.message}`);
        resolve(); // Don't reject, continue with next sound
      }
    });
  }

  /**
   * Connect caller to selected endpoint via bridge
   */
  async connectToEndpoint(
    session: DirectorySession,
    targetEndpoint: any,
  ): Promise<void> {
    try {
      session.state = 'connecting';

      // 1. Create mixing bridge
      const bridge = await this.ariService.createBridge(
        'mixing',
        `directory-${session.channelId}`,
      );
      session.bridgeId = bridge.id;

      // 2. Add caller to bridge
      await this.ariService.addChannelToBridge(bridge.id, session.channelId);

      // 3. Originate call to target
      const targetChannel = await this.ariService.originateCall({
        endpoint: `PJSIP/${targetEndpoint.id}`,
        app: 'directory-app',
        appArgs: `outbound,${session.channelId}`,
        callerId: session.callerEndpoint,
        timeout: 30,
      });

      session.targetChannelId = targetChannel.id;
      this.logger.log(
        `Directory: Originated call to ${targetEndpoint.id}, channel: ${targetChannel.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to connect to endpoint: ${error.message}`);
      session.state = 'waiting_input';
      throw error;
    }
  }

  /**
   * Handle outbound call answered (add to bridge)
   */
  async handleOutboundAnswer(
    channelId: string,
    callerChannelId: string,
  ): Promise<void> {
    const session = this.sessions.get(callerChannelId);
    if (!session || !session.bridgeId) {
      this.logger.warn(
        `No session found for outbound call: ${callerChannelId}`,
      );
      return;
    }

    try {
      await this.ariService.answerChannel(channelId);
      await this.ariService.addChannelToBridge(session.bridgeId, channelId);
      session.state = 'connected';
      this.logger.log(
        `Directory: Connected outbound channel ${channelId} to bridge`,
      );
    } catch (error) {
      this.logger.error(`Failed to add outbound to bridge: ${error.message}`);
    }
  }

  /**
   * Cleanup session and release resources
   */
  async cleanupSession(channelId: string): Promise<void> {
    // Find session by caller or target channel
    let session = this.sessions.get(channelId);
    if (!session) {
      // Check if it's a target channel
      for (const [callerId, sess] of this.sessions.entries()) {
        if (sess.targetChannelId === channelId) {
          session = sess;
          channelId = callerId;
          break;
        }
      }
    }

    if (!session) {
      return;
    }

    try {
      // Hangup other party if connected
      if (session.state === 'connected') {
        if (session.targetChannelId) {
          await this.ariService.hangupChannel(session.targetChannelId).catch(() => {});
        }
        await this.ariService.hangupChannel(session.channelId).catch(() => {});
      }

      // Destroy bridge
      if (session.bridgeId) {
        await this.ariService.destroyBridge(session.bridgeId).catch(() => {});
      }
    } catch (error) {
      this.logger.warn(`Cleanup error: ${error.message}`);
    } finally {
      this.sessions.delete(channelId);
      this.logger.log(`Directory: Session cleaned up for ${channelId}`);
    }
  }

  // Session management methods
  createSession(session: DirectorySession): void {
    this.sessions.set(session.channelId, session);
  }

  getSession(channelId: string): DirectorySession | undefined {
    return this.sessions.get(channelId);
  }

  deleteSession(channelId: string): void {
    this.sessions.delete(channelId);
  }

  findSessionByChannel(channelId: string): DirectorySession | undefined {
    // Check if it's the main channel
    let session = this.sessions.get(channelId);
    if (session) return session;

    // Check if it's a target channel
    for (const sess of this.sessions.values()) {
      if (sess.targetChannelId === channelId) {
        return sess;
      }
    }

    return undefined;
  }
}
