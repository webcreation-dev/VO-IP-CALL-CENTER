import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigFileService } from './config-file.service';
import { AmiService } from '../core/asterisk/ami/ami.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import {
  SipTrunkRegistration,
  RegistrationStatus,
  RegistrationWithStatus,
} from './interfaces/registration.interface';
import { RegistrationInfo } from '../core/asterisk/ami/ami.types';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    private readonly configFileService: ConfigFileService,
    private readonly amiService: AmiService,
  ) {}

  /**
   * Parse AMI RegistrationInfo to RegistrationStatus
   */
  private parseRegistrationStatus(regInfo: RegistrationInfo): RegistrationStatus {
    return {
      id: regInfo.registration,
      server_uri: regInfo.serverUri,
      auth: regInfo.auth,
      status: this.normalizeStatus(regInfo.status),
      expiration: regInfo.expiration,
    };
  }

  /**
   * Normalize status string to known values
   */
  private normalizeStatus(status: string): RegistrationStatus['status'] {
    const s = status.toLowerCase();
    if (s.includes('registered')) return 'Registered';
    if (s.includes('rejected')) return 'Rejected';
    if (s.includes('unregistered')) return 'Unregistered';
    return 'Unknown';
  }

  /**
   * Get registration status from Asterisk via AMI
   */
  async getRegistrationStatus(id: string): Promise<RegistrationStatus | null> {
    try {
      const registrations = await this.amiService.getPJSIPRegistrations();

      // Registration ID in Asterisk is usually "trunk-reg-0"
      const regId = id.endsWith('-reg-0') ? id : `${id}-reg-0`;

      const regInfo = registrations.find(r => r.registration === regId);
      if (!regInfo) {
        return {
          id: regId,
          server_uri: '',
          auth: '',
          status: 'Unknown',
        };
      }

      return this.parseRegistrationStatus(regInfo);
    } catch (error) {
      this.logger.warn(`Failed to get registration status for ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Reload PJSIP wizard configuration in Asterisk
   */
  async reloadWizardConfig(): Promise<void> {
    try {
      await this.amiService.executeCommand('module reload res_pjsip_wizard.conf');
      this.logger.log('Reloaded PJSIP wizard configuration');

      // Wait a bit for reload to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      this.logger.error(`Failed to reload wizard config: ${error.message}`);
      throw new InternalServerErrorException('Failed to reload Asterisk configuration');
    }
  }

  /**
   * Create a new SIP trunk registration
   */
  async create(dto: CreateRegistrationDto): Promise<SipTrunkRegistration> {
    // Check if trunk already exists
    const exists = await this.configFileService.registrationExists(dto.name);
    if (exists) {
      throw new ConflictException(`SIP trunk '${dto.name}' already exists`);
    }

    // TODO: Validate transport exists in pjsip.conf
    // TODO: Validate context exists in extensions.conf

    try {
      // Add to config file
      const registration = await this.configFileService.addRegistration(dto);

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Created SIP trunk registration: ${dto.name}`);
      return registration;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to create SIP trunk: ${error.message}`);
    }
  }

  /**
   * Get all SIP trunk registrations
   */
  async findAll(): Promise<SipTrunkRegistration[]> {
    const registrations = await this.configFileService.getAllRegistrations();
    return Array.from(registrations.values());
  }

  /**
   * Get all SIP trunk registrations with status
   */
  async findAllWithStatus(): Promise<RegistrationWithStatus[]> {
    const registrations = await this.findAll();
    const result: RegistrationWithStatus[] = [];

    for (const registration of registrations) {
      const status = await this.getRegistrationStatus(registration.id);
      result.push({
        ...registration,
        status: status || {
          id: registration.id,
          server_uri: registration.remote_hosts,
          auth: `${registration.id}-oauth`,
          status: 'Unknown',
        },
      });
    }

    return result;
  }

  /**
   * Get a single SIP trunk registration by ID
   */
  async findOne(id: string): Promise<SipTrunkRegistration> {
    const registration = await this.configFileService.getRegistration(id);

    if (!registration) {
      throw new NotFoundException(`SIP trunk '${id}' not found`);
    }

    return registration;
  }

  /**
   * Get a single SIP trunk registration with status
   */
  async findOneWithStatus(id: string): Promise<RegistrationWithStatus> {
    const registration = await this.findOne(id);
    const status = await this.getRegistrationStatus(id);

    return {
      ...registration,
      status: status || {
        id: registration.id,
        server_uri: registration.remote_hosts,
        auth: `${registration.id}-oauth`,
        status: 'Unknown',
      },
    };
  }

  /**
   * Update a SIP trunk registration
   */
  async update(id: string, dto: UpdateRegistrationDto): Promise<SipTrunkRegistration> {
    // Check if registration exists
    const exists = await this.configFileService.registrationExists(id);
    if (!exists) {
      throw new NotFoundException(`SIP trunk '${id}' not found`);
    }

    try {
      // Update in config file
      const registration = await this.configFileService.updateRegistration(id, dto);

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Updated SIP trunk registration: ${id}`);
      return registration;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to update SIP trunk: ${error.message}`);
    }
  }

  /**
   * Delete a SIP trunk registration
   */
  async remove(id: string): Promise<void> {
    // Check if registration exists
    const exists = await this.configFileService.registrationExists(id);
    if (!exists) {
      throw new NotFoundException(`SIP trunk '${id}' not found`);
    }

    try {
      // Delete from config file
      await this.configFileService.deleteRegistration(id);

      // Reload Asterisk
      await this.reloadWizardConfig();

      this.logger.log(`Deleted SIP trunk registration: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete registration: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete SIP trunk: ${error.message}`);
    }
  }

  /**
   * Force a registration attempt for a specific trunk
   */
  async forceRegister(id: string): Promise<void> {
    // Check if registration exists
    const exists = await this.configFileService.registrationExists(id);
    if (!exists) {
      throw new NotFoundException(`SIP trunk '${id}' not found`);
    }

    try {
      // Registration ID in Asterisk is usually "trunk-reg-0"
      const regId = id.endsWith('-reg-0') ? id : `${id}-reg-0`;

      await this.amiService.executeCommand(`pjsip send register ${regId}`);
      this.logger.log(`Forced registration for ${id}`);

      // Wait a bit for registration to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.error(`Failed to force registration for ${id}: ${error.message}`);
      throw new InternalServerErrorException(`Failed to force registration: ${error.message}`);
    }
  }
}
