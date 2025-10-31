import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import { AriService } from '../core/asterisk/ari/ari.service';
import { OriginateCallDto, ChannelFilterDto } from './dto';
import { TenantPrefixUtil } from '../common/utils/tenant-prefix.util';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(private readonly ariService: AriService) {}

  /**
   * List all active channels with optional filtering
   */
  async findAll(tenantId: number, filter?: ChannelFilterDto): Promise<any[]> {
    try {
      const channels = await this.ariService.getChannels();

      // Filter by tenant prefix
      const tenantChannels = channels.filter((channel: any) => {
        const channelName = channel.name || '';
        const prefix = `t${tenantId}_`;
        return channelName.includes(prefix);
      });

      // Apply additional filters
      let filtered = tenantChannels;

      if (filter?.state) {
        filtered = filtered.filter((ch: any) => ch.state === filter.state);
      }

      if (filter?.callerId) {
        filtered = filtered.filter((ch: any) => {
          const caller = ch.caller?.number || '';
          return caller.includes(filter.callerId);
        });
      }

      return filtered;
    } catch (error: any) {
      this.logger.error(`Failed to list channels: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get details of a specific channel
   */
  async findOne(channelId: string): Promise<any> {
    try {
      return await this.ariService.getChannel(channelId);
    } catch (error: any) {
      this.logger.error(`Failed to get channel ${channelId}: ${error.message}`);
      throw new NotFoundException(`Channel ${channelId} not found`);
    }
  }

  /**
   * Originate an outbound call
   */
  async originate(
    tenantId: number,
    dto: OriginateCallDto,
  ): Promise<{ channelId: string }> {
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(tenantId, dto.endpoint);
    const endpoint = `PJSIP/${prefixedEndpoint}`;
    const context = dto.context || 'default';
    const timeout = dto.timeout || 30;

    const variables: Record<string, string> = {
      TENANT_ID: tenantId.toString(),
      ...(dto.variables || {}),
    };

    if (dto.callerIdName) {
      variables.CALLERID_NAME = dto.callerIdName;
    }

    if (dto.callerIdNumber) {
      variables.CALLERID_NUM = dto.callerIdNumber;
    }

    try {
      const channel = await this.ariService.originateCall({
        endpoint,
        extension: dto.extension,
        context,
        timeout,
        variables,
      });

      this.logger.log(
        `Originated call from ${dto.endpoint} to ${dto.extension}`,
      );

      return { channelId: channel.id };
    } catch (error: any) {
      this.logger.error(`Failed to originate call: ${error.message}`);
      throw new BadRequestException(`Failed to originate call: ${error.message}`);
    }
  }

  /**
   * Answer a ringing channel
   */
  async answer(channelId: string): Promise<void> {
    try {
      await this.ariService.answerChannel(channelId);
      this.logger.log(`Answered channel ${channelId}`);
    } catch (error: any) {
      this.logger.error(`Failed to answer channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to answer channel: ${error.message}`);
    }
  }

  /**
   * Hangup a channel
   */
  async hangup(channelId: string, reason?: string): Promise<void> {
    try {
      await this.ariService.hangupChannel(channelId, reason);
      this.logger.log(`Hung up channel ${channelId}`);
    } catch (error: any) {
      this.logger.error(`Failed to hangup channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to hangup channel: ${error.message}`);
    }
  }

  /**
   * Hold a channel
   */
  async hold(channelId: string): Promise<void> {
    try {
      await this.ariService.holdChannel(channelId);
      this.logger.log(`Held channel ${channelId}`);
    } catch (error: any) {
      this.logger.error(`Failed to hold channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to hold channel: ${error.message}`);
    }
  }

  /**
   * Unhold a channel
   */
  async unhold(channelId: string): Promise<void> {
    try {
      await this.ariService.unholdChannel(channelId);
      this.logger.log(`Unheld channel ${channelId}`);
    } catch (error: any) {
      this.logger.error(`Failed to unhold channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to unhold channel: ${error.message}`);
    }
  }

  /**
   * Mute a channel
   */
  async mute(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.ariService.muteChannel(channelId, direction);
      this.logger.log(`Muted channel ${channelId} (${direction})`);
    } catch (error: any) {
      this.logger.error(`Failed to mute channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to mute channel: ${error.message}`);
    }
  }

  /**
   * Unmute a channel
   */
  async unmute(channelId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<void> {
    try {
      await this.ariService.unmuteChannel(channelId, direction);
      this.logger.log(`Unmuted channel ${channelId} (${direction})`);
    } catch (error: any) {
      this.logger.error(`Failed to unmute channel ${channelId}: ${error.message}`);
      throw new BadRequestException(`Failed to unmute channel: ${error.message}`);
    }
  }
}
