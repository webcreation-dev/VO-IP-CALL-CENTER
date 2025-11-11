import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { AmiService } from '../asterisk/ami/ami.service';

/**
 * AsteriskConfigService
 *
 * Gère la configuration dynamique des contextes Asterisk via AMI (Asterisk Manager Interface).
 * Avec Asterisk Realtime, les contextes et extensions sont automatiquement chargés depuis la base de données.
 * Ce service utilise AMI pour recharger le dialplan après modification de la base de données.
 */
@Injectable()
export class AsteriskConfigService {
  private readonly logger = new Logger(AsteriskConfigService.name);

  constructor(private readonly amiService: AmiService) {}

  /**
   * Reload Asterisk dialplan
   *
   * Forces Asterisk to reload the dialplan configuration from the database.
   * Called after dialplan regeneration to apply changes immediately.
   * Uses AMI (Asterisk Manager Interface) instead of Docker exec.
   *
   * @throws InternalServerErrorException if reload fails
   */
  async reloadDialplan(): Promise<void> {
    this.logger.log('Reloading Asterisk dialplan via AMI...');

    try {
      await this.amiService.reloadDialplan();
      this.logger.log('✅ Asterisk dialplan reloaded successfully via AMI');
    } catch (error) {
      this.logger.error(
        `Failed to reload Asterisk dialplan via AMI: ${error.message}`,
        error.stack,
      );

      throw new InternalServerErrorException(
        `Failed to reload Asterisk dialplan: ${error.message}`,
      );
    }
  }

  /**
   * Vérifie si un contexte existe dans Asterisk
   * Uses AMI (Asterisk Manager Interface) to execute the dialplan show command.
   *
   * @param contextName - Nom du contexte à vérifier
   * @returns true si le contexte existe, false sinon
   */
  async contextExists(contextName: string): Promise<boolean> {
    try {
      const output = await this.amiService.executeCommand(
        `dialplan show ${contextName}`,
      );

      // Si le contexte n'existe pas, Asterisk retourne "There is no existence of..."
      return !output.includes('There is no existence');
    } catch (error) {
      this.logger.error(
        `Failed to check context existence via AMI: ${error.message}`,
      );
      return false;
    }
  }
}
