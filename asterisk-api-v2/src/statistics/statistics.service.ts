import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cdr } from '../cdr/entities/cdr.entity';
import { Queue } from '../queues/entities/queue.entity';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { Recording } from '../recordings/entities/recording.entity';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { AriService } from '../core/asterisk/ari/ari.service';
import { StatisticsFilterDto } from './dto';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    @InjectRepository(Cdr)
    private readonly cdrRepository: Repository<Cdr>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(PsEndpoint)
    private readonly endpointRepository: Repository<PsEndpoint>,
    @InjectRepository(Recording)
    private readonly recordingRepository: Repository<Recording>,
    private readonly amiService: AmiService,
    private readonly ariService: AriService,
  ) {}

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(filter: StatisticsFilterDto): Promise<any> {
    try {
      const [calls, queues, endpoints, recordings, trend] = await Promise.all([
        this.getCallStatistics(filter),
        this.getQueueStatistics(filter),
        this.getEndpointStatistics(filter),
        this.getRecordingStatistics(filter),
        this.getCallsTrend(filter),
      ]);

      return {
        timestamp: new Date().toISOString(),
        period: {
          start: filter.start_date,
          end: filter.end_date,
        },
        calls,
        queues,
        endpoints,
        recordings,
        trend,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get dashboard: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get summary (lightweight dashboard)
   */
  async getSummary(filter: StatisticsFilterDto): Promise<any> {
    try {
      // Set defaults: last 7 days
      const endDate = filter.end_date || new Date().toISOString().split('T')[0];
      const startDate =
        filter.start_date ||
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const callStats = await this.getCallStatistics({
        ...filter,
        start_date: startDate,
        end_date: endDate,
      });

      const endpointStats = await this.getEndpointStatistics(filter);

      const totalQueues = await this.queueRepository.count({
        where: filter.tenant_id ? { tenantId: filter.tenant_id } : {},
      });

      // Get active channels from ARI
      let activeCalls = 0;
      try {
        const channels = await this.ariService.getChannels();
        activeCalls = channels.length > 0 ? Math.ceil(channels.length / 2) : 0;
      } catch (err: any) {
        this.logger.warn(`Failed to get active channels: ${err.message}`);
      }

      return {
        calls: {
          total: callStats.total_calls,
          answered: callStats.answered_calls,
          answer_rate: callStats.answer_rate_percent,
          active_now: activeCalls,
          data_source: 'hybrid',
        },
        queues: totalQueues,
        endpoints: endpointStats.total_endpoints,
        endpoints_registered: endpointStats.registered_endpoints || 0,
        period: {
          start: startDate,
          end: endDate,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStatistics(filter: StatisticsFilterDto): Promise<any> {
    try {
      const where: any = {};

      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }

      if (filter.start_date && filter.end_date) {
        where.calldate = Between(new Date(filter.start_date), new Date(filter.end_date));
      } else if (filter.start_date) {
        where.calldate = MoreThanOrEqual(new Date(filter.start_date));
      } else if (filter.end_date) {
        where.calldate = LessThanOrEqual(new Date(filter.end_date));
      }

      const calls = await this.cdrRepository.find({ where });

      const totalCalls = calls.length;
      const answeredCalls = calls.filter((c) => c.disposition === 'ANSWERED').length;
      const failedCalls = calls.filter((c) =>
        ['FAILED', 'BUSY', 'NO ANSWER'].includes(c.disposition),
      ).length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const totalBillsec = calls.reduce((sum, c) => sum + (c.billsec || 0), 0);

      const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
      const avgDuration = answeredCalls > 0 ? totalBillsec / answeredCalls : 0;

      // Get active channels
      let activeCallsNow = 0;
      try {
        const channels = await this.ariService.getChannels();
        activeCallsNow = channels.length > 0 ? Math.ceil(channels.length / 2) : 0;
      } catch (err: any) {
        this.logger.warn(`Failed to get active calls: ${err.message}`);
      }

      return {
        total_calls: totalCalls,
        answered_calls: answeredCalls,
        failed_calls: failedCalls,
        answer_rate_percent: parseFloat(answerRate.toFixed(2)),
        total_duration_seconds: totalDuration,
        total_billable_seconds: totalBillsec,
        avg_duration_seconds: parseFloat(avgDuration.toFixed(2)),
        active_calls_now: activeCallsNow,
        data_source: activeCallsNow > 0 ? 'hybrid' : 'database',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get call statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(filter: StatisticsFilterDto): Promise<any> {
    try {
      const where: any = {};

      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }

      const queues = await this.queueRepository.find({ where });

      const queueStats = await Promise.all(
        queues.map(async (queue) => {
          // Get queue calls from CDR
          const queueCalls = await this.cdrRepository.count({
            where: {
              dstchannel: `Queue:${queue.name}`,
              ...(filter.start_date && filter.end_date
                ? { calldate: Between(new Date(filter.start_date), new Date(filter.end_date)) }
                : {}),
            },
          });

          return {
            queue_name: queue.name,
            total_calls: queueCalls,
            strategy: queue.strategy,
            timeout: queue.timeout,
          };
        }),
      );

      return {
        total_queues: queues.length,
        queues: queueStats,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get queue statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get endpoint statistics
   */
  async getEndpointStatistics(filter: StatisticsFilterDto): Promise<any> {
    try {
      const where: any = {};

      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }

      const totalEndpoints = await this.endpointRepository.count({ where });

      // Try to get registered endpoints from AMI
      let registeredEndpoints = 0;
      try {
        const result = await this.amiService.executeAction({
          Action: 'PJSIPShowEndpoints',
        });
        // Parse AMI response to count registered endpoints
        // This is a simplified count
        registeredEndpoints = result?.events?.length || 0;
      } catch (err: any) {
        this.logger.warn(`Failed to get registered endpoints: ${err.message}`);
      }

      return {
        total_endpoints: totalEndpoints,
        registered_endpoints: registeredEndpoints,
        data_source: registeredEndpoints > 0 ? 'ami' : 'database',
      };
    } catch (error: any) {
      this.logger.error(`Failed to get endpoint statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recording statistics
   */
  async getRecordingStatistics(filter: StatisticsFilterDto): Promise<any> {
    try {
      const where: any = {};

      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }

      if (filter.start_date && filter.end_date) {
        where.createdAt = Between(new Date(filter.start_date), new Date(filter.end_date));
      }

      const recordings = await this.recordingRepository.find({ where });

      const totalRecordings = recordings.length;
      const totalSize = recordings.reduce((sum, r) => sum + (r.filesize || 0), 0);
      const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);

      return {
        total_recordings: totalRecordings,
        total_size_bytes: totalSize,
        total_duration_seconds: totalDuration,
        avg_duration_seconds:
          totalRecordings > 0 ? parseFloat((totalDuration / totalRecordings).toFixed(2)) : 0,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get recording statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top callers
   */
  async getTopCallers(filter: StatisticsFilterDto): Promise<any> {
    try {
      const limit = filter.limit || 10;

      const where: any = {};
      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }
      if (filter.start_date && filter.end_date) {
        where.calldate = Between(new Date(filter.start_date), new Date(filter.end_date));
      }

      const calls = await this.cdrRepository.find({ where });

      // Group by caller (src)
      const callerMap = new Map<string, { count: number; duration: number }>();

      calls.forEach((call) => {
        const existing = callerMap.get(call.src) || { count: 0, duration: 0 };
        callerMap.set(call.src, {
          count: existing.count + 1,
          duration: existing.duration + (call.billsec || 0),
        });
      });

      // Sort and limit
      const topCallers = Array.from(callerMap.entries())
        .map(([number, data]) => ({
          number,
          call_count: data.count,
          total_duration_seconds: data.duration,
          avg_duration_seconds: parseFloat((data.duration / data.count).toFixed(2)),
        }))
        .sort((a, b) => b.call_count - a.call_count)
        .slice(0, limit);

      return {
        top_callers: topCallers,
        limit,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get top callers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top called numbers
   */
  async getTopCalled(filter: StatisticsFilterDto): Promise<any> {
    try {
      const limit = filter.limit || 10;

      const where: any = {};
      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }
      if (filter.start_date && filter.end_date) {
        where.calldate = Between(new Date(filter.start_date), new Date(filter.end_date));
      }

      const calls = await this.cdrRepository.find({ where });

      // Group by destination (dst)
      const dstMap = new Map<string, { count: number; duration: number }>();

      calls.forEach((call) => {
        const existing = dstMap.get(call.dst) || { count: 0, duration: 0 };
        dstMap.set(call.dst, {
          count: existing.count + 1,
          duration: existing.duration + (call.billsec || 0),
        });
      });

      // Sort and limit
      const topCalled = Array.from(dstMap.entries())
        .map(([number, data]) => ({
          number,
          call_count: data.count,
          total_duration_seconds: data.duration,
          avg_duration_seconds: parseFloat((data.duration / data.count).toFixed(2)),
        }))
        .sort((a, b) => b.call_count - a.call_count)
        .slice(0, limit);

      return {
        top_called: topCalled,
        limit,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get top called: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active channels (real-time)
   */
  async getActiveChannels(): Promise<any> {
    try {
      const channels = await this.ariService.getChannels();

      return {
        active_channels: channels.length,
        active_calls: channels.length > 0 ? Math.ceil(channels.length / 2) : 0,
        channels: channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          state: ch.state,
          caller: ch.caller,
          connected: ch.connected,
          creationtime: ch.creationtime,
        })),
        data_source: 'ari',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get active channels: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get calls trend over time
   */
  async getCallsTrend(filter: StatisticsFilterDto): Promise<any> {
    try {
      const groupBy = filter.group_by || 'day';

      const where: any = {};
      if (filter.tenant_id) {
        where.tenantId = filter.tenant_id;
      }
      if (filter.start_date && filter.end_date) {
        where.calldate = Between(new Date(filter.start_date), new Date(filter.end_date));
      }

      const calls = await this.cdrRepository.find({
        where,
        order: { calldate: 'ASC' },
      });

      // Group calls by period
      const trendMap = new Map<string, { count: number; answered: number; failed: number }>();

      calls.forEach((call) => {
        let key: string;
        const date = new Date(call.calldate);

        switch (groupBy) {
          case 'hour':
            key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
            break;
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekNum = this.getWeekNumber(date);
            key = `${date.getFullYear()}-W${weekNum}`;
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        const existing = trendMap.get(key) || { count: 0, answered: 0, failed: 0 };
        trendMap.set(key, {
          count: existing.count + 1,
          answered: existing.answered + (call.disposition === 'ANSWERED' ? 1 : 0),
          failed:
            existing.failed + (['FAILED', 'BUSY', 'NO ANSWER'].includes(call.disposition) ? 1 : 0),
        });
      });

      // Convert to array
      const trend = Array.from(trendMap.entries())
        .map(([period, data]) => ({
          period,
          total_calls: data.count,
          answered_calls: data.answered,
          failed_calls: data.failed,
          answer_rate_percent: parseFloat(((data.answered / data.count) * 100).toFixed(2)),
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        group_by: groupBy,
        trend,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get calls trend: ${error.message}`);
      throw error;
    }
  }

  // Helper method to get week number
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
