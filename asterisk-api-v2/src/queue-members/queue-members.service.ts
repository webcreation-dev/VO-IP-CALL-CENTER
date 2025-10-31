import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QueueMember } from './entities/queue-member.entity';
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
    private readonly amiService: AmiService,
    private readonly endpointsService: EndpointsService,
  ) {}

  async addMember(
    tenantId: number,
    queueName: string,
    dto: AddMemberDto,
  ): Promise<QueueMember> {
    // Validate endpoint exists
    await this.endpointsService.findOne(tenantId, dto.endpointName);

    const prefixedQueue = TenantPrefixUtil.addPrefix(tenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(
      tenantId,
      dto.endpointName,
    );
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    // Check if already member
    const existing = await this.memberRepository.findOne({
      where: { tenantId, queueName: prefixedQueue, interface: interfaceName },
    });

    if (existing) {
      throw new ConflictException('Member already exists in queue');
    }

    // Add via AMI first
    await this.amiService.queueAdd(
      prefixedQueue,
      interfaceName,
      dto.memberName || dto.endpointName,
      dto.penalty || 0,
      dto.paused ? 1 : 0,
    );

    // Save to DB
    const member = this.memberRepository.create({
      tenantId,
      queueName: prefixedQueue,
      interface: interfaceName,
      membername: dto.memberName || dto.endpointName,
      penalty: dto.penalty || 0,
      paused: dto.paused ? 1 : 0,
      wrapuptime: dto.wrapuptime || 0,
    });

    const saved = await this.memberRepository.save(member);
    this.logger.log(
      `Added member ${dto.endpointName} to queue ${queueName}`,
    );
    return saved;
  }

  async findAll(tenantId: number | null, queueName: string): Promise<QueueMember[]> {
    // TEST MODE: use default tenantId if null
    const effectiveTenantId = tenantId ?? 1;
    const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);

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
    const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    await this.amiService.queuePause(prefixedQueue, interfaceName, true, reason);

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
    const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    await this.amiService.queuePause(prefixedQueue, interfaceName, false);

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
    const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    await this.amiService.queuePenalty(prefixedQueue, interfaceName, penalty);

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
    const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);
    const prefixedEndpoint = TenantPrefixUtil.addPrefix(effectiveTenantId, memberName);
    const interfaceName = `PJSIP/${prefixedEndpoint}`;

    // Remove from AMI
    await this.amiService.queueRemove(prefixedQueue, interfaceName);

    // Remove from DB
    const member = await this.memberRepository.findOne({
      where: { tenantId: effectiveTenantId, queueName: prefixedQueue, interface: interfaceName },
    });

    if (member) {
      await this.memberRepository.remove(member);
    }

    this.logger.log(`Removed member ${memberName} from queue ${queueName}`);
  }

  /**
   * GET /api/v1/queues/:queueName/members/enriched
   * Get all members with enriched endpoint data
   */
  async findAllEnriched(tenantId: number | null, queueName: string): Promise<any[]> {
    try {
      // TEST MODE: use default tenantId if null
      const effectiveTenantId = tenantId ?? 1;
      const prefixedQueue = TenantPrefixUtil.addPrefix(effectiveTenantId, queueName);

      // 1. Get base members data from DB
      const members = await this.memberRepository.find({
        where: { tenantId: effectiveTenantId, queueName: prefixedQueue },
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
              // Remove tenant prefix from endpoint ID
              const { name: unprefixedEndpointId } = TenantPrefixUtil.removePrefix(
                endpointId,
              );
              endpointData = await this.endpointsService.findOne(
                tenantId,
                unprefixedEndpointId,
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
