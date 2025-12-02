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
  private static readonly ARI_TIMEOUT = 5000; // 5 seconds timeout for ARI operations
  private static readonly PLAYBACK_TIMEOUT = 10000; // 10 seconds max for playback

  constructor(
    private readonly ariService: AriService,
    private readonly validatorService: CallPermissionValidatorService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Call Validator ARI Gateway');
    // Note: Stasis app 'call-validator' is started centrally by AriService
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
    const channelId = channel.id;
    let callerEndpoint: string | null = null;
    let calledEndpoint: string | null = null;
    let tenantId: number | null = null;

    try {
      // Answer the channel IMMEDIATELY to keep it alive during validation
      try {
        await this.withTimeout(
          this.ariService.answerChannel(channelId),
          CallValidatorAriGateway.ARI_TIMEOUT,
          'answerChannel',
        );
        this.logger.debug(`Channel ${channelId} answered for validation`);
      } catch (answerError) {
        this.logger.warn(`Failed to answer channel ${channelId}: ${answerError.message}`);
        // If we can't answer, the channel might already be gone - let it fail in next steps
      }

      // Extract information from channel variables
      calledEndpoint = await this.getChannelVar(channelId, 'CALLED_ENDPOINT');
      callerEndpoint = this.extractEndpointFromCallerNumber(
        channel.caller.number,
        channel.dialplan.context,
      );

      // Formatted logging box for debugging
      this.logger.debug('╔════════════════════════════════════════════════════════════════╗');
      this.logger.debug('║              ARI CALL VALIDATION REQUEST                      ║');
      this.logger.debug('╠════════════════════════════════════════════════════════════════╣');
      this.logger.debug(`║ Channel ID:        ${channelId.padEnd(42)} ║`);
      this.logger.debug(`║ Caller Number:     ${(channel.caller.number || 'N/A').padEnd(42)} ║`);
      this.logger.debug(`║ Context:           ${(channel.dialplan.context || 'N/A').padEnd(42)} ║`);
      this.logger.debug(`║ Extension:         ${(channel.dialplan.exten || 'N/A').padEnd(42)} ║`);
      this.logger.debug('╠════════════════════════════════════════════════════════════════╣');
      this.logger.debug(`║ Caller Endpoint:   ${(callerEndpoint || 'MISSING').padEnd(42)} ║`);
      this.logger.debug(`║ Called Endpoint:   ${(calledEndpoint || 'MISSING').padEnd(42)} ║`);
      this.logger.debug('╚════════════════════════════════════════════════════════════════╝');

      // Validate endpoint extraction
      if (!callerEndpoint || !calledEndpoint) {
        this.logger.warn(
          `Missing endpoint information: caller=${callerEndpoint}, called=${calledEndpoint}`,
        );
        await this.denyCall(channel, 'missing_endpoint_info');
        return;
      }

      // Validate endpoint format for calledEndpoint
      if (!this.isValidEndpointFormat(calledEndpoint)) {
        this.logger.warn(`Invalid called endpoint format: ${calledEndpoint}`);
        await this.denyCall(channel, 'invalid_endpoint_format');
        return;
      }

      // Extract tenant ID from endpoint
      tenantId = this.extractTenantId(callerEndpoint);

      // Validate the call
      const result = await this.validatorService.validateCall(
        callerEndpoint,
        calledEndpoint,
      );

      // Metadata for logging
      const metadata = {
        channelId,
        uniqueid: channel.uniqueid || channelId,
        callerNumber: channel.caller.number,
        calledNumber: calledEndpoint,
      };

      if (result.allowed) {
        this.logger.log(`CALL ALLOWED: ${callerEndpoint} -> ${calledEndpoint}`);
        await this.allowCall(channel, calledEndpoint);

        // Log asynchronously - pass pre-fetched endpoints to avoid extra DB queries
        this.validatorService.logCallAttempt(
          tenantId,
          callerEndpoint,
          calledEndpoint,
          'allowed',
          undefined,
          metadata,
          result.caller,
          result.called,
        ).catch(err => this.logger.error(`Audit log failed: ${err.message}`));
      } else {
        this.logger.log(`CALL DENIED: ${callerEndpoint} -> ${calledEndpoint} (${result.reason})`);
        await this.denyCall(channel, result.reason || 'permission_denied');

        // Log asynchronously - pass pre-fetched endpoints to avoid extra DB queries
        this.validatorService.logCallAttempt(
          tenantId,
          callerEndpoint,
          calledEndpoint,
          'denied',
          result.reason,
          metadata,
          result.caller,
          result.called,
        ).catch(err => this.logger.error(`Audit log failed: ${err.message}`));
      }
    } catch (error) {
      this.logger.error(`Call validation error: ${error.message}`, error.stack);

      // Try to deny and hangup - don't throw, just log if it fails
      try {
        await this.denyCall(channel, 'system_error');
      } catch (denyError) {
        this.logger.error(`Failed to deny call after error: ${denyError.message}`);
        await this.hangupChannel(channelId);
      }

      // Try to log the error asynchronously
      if (tenantId && callerEndpoint && calledEndpoint) {
        this.validatorService.logCallAttempt(
          tenantId,
          callerEndpoint,
          calledEndpoint,
          'denied',
          'system_error',
          { error: error.message },
        ).catch(() => {}); // Ignore logging errors at this point
      }
    }
  }

  /**
   * Validate endpoint format (t{tenantId}_{extension})
   */
  private isValidEndpointFormat(endpoint: string): boolean {
    return /^t\d+_\w+$/.test(endpoint);
  }

  /**
   * Allow the call - dial directly via ARI instead of returning to dialplan
   * Note: Channel is already answered in handleCallValidation()
   */
  private async allowCall(channel: any, calledEndpoint: string) {
    const channelId = channel.id;

    try {
      // Channel is already answered in handleCallValidation()
      this.logger.debug(`Dialing ${calledEndpoint} directly via ARI`);

      // Dial the called endpoint directly via ARI
      await this.withTimeout(
        this.ariService.dial(channelId, `PJSIP/${calledEndpoint}`, 20),
        CallValidatorAriGateway.ARI_TIMEOUT,
        'dial',
      );
    } catch (error) {
      this.logger.error(`Error allowing call: ${error.message}`);
      await this.hangupChannel(channelId);
      throw error; // Re-throw to let caller know it failed
    }
  }

  /**
   * Deny the call - play error message and hangup
   */
  private async denyCall(channel: any, reason: string) {
    const channelId = channel.id;

    try {
      const soundFile = this.getSoundFileForReason(reason);

      // Answer the channel first if not already answered
      try {
        await this.withTimeout(
          this.ariService.answerChannel(channelId),
          CallValidatorAriGateway.ARI_TIMEOUT,
          'answerChannel',
        );
      } catch {
        // Channel might already be answered, continue
      }

      // Play error message
      const playback = await this.withTimeout(
        this.ariService.playback(channelId, soundFile),
        CallValidatorAriGateway.ARI_TIMEOUT,
        'playback',
      );

      // Wait for playback to finish with timeout
      if (playback?.id) {
        await this.waitForPlaybackFinished(
          playback.id,
          CallValidatorAriGateway.PLAYBACK_TIMEOUT,
        );
      }

      // Hangup
      await this.hangupChannel(channelId);
    } catch (error) {
      this.logger.error(`Error denying call: ${error.message}`);
      await this.hangupChannel(channelId);
    }
  }

  /**
   * Wait for a playback to finish with timeout
   */
  private waitForPlaybackFinished(playbackId: string, timeout: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.ariService.off('PlaybackFinished', handler);
        this.logger.debug(`Playback ${playbackId} timed out after ${timeout}ms`);
        resolve();
      }, timeout);

      const handler = (event: any) => {
        if (event.playback?.id === playbackId) {
          clearTimeout(timer);
          this.ariService.off('PlaybackFinished', handler);
          this.logger.debug(`Playback ${playbackId} finished`);
          resolve();
        }
      };

      this.ariService.on('PlaybackFinished', handler);
    });
  }

  /**
   * Execute a promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    operation: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout: ${operation} took longer than ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Get Asterisk sound file based on deny reason
   */
  private getSoundFileForReason(reason: string): string {
    const soundMap: Record<string, string> = {
      endpoint_not_found: 'ss-noservice',
      inter_context_denied: 'access-denied-ww-646',
      role_permission_denied: 'access-denied-ww-646',
      role_context_mismatch: 'access-denied-ww-646',
      missing_endpoint_info: 'an-error-has-occured',
      system_error: 'an-error-has-occured',
      // Tenant isolation errors
      invalid_endpoint_format: 'an-error-has-occured',
      cross_tenant_call_blocked: 'access-denied-ww-646',
      orphaned_caller_context: 'an-error-has-occured',
      orphaned_called_context: 'an-error-has-occured',
      caller_context_tenant_mismatch: 'an-error-has-occured',
      called_context_tenant_mismatch: 'an-error-has-occured',
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
   * @param callerNumber The caller number from ARI event
   * @param context The dialplan context to extract tenant ID from
   * @returns Fully qualified endpoint ID (t{tenantId}_{extension}) or null
   */
  private extractEndpointFromCallerNumber(
    callerNumber: string,
    context?: string,
  ): string | null {
    if (!callerNumber) {
      return null;
    }

    // Remove PJSIP/ prefix if present
    const cleaned = callerNumber.replace(/^PJSIP\//, '');

    // If already prefixed (t1_1002), return as-is
    if (cleaned.match(/^t\d+_/)) {
      return cleaned;
    }

    // Try to extract tenant ID from context (format: t{tenantId}_{contextName})
    if (context) {
      const contextMatch = context.match(/^t(\d+)_/);
      if (contextMatch) {
        const tenantId = contextMatch[1];
        this.logger.debug(
          `Constructed endpoint ID: t${tenantId}_${cleaned} from context ${context}`,
        );
        return `t${tenantId}_${cleaned}`;
      }
    }

    // If we can't determine tenant, return null to trigger proper error handling
    this.logger.error(
      `Unable to determine tenant for endpoint ${cleaned} (context: ${context || 'N/A'})`,
    );
    return null;
  }

  /**
   * Extract tenant ID from endpoint ID (e.g., "t1_1002" → 1)
   * @throws Error if tenant ID cannot be extracted (security measure)
   */
  private extractTenantId(endpointId: string): number {
    const match = endpointId.match(/^t(\d+)_/);

    if (!match) {
      throw new Error(
        `Invalid endpoint ID format: "${endpointId}" - must be in format "t{tenantId}_{extension}"`,
      );
    }

    return parseInt(match[1], 10);
  }

  /**
   * Hangup a channel with timeout
   */
  private async hangupChannel(channelId: string) {
    try {
      await this.withTimeout(
        this.ariService.hangup(channelId),
        CallValidatorAriGateway.ARI_TIMEOUT,
        'hangup',
      );
    } catch (error) {
      this.logger.error(`Error hanging up channel ${channelId}: ${error.message}`);
    }
  }
}
