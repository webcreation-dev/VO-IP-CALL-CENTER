import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const AsteriskManager = require('asterisk-manager');
import {
  AmiAction,
  AmiResponse,
  QueueStatusResult,
  QueueMember,
  EndpointStatusResult,
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

  /**
   * Get endpoint status
   */
  async getEndpointStatus(endpointId: string): Promise<EndpointStatusResult> {
    try {
      const result = await this.executeAction<any>(
        {
          Action: AMI_ACTIONS.PJSIP_SHOW_ENDPOINT,
          Endpoint: endpointId,
        },
        AMI_TIMEOUTS.ENDPOINT_STATUS,
      );

      return {
        objectType: result.objecttype,
        objectName: result.objectname,
        transport: result.transport,
        aor: result.aor,
        auths: result.auths,
        outboundAuths: result.outboundauths,
        contacts: result.contacts,
        deviceState: result.devicestate || 'Unknown',
        activeChannels: parseInt(result.activechannels, 10) || 0,
      };
    } catch (error) {
      this.logger.warn(`Could not get endpoint status for ${endpointId}: ${error.message}`);
      throw error;
    }
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
    return result.data || result.output || '';
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
}
