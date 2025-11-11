import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { AriService } from '../../core/asterisk/ari/ari.service';
import { CallPermissionValidatorService } from '../services/call-permission-validator.service';

/**
 * Call Validator ARI Gateway
 *
 * Listens to Asterisk ARI events and validates call permissions in real-time.
 */
@Injectable()
export class CallValidatorAriGateway implements OnModuleInit {
  private readonly logger = new Logger(CallValidatorAriGateway.name);

  constructor(
    private readonly ariService: AriService,
    private readonly validatorService: CallPermissionValidatorService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Call Validator ARI Gateway');
    this.registerEventListeners();
  }

  private registerEventListeners() {
    // Listen for StasisStart events on "call-validator" application
    this.ariService.on('StasisStart', async (event, channel) => {
      if (event.application !== 'call-validator') {
        return;
      }

      this.logger.debug(
        `StasisStart: channel ${channel.id}, args: ${JSON.stringify(event.args)}`,
      );

      const action = event.args[0];

      if (action === 'validate') {
        await this.handleCallValidation(event, channel);
      }
    });

    this.logger.log('ARI event listeners registered for call-validator app');
  }

  /**
   * Handle call validation from Asterisk
   */
  private async handleCallValidation(event: any, channel: any) {
    try {
      // Extract information from channel variables
      const calledEndpoint = await this.getChannelVar(
        channel.id,
        'CALLED_ENDPOINT',
      );
      const callerEndpoint = this.extractEndpointFromCallerNumber(
        channel.caller.number,
      );

      // Formatted logging box for debugging
      this.logger.log('╔════════════════════════════════════════════════════════════════╗');
      this.logger.log('║              ARI CALL VALIDATION REQUEST                      ║');
      this.logger.log('╠════════════════════════════════════════════════════════════════╣');
      this.logger.log(`║ Channel ID:        ${channel.id.padEnd(42)} ║`);
      this.logger.log(`║ Unique ID:         ${(channel.uniqueid || channel.id).padEnd(42)} ║`);
      this.logger.log(`║ Caller Number:     ${(channel.caller.number || 'N/A').padEnd(42)} ║`);
      this.logger.log(`║ Caller Name:       ${(channel.caller.name || 'N/A').padEnd(42)} ║`);
      this.logger.log(`║ Context:           ${(channel.dialplan.context || 'N/A').padEnd(42)} ║`);
      this.logger.log(`║ Extension:         ${(channel.dialplan.exten || 'N/A').padEnd(42)} ║`);
      this.logger.log(`║ Priority:          ${(String(channel.dialplan.priority) || 'N/A').padEnd(42)} ║`);
      this.logger.log('╠════════════════════════════════════════════════════════════════╣');
      this.logger.log(`║ Caller Endpoint:   ${(callerEndpoint || 'MISSING').padEnd(42)} ║`);
      this.logger.log(`║ Called Endpoint:   ${(calledEndpoint || 'MISSING').padEnd(42)} ║`);
      this.logger.log('╚════════════════════════════════════════════════════════════════╝');

      if (!callerEndpoint || !calledEndpoint) {
        this.logger.warn(
          `❌ Missing endpoint information: caller=${callerEndpoint}, called=${calledEndpoint}`,
        );
        await this.denyCall(channel, 'missing_endpoint_info');
        return;
      }

      // Validate the call
      const result = await this.validatorService.validateCall(
        callerEndpoint,
        calledEndpoint,
      );

      // Extract tenant ID from endpoint
      const tenantId = this.extractTenantId(callerEndpoint);

      // Log the attempt
      await this.validatorService.logCallAttempt(
        tenantId,
        callerEndpoint,
        calledEndpoint,
        result.allowed ? 'allowed' : 'denied',
        result.reason,
        {
          channelId: channel.id,
          uniqueid: channel.uniqueid || channel.id,
          callerNumber: channel.caller.number,
          calledNumber: calledEndpoint,
        },
      );

      // Allow or deny based on result
      if (result.allowed) {
        this.logger.log('╔════════════════════════════════════════════════════════════════╗');
        this.logger.log('║                    ✅ CALL ALLOWED                             ║');
        this.logger.log('╚════════════════════════════════════════════════════════════════╝');
        await this.allowCall(channel);
      } else {
        this.logger.log('╔════════════════════════════════════════════════════════════════╗');
        this.logger.log('║                    ❌ CALL DENIED                              ║');
        this.logger.log('╠════════════════════════════════════════════════════════════════╣');
        this.logger.log(`║ Reason: ${(result.reason || 'permission_denied').padEnd(52)} ║`);
        this.logger.log('╚════════════════════════════════════════════════════════════════╝');
        await this.denyCall(channel, result.reason || 'permission_denied');
      }
    } catch (error) {
      this.logger.error('╔════════════════════════════════════════════════════════════════╗');
      this.logger.error('║              ⚠️ ERROR IN CALL VALIDATION                       ║');
      this.logger.error('╠════════════════════════════════════════════════════════════════╣');
      this.logger.error(`║ Error: ${error.message.substring(0, 56).padEnd(56)} ║`);
      this.logger.error('╚════════════════════════════════════════════════════════════════╝');
      await this.denyCall(channel, 'system_error');
    }
  }

  /**
   * Allow the call - continue in dialplan
   */
  private async allowCall(channel: any) {
    try {
      await this.ariService.continueInDialplan(
        channel.id,
        channel.dialplan.context,
        channel.dialplan.exten,
        channel.dialplan.priority + 1,
      );
    } catch (error) {
      this.logger.error(`Error allowing call: ${error.message}`);
      await this.hangupChannel(channel.id);
    }
  }

  /**
   * Deny the call - play error message and hangup
   */
  private async denyCall(channel: any, reason: string) {
    try {
      const soundFile = this.getSoundFileForReason(reason);

      // Play error message
      await this.ariService.playback(channel.id, `sound:${soundFile}`);

      // Wait for playback to finish
      await this.sleep(3000);

      // Hangup
      await this.hangupChannel(channel.id);
    } catch (error) {
      this.logger.error(`Error denying call: ${error.message}`);
      await this.hangupChannel(channel.id);
    }
  }

  /**
   * Get Asterisk sound file based on deny reason
   */
  private getSoundFileForReason(reason: string): string {
    const soundMap: Record<string, string> = {
      endpoint_not_found: 'ss-noservice',
      inter_context_denied: 'access-denied-ww-646',
      role_permission_denied: 'access-denied-ww-646',
      missing_endpoint_info: 'an-error-has-occured',
      system_error: 'an-error-has-occured',
    };

    return soundMap[reason] || 'access-denied-ww-646';
  }

  /**
   * Get channel variable value
   */
  private async getChannelVar(channelId: string, varName: string): Promise<string | null> {
    try {
      const result = await this.ariService.getChannelVar(channelId, varName);
      return result?.value || null;
    } catch (error) {
      this.logger.error(`Error getting channel var ${varName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract endpoint ID from caller number
   * Handles formats: "1002", "t1_1002", "PJSIP/t1_1002"
   */
  private extractEndpointFromCallerNumber(callerNumber: string): string | null {
    if (!callerNumber) {
      return null;
    }

    // Remove PJSIP/ prefix if present
    const cleaned = callerNumber.replace(/^PJSIP\//, '');

    // If already prefixed (t1_1002), return as-is
    if (cleaned.match(/^t\d+_/)) {
      return cleaned;
    }

    // Otherwise, return as-is and let validation handle it
    return cleaned;
  }

  /**
   * Extract tenant ID from endpoint ID (e.g., "t1_1002" → 1)
   */
  private extractTenantId(endpointId: string): number {
    const match = endpointId.match(/^t(\d+)_/);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * Hangup a channel
   */
  private async hangupChannel(channelId: string) {
    try {
      await this.ariService.hangup(channelId);
    } catch (error) {
      this.logger.error(`Error hanging up channel ${channelId}: ${error.message}`);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
