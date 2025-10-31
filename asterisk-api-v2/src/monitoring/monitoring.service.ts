import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import {
  DashboardDto,
  QueueStatsDto,
  ChannelStatsDto,
  AgentStatsDto,
  SystemStatsDto,
} from './dto';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { AriService } from '../core/asterisk/ari/ari.service';
import { Queue } from '../queues/entities/queue.entity';
import { QueueMember } from '../queue-members/entities/queue-member.entity';
import { Cdr } from '../cdr/entities/cdr.entity';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly amiService: AmiService,
    private readonly ariService: AriService,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(QueueMember)
    private readonly memberRepository: Repository<QueueMember>,
    @InjectRepository(Cdr)
    private readonly cdrRepository: Repository<Cdr>,
  ) {}

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(tenantId: number): Promise<DashboardDto> {
    const [system, channels, agents, queues] = await Promise.all([
      this.getSystemStats(),
      this.getChannelStats(tenantId),
      this.getAgentStats(tenantId),
      this.getQueueStats(tenantId),
    ]);

    return {
      timestamp: new Date().toISOString(),
      system,
      channels,
      agents,
      queues,
    };
  }

  /**
   * Get system-level statistics
   */
  private async getSystemStats(): Promise<SystemStatsDto> {
    try {
      const channels = await this.ariService.getChannels();

      // Get today's call count
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const callsToday = await this.cdrRepository.count({
        where: {
          calldate: MoreThanOrEqual(startOfDay),
        },
      });

      return {
        uptime: 0, // Would need AMI command to get uptime
        version: '20.0.0', // Would need AMI command to get version
        activeCalls: channels.length,
        callsToday,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get system stats: ${error.message}`);
      return {
        uptime: 0,
        version: 'unknown',
        activeCalls: 0,
        callsToday: 0,
      };
    }
  }

  /**
   * Get channel statistics
   */
  private async getChannelStats(tenantId: number): Promise<ChannelStatsDto> {
    try {
      const channels = await this.ariService.getChannels();

      // Filter by tenant prefix
      const tenantChannels = channels.filter((channel: any) => {
        const channelName = channel.name || '';
        const prefix = `t${tenantId}_`;
        return channelName.includes(prefix);
      });

      const upChannels = tenantChannels.filter(
        (ch: any) => ch.state === 'Up',
      ).length;
      const ringingChannels = tenantChannels.filter((ch: any) =>
        ['Ring', 'Ringing'].includes(ch.state),
      ).length;
      const dialingChannels = tenantChannels.filter(
        (ch: any) => ch.state === 'Dialing',
      ).length;

      return {
        totalActive: tenantChannels.length,
        upChannels,
        ringingChannels,
        dialingChannels,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get channel stats: ${error.message}`);
      return {
        totalActive: 0,
        upChannels: 0,
        ringingChannels: 0,
        dialingChannels: 0,
      };
    }
  }

  /**
   * Get agent statistics
   */
  private async getAgentStats(tenantId: number): Promise<AgentStatsDto> {
    try {
      const members = await this.memberRepository.find({
        where: { tenantId },
      });

      const totalAgents = members.length;
      const pausedAgents = members.filter((m) => m.paused === 1).length;

      // Get active channels to determine busy agents
      const channels = await this.ariService.getChannels();
      const tenantChannels = channels.filter((channel: any) => {
        const channelName = channel.name || '';
        return channelName.includes(`t${tenantId}_`);
      });

      const busyAgents = tenantChannels.filter(
        (ch: any) => ch.state === 'Up',
      ).length;

      const availableAgents = totalAgents - pausedAgents - busyAgents;

      return {
        totalAgents,
        availableAgents: Math.max(0, availableAgents),
        busyAgents,
        pausedAgents,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get agent stats: ${error.message}`);
      return {
        totalAgents: 0,
        availableAgents: 0,
        busyAgents: 0,
        pausedAgents: 0,
      };
    }
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(tenantId: number): Promise<QueueStatsDto[]> {
    try {
      const queues = await this.queueRepository.find({
        where: { tenantId },
      });

      const queueStats: QueueStatsDto[] = [];

      for (const queue of queues) {
        try {
          const amiStats = await this.amiService.getQueueStatus(queue.name);

          const members = await this.memberRepository.find({
            where: { tenantId, queueName: queue.name },
          });

          const availableMembers = members.filter((m) => m.paused === 0).length;

          queueStats.push({
            name: queue.name,
            activeCalls: amiStats.calls || 0,
            availableMembers,
            totalMembers: members.length,
            avgHoldTime: amiStats.holdtime || 0,
          });
        } catch (error: any) {
          // Queue might not exist in Asterisk yet
          this.logger.warn(
            `Failed to get stats for queue ${queue.name}: ${error.message}`,
          );
          queueStats.push({
            name: queue.name,
            activeCalls: 0,
            availableMembers: 0,
            totalMembers: 0,
            avgHoldTime: 0,
          });
        }
      }

      return queueStats;
    } catch (error: any) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Get recent events (for real-time monitoring)
   */
  async getRecentEvents(tenantId: number, limit: number = 50): Promise<any[]> {
    // This would typically pull from a Redis stream or event log
    // For now, return recent CDR records
    const recentCalls = await this.cdrRepository.find({
      where: { tenantId },
      order: { calldate: 'DESC' },
      take: limit,
    });

    return recentCalls.map((call) => ({
      type: 'call',
      timestamp: call.calldate,
      src: call.src,
      dst: call.dst,
      disposition: call.disposition,
      duration: call.duration,
    }));
  }
}
