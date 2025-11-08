import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Queue } from './entities/queue.entity';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { Extension } from '../core/database/entities/extension.entity';
import { Tenant } from '../core/database/entities/tenant.entity';
import { TenantContext } from '../core/database/entities/tenant-context.entity';

import { AmiService } from '../core/asterisk/ami/ami.service';
import { CacheService } from '../core/cache/cache.service';
import { TenantsService } from '../tenants/tenants.service';
import { TenantPrefixUtil } from '../common/utils/tenant-prefix.util';
import { AMI_TIMEOUTS } from '../core/asterisk/ami/ami.constants';

@Injectable()
export class QueuesService {
  private readonly logger = new Logger(QueuesService.name);

  constructor(
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    @InjectRepository(Extension)
    private readonly extensionRepository: Repository<Extension>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantContext)
    private readonly tenantContextRepository: Repository<TenantContext>,
    private readonly dataSource: DataSource,
    private readonly amiService: AmiService,
    private readonly cacheService: CacheService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(tenantId: number, dto: CreateQueueDto): Promise<Queue> {
    // STEP 1: Validate context belongs to tenant (CRITICAL SECURITY)
    await this.validateContextOwnership(tenantId, dto.context);

    // STEP 2: Check tenant limits
    const count = await this.queueRepository.count({ where: { tenantId } });
    const hasReachedLimit = await this.tenantsService.hasReachedQueueLimit(
      tenantId,
      count,
    );

    if (hasReachedLimit) {
      throw new BadRequestException(
        'Tenant has reached maximum queues limit',
      );
    }

    const prefixedName = TenantPrefixUtil.addPrefix(tenantId, dto.name);

    // STEP 3: Check if queue already exists
    const existing = await this.queueRepository.findOne({
      where: { tenantId, name: prefixedName },
    });

    if (existing) {
      throw new ConflictException(
        `Queue with name "${dto.name}" already exists`,
      );
    }

    // STEP 4: Use transaction to create queue + extensions atomically
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create queue with context
      const queue = this.queueRepository.create({
        tenantId,
        name: prefixedName,
        context: dto.context, // REQUIRED field
        strategy: dto.strategy || 'ringall',
        timeout: dto.timeout || 15,
        retry: dto.retry || 5,
        maxlen: dto.maxlen || 0,
        wrapuptime: dto.wrapuptime || 0,
        musiconhold: dto.musicclass,
        servicelevel: dto.servicelevel || 60,
      });

      const saved = await queryRunner.manager.save(queue);

      // STEP 5: Create routing extensions if specified
      if (dto.routingRules && dto.routingRules.length > 0) {
        const extensions: Extension[] = [];

        for (const rule of dto.routingRules) {
          // Check if extension already exists
          const existingExt = await queryRunner.manager.findOne(Extension, {
            where: {
              tenantId,
              context: dto.context,
              exten: rule.extensionPattern,
              priority: rule.priority || 1,
            },
          });

          if (existingExt) {
            throw new ConflictException(
              `Extension "${rule.extensionPattern}" at priority ${rule.priority || 1} already exists in context "${dto.context}"`,
            );
          }

          // Create extension that routes to this queue
          const extension = this.extensionRepository.create({
            tenantId,
            context: dto.context,
            exten: rule.extensionPattern,
            priority: rule.priority || 1,
            app: 'Queue',
            appdata: `${prefixedName}${rule.queueOptions ? ',' + rule.queueOptions : ''}`,
          });

          extensions.push(extension);
        }

        if (extensions.length > 0) {
          await queryRunner.manager.save(Extension, extensions);
          this.logger.log(
            `Created ${extensions.length} routing extension(s) for queue ${prefixedName}`,
          );
        }
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // STEP 6: Clear cache
      await this.cacheService.del(
        CacheService.generateKey('queues', String(tenantId), 'list'),
      );
      // Also clear extensions cache since we may have created extensions
      await this.cacheService.del(
        CacheService.generateKey('extensions', String(tenantId), 'list'),
      );

      this.logger.log(
        `Created queue: ${dto.name} (${prefixedName}) for tenant ${tenantId} in context ${dto.context}`,
      );

      // STEP 7: Auto-reload in Asterisk AFTER successful DB commit
      try {
        await this.reloadQueue(tenantId, prefixedName);
        this.logger.log(
          `✅ Queue ${prefixedName} automatically reloaded in Asterisk`,
        );
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to auto-reload queue ${prefixedName}: ${error.message}`,
        );
        // Don't fail the request if reload fails - queue is already in DB
      }

      return saved;
    } catch (error) {
      // Rollback transaction on any error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create queue: ${error.message}`);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  async findAll(tenantId: number | null): Promise<Queue[]> {
    const cacheKey = CacheService.generateKey(
      'queues',
      String(tenantId || 'all'),
      'list',
    );

    const cached = await this.cacheService.get<Queue[]>(cacheKey);
    if (cached) return cached;

    const query = this.queueRepository.createQueryBuilder('queue');

    if (tenantId !== null) {
      query.where('queue.tenantId = :tenantId', { tenantId });
    }

    query.orderBy('queue.name', 'ASC');

    const queues = await query.getMany();
    await this.cacheService.set(cacheKey, queues, 120);

    return queues;
  }

  async findOne(tenantId: number | null, name: string): Promise<Queue> {
    const where: any = { name };

    if (tenantId !== null) {
      where.tenantId = tenantId;
    }

    const queue = await this.queueRepository.findOne({ where });

    if (!queue) {
      throw new NotFoundException(
        `Queue with name "${name}" not found`,
      );
    }

    return queue;
  }

  async findOneWithStats(tenantId: number | null, displayName: string) {
    const queue = await this.findOne(tenantId, displayName);

    // Get real-time stats from AMI
    let stats: any = null;
    try {
      const amiStats = await this.amiService.getQueueStatus(queue.name);
      stats = {
        calls: amiStats.calls || 0,
        holdtime: amiStats.holdtime || 0,
        talktime: amiStats.talktime || 0,
        completed: amiStats.completed || 0,
        abandoned: amiStats.abandoned || 0,
        servicelevelperf: amiStats.servicelevelperf || 0,
        members: amiStats.members || [],
      };
    } catch (error) {
      this.logger.warn(
        `Failed to get AMI stats for queue ${queue.name}: ${error.message}`,
      );
      stats = { calls: 0, members: [] };
    }

    return {
      ...queue,
      stats,
    };
  }

  async update(
    tenantId: number | null,
    displayName: string,
    dto: UpdateQueueDto,
  ): Promise<Queue> {
    const queue = await this.findOne(tenantId, displayName);

    // If changing context, validate ownership
    if (dto.context && dto.context !== queue.context && tenantId !== null) {
      await this.validateContextOwnership(tenantId, dto.context);
    }

    Object.assign(queue, dto);

    const updated = await this.queueRepository.save(queue);

    await this.cacheService.delPattern(`queues:${tenantId}:*`);

    this.logger.log(`Updated queue: ${displayName} for tenant ${tenantId}`);
    return updated;
  }

  async remove(tenantId: number | null, displayName: string): Promise<void> {
    const queue = await this.findOne(tenantId, displayName);

    await this.queueRepository.remove(queue);

    await this.cacheService.delPattern(`queues:${tenantId}:*`);

    this.logger.log(`Deleted queue: ${displayName} for tenant ${tenantId}`);
  }

  // ========================================
  // NEW ENRICHED APIs
  // ========================================

  /**
   * Get all queues from AMI with full details
   * FIXED - Don't filter by ActionID, collect all queue events
   */
  private async getAllQueuesFromAMI(): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const queues: Record<string, any> = {};
      const actionId = `queue_all_${Date.now()}`;
      let collecting = true;
      let timeoutHandle: NodeJS.Timeout;

      const eventHandler = (event: any) => {
        if (!collecting) return;

        const eventName = event.event;

        // Log all queue-related events for debugging
        if (eventName === 'QueueParams' || eventName === 'QueueMember' || eventName === 'QueueStatusComplete') {
          this.logger.debug(`🔔 [QUEUE EVENT] ${eventName} - Queue: ${event.queue || 'N/A'}, ActionID: ${event.actionid || 'none'}`);
        }

        // Collect all QueueParams events (one per queue)
        if (eventName === 'QueueParams') {
          const queueName = event.queue;
          if (queueName) {
            queues[queueName] = {
              name: queueName,
              max: event.max || 0,
              strategy: event.strategy || 'unknown',
              calls: parseInt(event.calls || '0'),
              holdtime: parseInt(event.holdtime || '0'),
              talktime: parseInt(event.talktime || '0'),
              completed: parseInt(event.completed || '0'),
              abandoned: parseInt(event.abandoned || '0'),
              service_level: parseInt(event.servicelevel || '0'),
              service_level_perf: parseFloat(event.servicelevelperf || '0'),
              weight: parseInt(event.weight || '0'),
              members: [],
            };
          }
        }
        // Collect all QueueMember events (multiple per queue)
        else if (eventName === 'QueueMember') {
          const queueName = event.queue;
          if (queueName && queues[queueName]) {
            queues[queueName].members.push({
              interface: event.location || event.interface,
              name: event.membername || event.name,
              status: event.status,
              paused: parseInt(event.paused) === 1,
              calls_taken: parseInt(event.callstaken || '0'),
              last_call: parseInt(event.lastcall || '0'),
              penalty: parseInt(event.penalty || '0'),
              in_call: parseInt(event.incall || '0'),
            });
          }
        }
        // When we get QueueStatusComplete, we're done
        else if (eventName === 'QueueStatusComplete') {
          collecting = false;
          this.amiService.off('managerevent', eventHandler);
          clearTimeout(timeoutHandle);
          this.logger.log(`✅ Queues found in AMI: ${Object.keys(queues).length}`);
          resolve(queues);
        }
      };

      // Subscribe to events
      this.amiService.on('managerevent', eventHandler);

      // Send the QueueStatus action
      this.amiService
        .executeAction(
          {
            Action: 'QueueStatus',
            ActionID: actionId,
          },
          AMI_TIMEOUTS.QUEUE_STATUS,
        )
        .catch((err) => {
          if (!collecting) return;
          collecting = false;
          this.amiService.off('managerevent', eventHandler);
          clearTimeout(timeoutHandle);
          this.logger.error('❌ Error getting all queues from AMI:', err);
          reject(err);
        });

      // Safety timeout - return whatever we collected so far
      timeoutHandle = setTimeout(() => {
        if (!collecting) return;
        collecting = false;
        this.amiService.off('managerevent', eventHandler);
        const queueCount = Object.keys(queues).length;
        if (queueCount > 0) {
          this.logger.warn(`⏱️ Timeout getting all queues from AMI, but collected ${queueCount} queues`);
          resolve(queues);
        } else {
          this.logger.warn('⏱️ Timeout getting all queues from AMI, no queues collected');
          resolve(queues); // Return empty object instead of rejecting
        }
      }, 5000);
    });
  }

  /**
   * Calculate visual state based on calls and wait time
   */
  private calculateVisualState(
    callsWaiting: number,
    avgHoldtime: number,
  ): 'idle' | 'active' | 'busy' | 'critical' {
    if (callsWaiting === 0) {
      return 'idle';
    } else if (callsWaiting <= 2 && avgHoldtime < 60) {
      return 'active';
    } else if (callsWaiting <= 5 && avgHoldtime < 120) {
      return 'busy';
    } else {
      return 'critical';
    }
  }

  /**
   * GET /api/v1/queues/enriched
   * Get all queues enriched with full AMI data
   */
  async findAllEnriched(tenantId: number | null): Promise<any[]> {
    try {
      // 1. Get base data from DB
      const queuesFromDB = await this.findAll(tenantId);

      // 2. Get full AMI data
      let queuesFromAMI: Record<string, any> = {};
      try {
        queuesFromAMI = await this.getAllQueuesFromAMI();
      } catch (err) {
        this.logger.warn(
          '⚠️ AMI not available for enrichment, using DB data only',
        );
      }

      // 3. Enrich each queue with extended AMI data
      const enrichedQueues = queuesFromDB.map((queue) => {
        const amiData = queuesFromAMI[queue.name] || {};

        // Calculate extended statistics
        const calls_waiting = parseInt(amiData.calls || 0);
        const members = amiData.members || [];
        const members_total = members.length;
        const members_available = members.filter(
          (m: any) => m.status === '1' && !m.paused && m.in_call === 0,
        ).length;
        const members_in_call = members.filter((m: any) => m.in_call > 0).length;
        const members_paused = members.filter((m: any) => m.paused).length;
        const members_unavailable = members.filter((m: any) => m.status !== '1')
          .length;

        // Calculate longest wait time (estimation)
        const avg_holdtime = parseInt(amiData.holdtime || 0);
        const longest_wait_time =
          calls_waiting > 0 ? Math.round(avg_holdtime * 1.5) : 0;

        // Determine visual state
        const visual_state = this.calculateVisualState(
          calls_waiting,
          longest_wait_time,
        );

        // Calculate abandonment rate
        const total_calls =
          (amiData.completed || 0) + (amiData.abandoned || 0);
        const abandonment_rate =
          total_calls > 0
            ? parseFloat((((amiData.abandoned || 0) / total_calls) * 100).toFixed(2))
            : 0;

        // Calculate agent utilization
        const agent_utilization =
          members_total > 0
            ? parseFloat(((members_in_call / members_total) * 100).toFixed(2))
            : 0;

        return {
          // Base DB data
          ...queue,

          // Call statistics from AMI
          calls_waiting,
          calls_completed: parseInt(amiData.completed || 0),
          calls_abandoned: parseInt(amiData.abandoned || 0),
          calls_total: total_calls,

          // Time and performance
          avg_holdtime,
          avg_talktime: parseInt(amiData.talktime || 0),
          longest_wait_time,
          service_level: parseInt(amiData.service_level || 0),
          service_level_perf: parseFloat(amiData.service_level_perf || 0),

          // Calculated metrics
          abandonment_rate,
          agent_utilization,

          // Member statistics
          members_total,
          members_available,
          members_in_call,
          members_paused,
          members_unavailable,

          // Visual state
          visual_state,

          // AMI metadata
          ami_connected: Object.keys(queuesFromAMI).length > 0,
          ami_data_available: !!amiData.name,

          // Timestamp
          enriched_at: new Date().toISOString(),
        };
      });

      return enrichedQueues;
    } catch (error) {
      this.logger.error('❌ Error in findAllEnriched:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/queues/stats/global
   * Get global aggregated statistics for all queues
   */
  async getGlobalStats(tenantId: number | null): Promise<any> {
    try {
      // Get enriched queues
      const enrichedQueues = await this.findAllEnriched(tenantId);

      // Aggregate statistics
      const stats = {
        // Base counters
        total_queues: enrichedQueues.length,
        total_calls_waiting: 0,
        total_calls_completed: 0,
        total_calls_abandoned: 0,
        total_calls_handled: 0,

        // Global member statistics
        total_members: 0,
        members_available: 0,
        members_in_call: 0,
        members_paused: 0,
        members_unavailable: 0,

        // Global performance metrics
        avg_holdtime_global: 0,
        avg_talktime_global: 0,
        longest_wait_time_global: 0,
        global_abandonment_rate: 0,
        global_agent_utilization: 0,

        // Distribution by visual state
        queues_idle: 0,
        queues_active: 0,
        queues_busy: 0,
        queues_critical: 0,

        // Top busy queues
        top_busy_queues: [] as any[],

        // Metadata
        ami_connected:
          enrichedQueues.length > 0 ? enrichedQueues[0].ami_connected : false,
        calculated_at: new Date().toISOString(),
        tenant_id: tenantId,
      };

      let total_holdtime = 0;
      let total_talktime = 0;
      let queues_with_calls = 0;

      enrichedQueues.forEach((queue: any) => {
        // Calls
        stats.total_calls_waiting += queue.calls_waiting || 0;
        stats.total_calls_completed += queue.calls_completed || 0;
        stats.total_calls_abandoned += queue.calls_abandoned || 0;

        // Members
        stats.total_members += queue.members_total || 0;
        stats.members_available += queue.members_available || 0;
        stats.members_in_call += queue.members_in_call || 0;
        stats.members_paused += queue.members_paused || 0;
        stats.members_unavailable += queue.members_unavailable || 0;

        // Times
        if (queue.avg_holdtime > 0) {
          total_holdtime += queue.avg_holdtime;
          queues_with_calls++;
        }
        total_talktime += queue.avg_talktime || 0;

        if (queue.longest_wait_time > stats.longest_wait_time_global) {
          stats.longest_wait_time_global = queue.longest_wait_time;
        }

        // Visual states
        switch (queue.visual_state) {
          case 'idle':
            stats.queues_idle++;
            break;
          case 'active':
            stats.queues_active++;
            break;
          case 'busy':
            stats.queues_busy++;
            break;
          case 'critical':
            stats.queues_critical++;
            break;
        }
      });

      // Calculate totals and averages
      stats.total_calls_handled =
        stats.total_calls_completed + stats.total_calls_abandoned;
      stats.avg_holdtime_global =
        queues_with_calls > 0 ? Math.round(total_holdtime / queues_with_calls) : 0;
      stats.avg_talktime_global =
        enrichedQueues.length > 0
          ? Math.round(total_talktime / enrichedQueues.length)
          : 0;

      if (stats.total_calls_handled > 0) {
        stats.global_abandonment_rate = parseFloat(
          ((stats.total_calls_abandoned / stats.total_calls_handled) * 100).toFixed(
            2,
          ),
        );
      }

      if (stats.total_members > 0) {
        stats.global_agent_utilization = parseFloat(
          ((stats.members_in_call / stats.total_members) * 100).toFixed(2),
        );
      }

      // Top 5 busiest queues
      stats.top_busy_queues = enrichedQueues
        .filter((q: any) => q.calls_waiting > 0)
        .sort((a: any, b: any) => b.calls_waiting - a.calls_waiting)
        .slice(0, 5)
        .map((q: any) => ({
          name: q.name,
          calls_waiting: q.calls_waiting,
          longest_wait_time: q.longest_wait_time,
          members_available: q.members_available,
        }));

      return stats;
    } catch (error) {
      this.logger.error('❌ Error in getGlobalStats:', error);
      throw error;
    }
  }

  /**
   * GET /api/v1/queues/:name/details
   * Get complete details of a specific queue with all DB + AMI data
   */
  async getQueueDetails(tenantId: number | null, displayName: string): Promise<any> {
    try {
      // 1. Get DB data
      const queueFromDB = await this.findOne(tenantId, displayName);
      if (!queueFromDB) {
        throw new NotFoundException(`Queue "${displayName}" not found`);
      }

      // 2. Get full AMI status
      let queueStatus: any = {};
      try {
        queueStatus = await this.amiService.getQueueStatus(queueFromDB.name);
      } catch (err) {
        this.logger.warn(`Failed to get AMI status for ${queueFromDB.name}`);
      }

      // 3. Get enriched members (we'll implement this in queue-members service)
      // For now, use members from queueStatus
      const members = queueStatus.members || [];

      // 4. Build complete response
      const details = {
        // Complete queue configuration (DB)
        configuration: {
          name: queueFromDB.name,
          tenant_id: queueFromDB.tenantId,

          // Base parameters
          strategy: queueFromDB.strategy,
          musiconhold: queueFromDB.musiconhold,
          timeout: queueFromDB.timeout,
          retry: queueFromDB.retry,
          wrapuptime: queueFromDB.wrapuptime,
          maxlen: queueFromDB.maxlen,
          servicelevel: queueFromDB.servicelevel,
        },

        // Real-time statistics (AMI)
        statistics: {
          calls_waiting: queueStatus.calls || 0,
          calls_completed: queueStatus.completed || 0,
          calls_abandoned: queueStatus.abandoned || 0,
          calls_total: (queueStatus.completed || 0) + (queueStatus.abandoned || 0),

          avg_holdtime: queueStatus.holdtime || 0,
          avg_talktime: queueStatus.talktime || 0,
          service_level: queueStatus.service_level || 0,
          service_level_perf: queueStatus.service_level_perf || 0,

          abandonment_rate:
            (queueStatus.completed || 0) + (queueStatus.abandoned || 0) > 0
              ? parseFloat(
                  (
                    ((queueStatus.abandoned || 0) /
                      ((queueStatus.completed || 0) +
                        (queueStatus.abandoned || 0))) *
                    100
                  ).toFixed(2),
                )
              : 0,
        },

        // Queue members
        members: {
          total: members.length,
          available: members.filter(
            (m: any) =>
              m.status === 'available' && !m.paused && !m.in_call,
          ).length,
          in_call: members.filter((m: any) => m.in_call).length,
          paused: members.filter((m: any) => m.paused).length,
          unavailable: members.filter((m: any) => m.status === 'unavailable')
            .length,
          list: members.map((m: any) => ({
            interface: m.interface,
            member_name: m.name,
            status: m.status,
            paused: m.paused,
            paused_reason: m.paused_reason || null,
            penalty: m.penalty,
            calls_taken: m.calls_taken || 0,
            last_call: m.last_call || 0,
            in_call: m.in_call || false,
            state_interface: m.state_interface,
          })),
        },

        // Global queue state
        state: {
          is_active: (queueStatus.calls || 0) > 0,
          has_available_agents:
            members.filter((m: any) => m.status === 'available' && !m.paused)
              .length > 0,
          can_accept_calls:
            members.filter((m: any) => m.status === 'available' && !m.paused)
              .length > 0 &&
            (queueFromDB.maxlen === 0 ||
              (queueStatus.calls || 0) < queueFromDB.maxlen),
          visual_state: this.calculateVisualState(
            queueStatus.calls || 0,
            queueStatus.holdtime || 0,
          ),
        },

        // Metadata
        meta: {
          ami_connected: !!queueStatus.name,
          retrieved_at: new Date().toISOString(),
        },
      };

      return details;
    } catch (error) {
      this.logger.error(`❌ Error in getQueueDetails for "${displayName}":`, error);
      throw error;
    }
  }

  /**
   * POST /api/v1/queues/:name/reload
   * Reload a specific queue configuration
   */
  async reloadQueue(tenantId: number | null, displayName: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (!this.amiService.isAmiConnected()) {
        throw new BadRequestException('AMI not connected');
      }

      // Check that queue exists
      const queue = await this.findOne(tenantId, displayName);
      if (!queue) {
        throw new NotFoundException(`Queue "${displayName}" not found`);
      }

      try {
        // Reload all queues (Asterisk doesn't support reloading a specific queue)
        // Available commands: queue reload all, queue reload members, queue reload parameters
        const response = await this.amiService.executeAction(
          {
            Action: 'Command',
            Command: `queue reload all`,
          },
          AMI_TIMEOUTS.DEFAULT,
        );

        this.logger.log(`✅ Queue "${displayName}" reloaded (via queue reload all)`);
        resolve({
          success: true,
          queue_name: queue.name,
          display_name: displayName,
          message: 'Queue reloaded successfully (all queues were reloaded)',
          response,
          reloaded_at: new Date().toISOString(),
        });
      } catch (err) {
        this.logger.error(`❌ Error reloading queue "${displayName}":`, err);
        reject(err);
      }
    });
  }

  /**
   * GET /api/v1/queues/:name/calls
   * Get waiting calls in a queue
   */
  async getQueueCalls(tenantId: number | null, displayName: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (!this.amiService.isAmiConnected()) {
        throw new BadRequestException('AMI not connected');
      }

      // Check that queue exists
      const queue = await this.findOne(tenantId, displayName);
      if (!queue) {
        throw new NotFoundException(`Queue "${displayName}" not found`);
      }

      const calls: any[] = [];
      const actionId = `queue_calls_${Date.now()}`;
      let queueFound = false;
      let timeoutHandle: NodeJS.Timeout;

      const eventHandler = (event: any) => {
        if (event.actionid !== actionId) return;

        // Mark queue as found when we receive QueueParams event
        if (event.event === 'QueueParams' && event.queue === queue.name) {
          queueFound = true;
        }

        if (event.event === 'QueueEntry') {
          if (event.queue === queue.name) {
            calls.push({
              position: parseInt(event.position || 0),
              channel: event.channel,
              caller_id_num: event.calleridnum,
              caller_id_name: event.calleridname,
              wait_time: parseInt(event.wait || 0),
              priority: parseInt(event.priority || 0),
            });
          }
        } else if (event.event === 'QueueStatusComplete') {
          this.amiService.off('managerevent', eventHandler);
          clearTimeout(timeoutHandle);

          // Return empty list instead of error if queue not found
          resolve({
            queue_name: queue.name,
            display_name: displayName,
            calls_count: calls.length,
            calls: calls.sort((a, b) => a.position - b.position),
            retrieved_at: new Date().toISOString(),
            warning: !queueFound ? 'Queue not found in Asterisk or no active calls' : undefined,
          });
        }
      };

      this.amiService.on('managerevent', eventHandler);

      // Timeout - safety fallback (declare before try/catch)
      timeoutHandle = setTimeout(() => {
        this.amiService.off('managerevent', eventHandler);
        // Return empty list instead of error if queue not found
        resolve({
          queue_name: queue.name,
          display_name: displayName,
          calls_count: calls.length,
          calls: calls.sort((a, b) => a.position - b.position),
          retrieved_at: new Date().toISOString(),
          warning: !queueFound ? 'Queue not found in Asterisk or no active calls' : undefined,
        });
      }, 3000);

      try {
        // Note: We send QueueStatus for the specific queue
        // If the queue doesn't exist in Asterisk, we won't receive any QueueParams event
        await this.amiService.executeAction(
          {
            Action: 'QueueStatus',
            Queue: queue.name,
            ActionID: actionId,
          },
          AMI_TIMEOUTS.QUEUE_STATUS,
        );
      } catch (err) {
        this.amiService.off('managerevent', eventHandler);
        clearTimeout(timeoutHandle);
        reject(err);
        return;
      }
    });
  }

  // ========================================
  // QUEUE MEMBERS MANAGEMENT
  // ========================================

  /**
   * Add member to queue
   */
  async addMember(
    tenantId: number | null,
    displayName: string,
    interfaceName: string,
    memberName?: string,
    penalty: number = 0,
    paused: number = 0
  ): Promise<any> {
    if (!this.amiService.isAmiConnected()) {
      throw new BadRequestException('AMI not connected');
    }

    const queue = await this.findOne(tenantId, displayName);

    // Format interface if needed (ensure PJSIP/ prefix)
    const formattedInterface = interfaceName.startsWith('PJSIP/')
      ? interfaceName
      : `PJSIP/${interfaceName}`;

    try {
      await this.amiService.queueAdd(
        queue.name,
        formattedInterface,
        memberName,
        penalty,
        paused
      );

      this.logger.log(`✅ Added member ${formattedInterface} to queue ${queue.name}`);

      return {
        queue: queue.name,
        interface: formattedInterface,
        member_name: memberName || interfaceName,
        penalty,
        paused: paused === 1,
        added: true
      };
    } catch (error) {
      this.logger.error(`❌ Failed to add member to queue: ${error.message}`);
      throw new BadRequestException(`Failed to add member: ${error.message}`);
    }
  }

  /**
   * Remove member from queue
   */
  async removeMember(
    tenantId: number | null,
    displayName: string,
    memberId: string
  ): Promise<any> {
    if (!this.amiService.isAmiConnected()) {
      throw new BadRequestException('AMI not connected');
    }

    const queue = await this.findOne(tenantId, displayName);

    // Format interface if needed
    const formattedInterface = memberId.startsWith('PJSIP/')
      ? memberId
      : `PJSIP/${memberId}`;

    try {
      await this.amiService.queueRemove(queue.name, formattedInterface);

      this.logger.log(`✅ Removed member ${formattedInterface} from queue ${queue.name}`);

      return {
        queue: queue.name,
        interface: formattedInterface,
        removed: true
      };
    } catch (error) {
      this.logger.error(`❌ Failed to remove member from queue: ${error.message}`);
      throw new BadRequestException(`Failed to remove member: ${error.message}`);
    }
  }

  /**
   * Pause/Unpause member in queue
   */
  async pauseMember(
    tenantId: number | null,
    displayName: string,
    memberId: string,
    paused: boolean,
    reason?: string
  ): Promise<any> {
    if (!this.amiService.isAmiConnected()) {
      throw new BadRequestException('AMI not connected');
    }

    const queue = await this.findOne(tenantId, displayName);

    // Format interface if needed
    const formattedInterface = memberId.startsWith('PJSIP/')
      ? memberId
      : `PJSIP/${memberId}`;

    try {
      await this.amiService.queuePause(
        queue.name,
        formattedInterface,
        paused,
        reason
      );

      this.logger.log(
        `✅ ${paused ? 'Paused' : 'Unpaused'} member ${formattedInterface} in queue ${queue.name}${reason ? ` (${reason})` : ''}`
      );

      return {
        queue: queue.name,
        interface: formattedInterface,
        paused,
        reason: reason || null
      };
    } catch (error) {
      this.logger.error(`❌ Failed to pause/unpause member: ${error.message}`);
      throw new BadRequestException(`Failed to pause/unpause member: ${error.message}`);
    }
  }

  /**
   * Validate that a context belongs to the tenant
   *
   * Security check to ensure cross-tenant access is prevented.
   * Each tenant has a primary context, and queues must be created in that context.
   *
   * @param tenantId - Tenant ID
   * @param context - Context name
   * @throws NotFoundException if tenant not found
   * @throws ForbiddenException if context doesn't belong to tenant
   * @private
   */
  private async validateContextOwnership(
    tenantId: number,
    context: string,
  ): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    // Check if context belongs to tenant
    const tenantContext = await this.tenantContextRepository.findOne({
      where: { tenantId, name: context },
    });
    if (!tenantContext) {
      throw new ForbiddenException(
        `Context '${context}' does not belong to your tenant`,
      );
    }
  }
}
