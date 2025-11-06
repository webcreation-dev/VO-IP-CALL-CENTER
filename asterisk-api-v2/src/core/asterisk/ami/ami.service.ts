import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const AsteriskManager = require('asterisk-manager');
import {
  AmiAction,
  AmiResponse,
  QueueStatusResult,
  QueueMember,
  EndpointStatusResult,
  TransportInfo,
} from './ami.types';
import { AMI_ACTIONS, AMI_EVENTS, AMI_TIMEOUTS } from './ami.constants';

@Injectable()
export class AmiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiService.name);
  private ami: any;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    await this.disconnect();
  }

  /**
   * Connect to AMI
   */
  private async connect(): Promise<void> {
    const config = {
      port: this.configService.get('ami.port'),
      host: this.configService.get('ami.host'),
      username: this.configService.get('ami.user'),
      password: this.configService.get('ami.password'),
      events: true,
    };

    this.logger.log(`Connecting to AMI at ${config.host}:${config.port}...`);

    this.ami = new AsteriskManager(
      config.port,
      config.host,
      config.username,
      config.password,
      config.events,
    );

    this.ami.on('connect', () => {
      this.logger.log('✅ AMI connected successfully');
      this.isConnected = true;

      // Force enable ALL events immediately after connection
      setTimeout(() => {
        this.logger.log('🔧 Forcing AMI events activation...');
        this.ami.action({ Action: 'Events', EventMask: 'on' }, (err: Error, res: any) => {
          if (err) {
            this.logger.error('❌ Failed to enable AMI events:', err.message);
          } else {
            this.logger.log('✅ AMI events enabled successfully');
            this.logger.log(`📋 Response: ${JSON.stringify(res)}`);
          }
        });
      }, 500);
    });

    this.ami.on('disconnect', () => {
      this.logger.warn('⚠️  AMI disconnected');
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.ami.on('error', (err: Error) => {
      this.logger.error('❌ AMI error:', err.message);
      this.isConnected = false;
    });

    // Forward all events to subscribers
    this.ami.on('managerevent', (event: any) => {
      // DEBUG: Log EVERY SINGLE EVENT that arrives
      this.logger.log(`🔔 [GLOBAL LISTENER] Event: ${event.event || 'unknown'}, ActionID: ${event.actionid || 'none'}`);
      this.emitEvent(event.event, event);
    });
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.logger.log('Scheduling AMI reconnection in 5 seconds...');
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }

  /**
   * Disconnect from AMI
   */
  private async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ami) {
        this.ami.disconnect();
      }
      this.isConnected = false;
      resolve();
    });
  }

  /**
   * Check if AMI is connected
   */
  isAmiConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Execute an AMI action
   */
  async executeAction<T = AmiResponse>(
    action: AmiAction,
    timeoutMs: number = AMI_TIMEOUTS.DEFAULT,
  ): Promise<T> {
    if (!this.isConnected) {
      throw new Error('AMI is not connected');
    }

    return new Promise((resolve, reject) => {
      const actionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const actionWithId = { ...action, ActionID: actionId };

      const timeout = setTimeout(() => {
        reject(new Error(`AMI action timeout: ${action.Action}`));
      }, timeoutMs);

      this.ami.action(actionWithId, (err: Error, res: any) => {
        clearTimeout(timeout);

        if (err) {
          this.logger.error(`AMI action ${action.Action} failed:`, err.message);
          return reject(err);
        }

        if (res?.response === 'Error') {
          const errorMsg = res.message || 'Unknown AMI error';
          this.logger.warn(`AMI action ${action.Action} returned error: ${errorMsg}`);
          return reject(new Error(errorMsg));
        }

        resolve(res as T);
      });
    });
  }

  /**
   * Subscribe to AMI events
   */
  on(eventName: string, callback: Function): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);

    // Also attach to the underlying AMI connection
    if (this.ami && eventName === 'managerevent') {
      this.ami.on(eventName, callback);
    }
  }

  /**
   * Unsubscribe from AMI events
   */
  off(eventName: string, callback: Function): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }

    // Also detach from the underlying AMI connection
    if (this.ami && eventName === 'managerevent') {
      this.ami.removeListener(eventName, callback);
    }
  }

  /**
   * Get the underlying AMI connection (for advanced use)
   */
  getAmiConnection(): any {
    return this.ami;
  }

  /**
   * Emit event to subscribers
   */
  private emitEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  // ========================================
  // QUEUE OPERATIONS
  // ========================================

  /**
   * Get queue status
   */
  async getQueueStatus(queueName: string): Promise<QueueStatusResult> {
    const events: any[] = [];

    return new Promise((resolve, reject) => {
      const actionId = `queue_${Date.now()}`;

      const eventHandler = (event: any) => {
        if (event.actionid === actionId) {
          events.push(event);

          if (event.event === AMI_EVENTS.QUEUE_STATUS_COMPLETE) {
            this.ami.removeListener('managerevent', eventHandler);
            try {
              const result = this.parseQueueStatusEvents(events);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        }
      };

      // Set timeout
      const timeout = setTimeout(() => {
        this.ami.removeListener('managerevent', eventHandler);
        reject(new Error('Queue status timeout'));
      }, AMI_TIMEOUTS.QUEUE_STATUS);

      // Listen to events
      this.ami.on('managerevent', eventHandler);

      // Execute action
      this.ami.action(
        {
          Action: AMI_ACTIONS.QUEUE_STATUS,
          Queue: queueName,
          ActionID: actionId,
        },
        (err: Error) => {
          if (err) {
            clearTimeout(timeout);
            this.ami.removeListener('managerevent', eventHandler);
            reject(err);
          }
        },
      );
    });
  }

  /**
   * Parse queue status events
   */
  private parseQueueStatusEvents(events: any[]): QueueStatusResult {
    const queueParams = events.find((e) => e.event === AMI_EVENTS.QUEUE_PARAMS);
    const memberEvents = events.filter((e) => e.event === AMI_EVENTS.QUEUE_MEMBER);

    if (!queueParams) {
      throw new Error('No QueueParams event received');
    }

    const members: QueueMember[] = memberEvents.map((m) => ({
      name: m.membername || m.name,
      location: m.location || m.interface,
      stateInterface: m.stateinterface || m.location,
      membership: m.membership || 'dynamic',
      penalty: parseInt(m.penalty, 10) || 0,
      callsTaken: parseInt(m.callstaken, 10) || 0,
      lastCall: parseInt(m.lastcall, 10) || 0,
      lastPause: parseInt(m.lastpause, 10) || 0,
      status: parseInt(m.status, 10) || 0,
      paused: parseInt(m.paused, 10) || 0,
      pausedReason: m.pausedreason,
      wrapuptime: parseInt(m.wrapuptime, 10) || 0,
      inCall: parseInt(m.incall, 10) || 0,
    }));

    return {
      queue: queueParams.queue,
      max: parseInt(queueParams.max, 10) || 0,
      strategy: queueParams.strategy || 'ringall',
      calls: parseInt(queueParams.calls, 10) || 0,
      holdtime: parseInt(queueParams.holdtime, 10) || 0,
      talktime: parseInt(queueParams.talktime, 10) || 0,
      completed: parseInt(queueParams.completed, 10) || 0,
      abandoned: parseInt(queueParams.abandoned, 10) || 0,
      servicelevel: parseInt(queueParams.servicelevel, 10) || 0,
      servicelevelperf: parseFloat(queueParams.servicelevelperf) || 0,
      weight: parseInt(queueParams.weight, 10) || 0,
      members,
    };
  }

  /**
   * Add member to queue
   */
  async queueAdd(
    queueName: string,
    interfaceName: string,
    memberName?: string,
    penalty: number = 0,
    paused: number = 0,
  ): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.QUEUE_ADD,
      Queue: queueName,
      Interface: interfaceName,
      MemberName: memberName,
      Penalty: penalty,
      Paused: paused,
    });
  }

  /**
   * Remove member from queue
   */
  async queueRemove(queueName: string, interfaceName: string): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.QUEUE_REMOVE,
      Queue: queueName,
      Interface: interfaceName,
    });
  }

  /**
   * Pause/unpause queue member
   */
  async queuePause(
    queueName: string,
    interfaceName: string,
    paused: boolean,
    reason?: string,
  ): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.QUEUE_PAUSE,
      Queue: queueName,
      Interface: interfaceName,
      Paused: paused ? 'true' : 'false',
      Reason: reason,
    });
  }

  /**
   * Update queue member penalty
   */
  async queuePenalty(
    queueName: string,
    interfaceName: string,
    penalty: number,
  ): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.QUEUE_PENALTY,
      Queue: queueName,
      Interface: interfaceName,
      Penalty: penalty,
    });
  }

  /**
   * Reload a specific queue
   */
  async reloadQueue(queueName: string): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.COMMAND,
      Command: `queue reload ${queueName}`,
    });
  }

  // ========================================
  // PJSIP OPERATIONS
  // ========================================

  // Dans ami.service.ts - Modifier la méthode getEndpointStatus()

/**
 * Get endpoint status
 * FIXED - Use internal event system instead of direct ami.on()
 */
async getEndpointStatus(endpointId: string): Promise<EndpointStatusResult> {
  if (!this.isConnected) {
    throw new Error('AMI is not connected');
  }

  return new Promise((resolve, reject) => {
    const events: any[] = [];
    const actionId = `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let collecting = true;

    // NEW STRATEGY: Collect ALL EndpointDetail events for our endpoint, ignore ActionID
    const eventHandler = (event: any) => {
      if (!collecting) return;

      const eventName = event.event;

      // Collect all endpoint-related events
      if (eventName === 'EndpointDetail' ||
          eventName === 'AuthDetail' ||
          eventName === 'TransportDetail' ||
          eventName === 'AorDetail' ||
          eventName === 'ContactStatusDetail' ||
          eventName === 'EndpointDetailComplete') {

        // Check if it's for our endpoint
        if (event.objectname === endpointId || !event.objectname) {
          this.logger.log(`✅ [MATCHED] ${eventName} for ${endpointId}`);
          events.push(event);

          // When we get the complete event, process all events
          if (eventName === 'EndpointDetailComplete') {
            collecting = false;
            this.off('managerevent', eventHandler);
            clearTimeout(timeout);

            // Parse collected events
            const endpointDetail = events.find((e) => e.event === 'EndpointDetail');
            const contacts = events
              .filter((e) => e.event === 'ContactStatusDetail')
              .map((c) => ({
                uri: c.uri,
                status: c.status,
                rtt: c.roundtripusec,
                userAgent: c.useragent,
              }));

            if (endpointDetail) {
              this.logger.log(`🎉 Successfully got endpoint status for ${endpointId}`);
              resolve({
                objectType: endpointDetail.objecttype,
                objectName: endpointDetail.objectname,
                transport: endpointDetail.transport,
                aor: endpointDetail.aor,
                auths: endpointDetail.auths,
                outboundAuths: endpointDetail.outboundauths,
                deviceState: endpointDetail.devicestate || 'Unknown',
                activeChannels: parseInt(endpointDetail.activechannels, 10) || 0,
                contacts: contacts.length > 0 ? contacts : null,
              });
            } else {
              reject(new Error('No EndpointDetail received'));
            }
          }
        }
      }
    };

    this.on('managerevent', eventHandler);

    // Set timeout
    const timeout = setTimeout(() => {
      if (!collecting) return;
      collecting = false;
      this.off('managerevent', eventHandler);
      this.logger.warn(`Endpoint status timeout for ${endpointId} - Events received: ${events.length}`);

      if (events.length > 0) {
        this.logger.debug(`Events received: ${events.map(e => e.event).join(', ')}`);
      }

      reject(new Error(`Endpoint status timeout for ${endpointId}`));
    }, AMI_TIMEOUTS.ENDPOINT_STATUS);

    // Execute action
    this.logger.log(`Sending PJSIPShowEndpoint for ${endpointId} (ActionID: ${actionId})`);
    this.ami.action(
      {
        Action: AMI_ACTIONS.PJSIP_SHOW_ENDPOINT,
        Endpoint: endpointId,
        ActionID: actionId,
      },
      (err: Error) => {
        if (err) {
          clearTimeout(timeout);
          collecting = false;
          this.off('managerevent', eventHandler);
          this.logger.error(`PJSIPShowEndpoint action error for ${endpointId}:`, err.message);
          reject(err);
        }
      },
    );
  });
}

  /**
   * Reload PJSIP
   */
  async reloadPJSIP(): Promise<void> {
    try {
      await this.executeAction({
        Action: AMI_ACTIONS.PJSIP_RELOAD,
      });
    } catch (error) {
      // Fallback to Command if PJSIPReload doesn't exist
      await this.executeAction({
        Action: AMI_ACTIONS.COMMAND,
        Command: 'pjsip reload',
      });
    }
  }

  // ========================================
  // MODULE OPERATIONS
  // ========================================

  /**
   * Reload a module
   */
  async reloadModule(moduleName: string): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.MODULE_RELOAD,
      Module: moduleName,
    });
  }

  /**
   * Reload dialplan
   */
  async reloadDialplan(): Promise<void> {
    await this.executeAction({
      Action: AMI_ACTIONS.COMMAND,
      Command: 'dialplan reload',
    });
  }

  /**
   * Execute custom command
   */
  async executeCommand(command: string): Promise<string> {
    const result = await this.executeAction<any>({
      Action: AMI_ACTIONS.COMMAND,
      Command: command,
    });

    // Debug logging
    this.logger.debug(`executeCommand result type: ${typeof result}, isArray: ${Array.isArray(result)}`);
    this.logger.debug(`result.data type: ${typeof result?.data}, isArray: ${Array.isArray(result?.data)}`);

    // Handle different response formats from AMI
    if (typeof result === 'string') {
      return result;
    }

    // If data is an array, join it into a string
    if (Array.isArray(result.data)) {
      const joined = result.data.join('\n');
      this.logger.debug(`Joined array data into string of length ${joined.length}`);
      return joined;
    }

    // If data is a string, return it
    if (typeof result.data === 'string') {
      return result.data;
    }

    // Fallback to output or empty string
    const fallback = result.output || '';
    this.logger.debug(`Using fallback, type: ${typeof fallback}, isArray: ${Array.isArray(fallback)}`);

    // If fallback is an array, join it
    if (Array.isArray(fallback)) {
      const joined = fallback.join('\n');
      this.logger.debug(`Joined fallback array into string of length ${joined.length}`);
      return joined;
    }

    // If fallback is a string, return it
    if (typeof fallback === 'string') {
      return fallback;
    }

    // If fallback is an object, convert to string
    this.logger.warn(`Unexpected fallback type: ${typeof fallback}, converting to empty string`);
    return '';
  }

  /**
   * Ping AMI
   */
  async ping(): Promise<boolean> {
    try {
      await this.executeAction({ Action: AMI_ACTIONS.PING }, AMI_TIMEOUTS.SHORT);
      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // PJSIP TRANSPORT OPERATIONS
  // ========================================

  /**
   * Get configured PJSIP transports
   * Uses CLI command since there's no dedicated AMI action for transports
   *
   * @returns Array of configured transports
   */
  async getPJSIPTransports(): Promise<TransportInfo[]> {
    try {
      const output = await this.executeCommand('pjsip show transports');
      this.logger.debug(`AMI raw output for 'pjsip show transports':\n${output}`);
      return this.parseTransportsCliOutput(output);
    } catch (error) {
      this.logger.error('Failed to get PJSIP transports:', error.message);
      throw new Error('Failed to retrieve PJSIP transports from Asterisk');
    }
  }

  /**
   * Parse CLI output from "pjsip show transports"
   *
   * Expected format (tabular):
   * Transport:  <TransportId........>  <Type>  <cos>  <tos>  <BindAddress....................>
   * ==========================================================================================
   *
   * Transport:  transport-udp             udp      0      0  0.0.0.0:5060
   * Transport:  transport-wss             wss      0      0  0.0.0.0:8089
   *
   * @param output - CLI output string
   * @returns Parsed transport information
   */
  private parseTransportsCliOutput(output: string): TransportInfo[] {
    const transports: TransportInfo[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Skip header lines, empty lines, and separator lines
      if (!line.trim() || line.includes('TransportId') || line.includes('====') || line.includes('Objects found')) {
        continue;
      }

      // Match tabular format: "Transport:  <name>  <protocol>  <cos>  <tos>  <bind>"
      // Example: "Transport:  transport-udp             udp      0      0  0.0.0.0:5060"
      const match = line.match(/^Transport:\s+(\S+)\s+(\S+)\s+\d+\s+\d+\s+(.+)$/);

      if (match) {
        const [, id, protocol, bind] = match;

        transports.push({
          id: id.trim(),
          protocol: protocol.trim(),
          bind: bind.trim(),
          // These fields are not available in the tabular format
          // They would need a separate "pjsip show transport <name>" command
          externalMediaAddress: undefined,
          externalSignalingAddress: undefined,
        });
      }
    }

    this.logger.log(`Found ${transports.length} PJSIP transport(s): ${transports.map(t => t.id).join(', ')}`);
    return transports;
  }
}
