import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QueueMember } from './entities/queue-member.entity';
import { Queue } from '../queues/entities/queue.entity';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { TenantPrefixUtil } from '../common/utils/tenant-prefix.util';

@Injectable()
export class QueueMembersService {
  private readonly logger = new Logger(QueueMembersService.name);

  constructor(
    @InjectRepository(QueueMember)
    private readonly memberRepository: Repository<QueueMember>,
    @InjectRepository(Queue)
    private readonly queueRepository: Repository<Queue>,
    private readonly amiService: AmiService,
    private readonly endpointsService: EndpointsService,
  ) {}

  async addMember(
    tenantId: number | null,
    queueName: string,
    dto: AddMemberDto,
  ): Promise<QueueMember> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;

    this.logger.debug(`[addMember] Starting - tenantId: ${tenantId}, effectiveTenantId: ${effectiveTenantId}, queueName: ${queueName}, endpointName: ${dto.endpointName}`);

    // Extract display name and tenantId if prefixed (e.g., "t549_1000" -> "1000", tenantId: 549)
    let endpointDisplayName: string;
    let endpointTenantId: number;

    if (TenantPrefixUtil.hasPrefix(dto.endpointName)) {
      const parsed = TenantPrefixUtil.removePrefix(dto.endpointName);
      endpointDisplayName = parsed.name;
      endpointTenantId = parsed.tenantId;
      this.logger.debug(`[addMember] Endpoint is prefixed - extracted: name="${endpointDisplayName}", tenantId=${endpointTenantId}`);
    } else {
      endpointDisplayName = dto.endpointName;
      endpointTenantId = effectiveTenantId;
      this.logger.debug(`[addMember] Endpoint not prefixed - using: name="${endpointDisplayName}", tenantId=${endpointTenantId}`);
    }

    // Validate endpoint exists (use the tenant ID from the endpoint name if prefixed)
    try {
      this.logger.debug(`[addMember] Validating endpoint: findOne(${endpointTenantId}, "${endpointDisplayName}")`);
      await this.endpointsService.findOne(endpointTenantId, endpointDisplayName);
      this.logger.debug(`[addMember] Endpoint validation SUCCESS`);
    } catch (error) {
      this.logger.error(`[addMember] Endpoint validation FAILED: ${error.message}`);
      throw error;
    }

    // Use endpointTenantId for consistency (the tenant from the endpoint name)
    const memberTenantId = endpointTenantId;

    // Only add prefix if not already prefixed
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(memberTenantId, queueName);

    // Validate queue exists
    const queue = await this.queueRepository.findOne({
      where: { name: prefixedQueue, tenantId: memberTenantId },
    });

    if (!queue) {
      throw new NotFoundException(
        `Queue ${queueName} not found for tenant ${memberTenantId}`,
      );
    }
    const prefixedEndpoint = TenantPrefixUtil.hasPrefix(dto.endpointName)
      ? dto.endpointName
      : TenantPrefixUtil.addPrefix(memberTenantId, endpointDisplayName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    this.logger.debug(`[addMember] Built interface: ${interfaceName}, prefixedQueue: ${prefixedQueue}, memberTenantId: ${memberTenantId}`);

    // Check if already member
    const existing = await this.memberRepository.findOne({
      where: { tenantId: memberTenantId, queueName: prefixedQueue, interface: interfaceName },
    });

    if (existing) {
      this.logger.warn(`[addMember] Member already exists: ${interfaceName} in ${prefixedQueue}`);
      throw new ConflictException('Member already exists in queue');
    }

    // Add via AMI first
    try {
      this.logger.debug(`[addMember] Calling AMI queueAdd(${prefixedQueue}, ${interfaceName})`);
      await this.amiService.queueAdd(
        prefixedQueue,
        interfaceName,
        dto.memberName || dto.endpointName,
        dto.penalty || 0,
        dto.paused ? 1 : 0,
      );
      this.logger.debug(`[addMember] AMI queueAdd SUCCESS`);
    } catch (error) {
      this.logger.error(`[addMember] AMI queueAdd FAILED: ${error.message}`);

      // If queue doesn't exist in Asterisk, try to force load it from Realtime DB
      if (error.message && error.message.includes('No such queue')) {
        this.logger.warn(`[addMember] Queue ${prefixedQueue} not found in Asterisk, attempting to force load from Realtime...`);
        try {
          // Force load queue from Realtime by querying its status
          this.logger.debug(`[addMember] Calling getQueueStatus to force Realtime load...`);
          await this.amiService.getQueueStatus(prefixedQueue);
          this.logger.log(`✅ [addMember] Queue ${prefixedQueue} loaded from Realtime`);

          // Small delay to let Asterisk fully initialize the queue
          await new Promise(resolve => setTimeout(resolve, 500));

          // Retry adding the actual member
          await this.amiService.queueAdd(
            prefixedQueue,
            interfaceName,
            dto.memberName || dto.endpointName,
            dto.penalty || 0,
            dto.paused ? 1 : 0,
          );
          this.logger.debug(`[addMember] AMI queueAdd SUCCESS (after Realtime load)`);
        } catch (retryError) {
          this.logger.error(`[addMember] Failed to load queue from Realtime: ${retryError.message}`);
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }

    // Generate unique ID for queue member
    const uniqueid = Math.abs(
      interfaceName.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) & 0x7FFFFFFF;
      }, Date.now())
    );

    // Save to DB
    const member = this.memberRepository.create({
      tenantId: memberTenantId,
      queueName: prefixedQueue,
      interface: interfaceName,
      membername: dto.memberName || dto.endpointName,
      penalty: dto.penalty || 0,
      paused: dto.paused ? 1 : 0,
      wrapuptime: dto.wrapuptime || 0,
      uniqueid,
    });

    this.logger.debug(`[addMember] Created member entity, about to save to DB`);

    try {
      const saved = await this.memberRepository.save(member);
      this.logger.log(
        `✅ [addMember] SUCCESS - Added member ${dto.endpointName} to queue ${queueName}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(`[addMember] Database save FAILED: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(tenantId: number | null, queueName: string): Promise<QueueMember[]> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    // Only add prefix if not already prefixed
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);

    return await this.memberRepository.find({
      where: { tenantId: effectiveTenantId, queueName: prefixedQueue },
      order: { membername: 'ASC' },
    });
  }

  async pause(
    tenantId: number | null,
    queueName: string,
    memberName: string,
    reason?: string,
  ): Promise<void> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.hasPrefix(memberName)
      ? memberName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    try {
      await this.amiService.queuePause(prefixedQueue, interfaceName, true, reason);
    } catch (error) {
      this.logger.warn(
        `AMI queuePause failed for ${interfaceName}: ${error.message}. Continuing with DB update.`,
      );
    }

    await this.memberRepository.update(
      { tenantId: effectiveTenantId, queueName: prefixedQueue, interface: interfaceName },
      { paused: 1 },
    );

    this.logger.log(`Paused member ${memberName} in queue ${queueName}`);
  }

  async unpause(
    tenantId: number | null,
    queueName: string,
    memberName: string,
  ): Promise<void> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.hasPrefix(memberName)
      ? memberName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    try {
      await this.amiService.queuePause(prefixedQueue, interfaceName, false);
    } catch (error) {
      this.logger.warn(
        `AMI queuePause (unpause) failed for ${interfaceName}: ${error.message}. Continuing with DB update.`,
      );
    }

    await this.memberRepository.update(
      { tenantId: effectiveTenantId, queueName: prefixedQueue, interface: interfaceName },
      { paused: 0 },
    );

    this.logger.log(`Unpaused member ${memberName} in queue ${queueName}`);
  }

  async updatePenalty(
    tenantId: number | null,
    queueName: string,
    memberName: string,
    penalty: number,
  ): Promise<void> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.hasPrefix(memberName)
      ? memberName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    try {
      await this.amiService.queuePenalty(prefixedQueue, interfaceName, penalty);
    } catch (error) {
      this.logger.warn(
        `AMI queuePenalty failed for ${interfaceName}: ${error.message}. Continuing with DB update.`,
      );
    }

    await this.memberRepository.update(
      { tenantId: effectiveTenantId, queueName: prefixedQueue, interface: interfaceName },
      { penalty },
    );

    this.logger.log(
      `Updated penalty for member ${memberName} in queue ${queueName}`,
    );
  }

  async removeMember(
    tenantId: number | null,
    queueName: string,
    memberName: string,
  ): Promise<void> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
      ? queueName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.hasPrefix(memberName)
      ? memberName
      : TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    // Remove from AMI (handle errors gracefully)
    try {
      await this.amiService.queueRemove(prefixedQueue, interfaceName);
    } catch (error) {
      this.logger.warn(
        `AMI queueRemove failed for ${interfaceName} in ${prefixedQueue}: ${error.message}. Continuing with DB cleanup.`,
      );
    }

    // Remove from DB
    const member = await this.memberRepository.findOne({
      where: { tenantId: effectiveTenantId, queueName: prefixedQueue, interface: interfaceName },
    });

    if (member) {
      await this.memberRepository.remove(member);
      this.logger.log(`Removed member ${memberName} from queue ${queueName}`);
    } else {
      this.logger.warn(
        `Member ${memberName} not found in database for queue ${queueName}`,
      );
    }
  }

  /**
   * GET /api/v1/queues/:queueName/members/enriched
   * Get all members with enriched endpoint data
   */
  async findAllEnriched(tenantId: number, queueName: string): Promise<any[]> {
    try {
      const prefixedQueue = TenantPrefixUtil.hasPrefix(queueName)
        ? queueName
        : TenantPrefixUtil.addPrefix(tenantId, queueName);

      // 1. Get base members data from DB
      const members = await this.memberRepository.find({
        where: { tenantId, queueName: prefixedQueue },
        order: { penalty: 'ASC', membername: 'ASC' },
      });

      // 2. Get real-time status from AMI
      let amiMembers: any = {};
      try {
        const queueStatus = await this.amiService.getQueueStatus(prefixedQueue);
        if (queueStatus && queueStatus.members) {
          queueStatus.members.forEach((m: any) => {
            amiMembers[m.interface] = m;
          });
        }
      } catch (err) {
        this.logger.warn(
          `Could not get AMI data for queue ${queueName}: ${err.message}`,
        );
      }

      // 3. Enrich each member with endpoint data
      const enrichedMembers = await Promise.all(
        members.map(async (member) => {
          // Extract endpoint ID from interface (ex: PJSIP/101 -> 101)
          const endpointIdMatch = member.interface.match(/PJSIP\/(\w+)/);
          const endpointId = endpointIdMatch ? endpointIdMatch[1] : null;

          // Get AMI status for this member
          const amiMember = amiMembers[member.interface] || {};
          const status = amiMember.status || 'unknown';
          const in_call = amiMember.in_call || false;
          const calls_taken = amiMember.calls_taken || 0;
          const last_call = amiMember.last_call || 0;
          const paused = amiMember.paused || member.paused === 1;
          const paused_reason = amiMember.paused_reason || null;

          // Get endpoint data
          let endpointData: any = null;
          if (endpointId) {
            try {
              let lookupId = endpointId;
              
              // Only remove prefix if it exists
              if (TenantPrefixUtil.hasPrefix(endpointId)) {
                const { name: unprefixedEndpointId } = TenantPrefixUtil.removePrefix(
                  endpointId,
                );
                lookupId = unprefixedEndpointId;
              }
              
              endpointData = await this.endpointsService.findOne(
                tenantId,
                lookupId,
              );
            } catch (err) {
              this.logger.warn(
                `⚠️ Endpoint ${endpointId} not found for member ${member.interface}`,
              );
            }
          }

          // Calculate additional metrics
          const time_since_last_call =
            last_call > 0 ? Math.floor(Date.now() / 1000 - last_call) : null;

          // Determine detailed status
          let detailed_status: 'offline' | 'paused' | 'in_call' | 'available' | 'unknown' = 'unknown';
          if (status === 'unavailable' || status === '4' || status === '5') {
            detailed_status = 'offline';
          } else if (paused) {
            detailed_status = 'paused';
          } else if (in_call) {
            detailed_status = 'in_call';
          } else if (status === 'available' || status === '1' || status === '0') {
            detailed_status = 'available';
          }

          return {
            // Base member data
            interface: member.interface,
            member_name: member.membername,
            queue_name: queueName,

            // Detailed status
            status,
            detailed_status,
            paused,
            paused_reason,
            in_call,

            // Priority and config
            penalty: member.penalty,

            // Call statistics
            calls_taken,
            last_call,
            time_since_last_call,

            // Endpoint information (if available)
            endpoint: endpointData
              ? {
                  id: endpointData.id,
                  tenant_id: endpointData.tenantId,
                  transport: endpointData.transport,
                  context: endpointData.context,
                  registered: endpointData.deviceState === 'NOT_INUSE',
                  device_state: endpointData.deviceState,
                  // IP address would need to come from AMI contact status
                }
              : null,

            // Metadata
            ami_data_available: !!amiMember.interface,
            enriched_at: new Date().toISOString(),
          };
        }),
      );

      return enrichedMembers;
    } catch (error) {
      this.logger.error(
        `❌ Error in findAllEnriched for queue "${queueName}":`,
        error,
      );
      throw error;
    }
  }
}
