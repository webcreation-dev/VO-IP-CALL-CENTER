import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { PsEndpoint } from '../endpoints/entities/ps-endpoint.entity';
import { BlindTransferDto, SendMessageDto, ExecuteCommandDto } from './dto';

@Injectable() 
export class AsteriskService {
  private readonly logger = new Logger(AsteriskService.name);

  constructor(
    private readonly amiService: AmiService,
    @InjectRepository(PsEndpoint)
    private readonly endpointRepository: Repository<PsEndpoint>,
  ) {}

  /**
   * Get Asterisk server status
   */
  async getServerStatus(): Promise<any> {
    try {
      const [coreStatus, systemInfo, coreSettings] = await Promise.all([
        this.getCoreStatus(),
        this.getSystemInfo(),
        this.getCoreSettings(),
      ]);

      return {
        ami_connected: true,
        core_status: coreStatus,
        system_info: systemInfo,
        core_settings: coreSettings,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get server status: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get server status');
    }
  }

  /**
   * Get Asterisk uptime
   */
  async getUptime(): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: 'core show uptime',
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to get uptime: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get uptime');
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<any> {
    try {
      const channels = await this.amiService.executeAction({
        Action: 'CoreShowChannels'
      });
      const coreStatus = await this.getCoreStatus();

      return {
        active_channels: channels.length,
        channels,
        core_status: coreStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`Failed to get global stats: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get global stats');
    }
  }

  /**
   * Blind transfer
   */
  async blindTransfer(dto: BlindTransferDto): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'BlindTransfer',
        Channel: dto.channelName,
        Exten: dto.extension,
        Context: dto.context,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to blind transfer: ${error.message}`);
      throw new ServiceUnavailableException('Failed to perform blind transfer');
    }
  }

  /**
   * Get available extensions for a context
   */
  async getAvailableExtensions(context: string): Promise<any> {
    try {
      // Get all endpoints for this context
      const endpoints = await this.endpointRepository.find({
        where: { context },
        select: ['id'],
      });

      const allExtensions = endpoints.map((e) => e.id);

      // Get active channels
      const channels = await this.amiService.executeAction({
        Action: 'CoreShowChannels'
      });

      // Extract busy extensions
      const busyExtensions = new Set<string>();
      channels.forEach((channel: any) => {
        if (channel.context === context) {
          const match = channel.name?.match(/PJSIP\/([^-]+)/);
          if (match) {
            busyExtensions.add(match[1]);
          }
        }
      });

      // Filter available extensions
      const availableExtensions = allExtensions.filter(
        (ext) => !busyExtensions.has(ext),
      );

      return {
        context,
        total_extensions: allExtensions.length,
        busy_extensions: Array.from(busyExtensions),
        available_extensions: availableExtensions,
        available_count: availableExtensions.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get available extensions: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get available extensions');
    }
  }

  /**
   * Reload all configurations
   */
  async reloadAll(): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Reload',
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to reload all: ${error.message}`);
      throw new ServiceUnavailableException('Failed to reload configuration');
    }
  }

  /**
   * Reload PJSIP
   */
  async reloadPJSIP(): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: 'module reload res_pjsip.so',
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to reload PJSIP: ${error.message}`);
      throw new ServiceUnavailableException('Failed to reload PJSIP');
    }
  }

  /**
   * Reload dialplan
   */
  async reloadDialplan(): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: 'dialplan reload',
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to reload dialplan: ${error.message}`);
      throw new ServiceUnavailableException('Failed to reload dialplan');
    }
  }

  /**
   * Reload specific module
   */
  async reloadModule(moduleName: string): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: `module reload ${moduleName}`,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to reload module ${moduleName}: ${error.message}`);
      throw new ServiceUnavailableException(`Failed to reload module ${moduleName}`);
    }
  }

  /**
   * Get loaded modules
   */
  async getLoadedModules(): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: 'module show',
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to get loaded modules: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get loaded modules');
    }
  }

  /**
   * Get peers (PJSIP endpoints)
   */
  async getPeers(technology: string = 'pjsip'): Promise<any> {
    try {
      const action =
        technology.toLowerCase() === 'pjsip'
          ? { Action: 'PJSIPShowEndpoints' }
          : { Action: 'SIPpeers' };

      const result = await this.amiService.executeAction(action);
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to get peers: ${error.message}`);
      throw new ServiceUnavailableException('Failed to get peers');
    }
  }

  /**
   * Send SIP message
   */
  async sendMessage(dto: SendMessageDto): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'MessageSend',
        To: dto.to,
        From: dto.from || 'asterisk',
        Body: dto.body,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw new ServiceUnavailableException('Failed to send message');
    }
  }

  /**
   * Execute CLI command
   */
  async executeCommand(dto: ExecuteCommandDto): Promise<any> {
    try {
      const result = await this.amiService.executeAction({
        Action: 'Command',
        Command: dto.command,
      });
      return result;
    } catch (error: any) {
      this.logger.error(`Failed to execute command: ${error.message}`);
      throw new ServiceUnavailableException('Failed to execute command');
    }
  }

  // Private helper methods

  private async getCoreStatus(): Promise<any> {
    return await this.amiService.executeAction({
      Action: 'CoreStatus',
    });
  }

  private async getSystemInfo(): Promise<any> {
    return await this.amiService.executeAction({
      Action: 'Command',
      Command: 'core show sysinfo',
    });
  }

  private async getCoreSettings(): Promise<any> {
    return await this.amiService.executeAction({
      Action: 'CoreSettings',
    });
  }
}
