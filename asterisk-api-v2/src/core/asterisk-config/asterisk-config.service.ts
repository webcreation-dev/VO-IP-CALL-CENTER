import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { AmiService } from '../asterisk/ami/ami.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
  private readonly containerName = 'asterisk';


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
   * Ajoute un contexte dans extensions.conf d'Asterisk
   *
   * @param contextName - Nom du contexte à ajouter (ex: t1_default)
   * @throws InternalServerErrorException si le script échoue
   */
  async addContext(contextName: string): Promise<void> {
    this.logger.log(`Adding context to Asterisk: ${contextName}`);

    try {
      const command = `docker exec ${this.containerName} /usr/local/bin/add-context.sh ${contextName}`;

      const { stdout, stderr } = await execAsync(command);

      if (stdout) {
        this.logger.log(`add-context.sh output: ${stdout.trim()}`);
      }

      if (stderr) {
        this.logger.warn(`add-context.sh stderr: ${stderr.trim()}`);
      }

      this.logger.log(`✅ Context ${contextName} added to Asterisk successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to add context ${contextName} to Asterisk: ${error.message}`,
        error.stack,
      );

      // Throw une exception pour déclencher le rollback dans le service appelant
      throw new InternalServerErrorException(
        `Failed to configure Asterisk context: ${error.message}`,
      );
    }
  }

  /**
   * Supprime un contexte de extensions.conf d'Asterisk
   *
   * @param contextName - Nom du contexte à supprimer
   *
   * Note: Cette méthode ne throw pas d'exception en cas d'échec
   * car on ne veut pas bloquer la suppression du tenant si Asterisk échoue
   */
  async removeContext(contextName: string): Promise<void> {
    this.logger.log(`Removing context from Asterisk: ${contextName}`);

    try {
      const command = `docker exec ${this.containerName} /usr/local/bin/remove-context.sh ${contextName}`;

      const { stdout, stderr } = await execAsync(command);

      if (stdout) {
        this.logger.log(`remove-context.sh output: ${stdout.trim()}`);
      }

      if (stderr && !stderr.includes('INFO:')) {
        this.logger.warn(`remove-context.sh stderr: ${stderr.trim()}`);
      }

      this.logger.log(`✅ Context ${contextName} removed from Asterisk successfully`);
    } catch (error) {
      // On log l'erreur mais on ne throw pas pour ne pas bloquer la suppression
      this.logger.error(
        `Failed to remove context ${contextName} from Asterisk (non-blocking): ${error.message}`,
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
