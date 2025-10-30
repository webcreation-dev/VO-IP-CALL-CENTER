const asteriskService = require('../services/asteriskService');
const { success, error } = require('../utils/response');

/**
 * Contrôleur pour l'administration d'Asterisk
 */
class AsteriskController {
  /**
   * GET /api/asterisk/status
   * Obtenir le statut du serveur Asterisk
   */
  async getServerStatus(req, res, next) {
    try {
      const status = await asteriskService.getServerStatus();
      return success(res, status, 'Statut du serveur Asterisk');
    } catch (err) {
      console.error('❌ Erreur getServerStatus:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/channels
   * Obtenir tous les canaux actifs
   */
  async getActiveChannels(req, res, next) {
    try {
      const channels = await asteriskService.getActiveChannels();
      return success(res, channels, 'Canaux actifs');
    } catch (err) {
      console.error('❌ Erreur getActiveChannels:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/channels/:channelName
   * Obtenir les détails d'un canal
   */
  async getChannelInfo(req, res, next) {
    try {
      const { channelName } = req.params;
      const channelInfo = await asteriskService.getChannelInfo(channelName);
      return success(res, channelInfo, `Informations du canal ${channelName}`);
    } catch (err) {
      console.error('❌ Erreur getChannelInfo:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * DELETE /api/asterisk/channels/:channelName
   * Raccrocher un canal
   */
  async hangupChannel(req, res, next) {
    try {
      const { channelName } = req.params;
      const { cause } = req.body;
      
      const result = await asteriskService.hangupChannel(channelName, cause);
      return success(res, result, `Canal ${channelName} raccroché`);
    } catch (err) {
      console.error('❌ Erreur hangupChannel:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/originate
   * Initier un appel
   */
  async originateCall(req, res, next) {
    try {
      const data = req.body;

      if (!data.channel || !data.extension || !data.context) {
        return error(res, 'Les champs channel, extension et context sont requis', 400);
      }

      const result = await asteriskService.originateCall(data);
      return success(res, result, 'Appel initié');
    } catch (err) {
      console.error('❌ Erreur originateCall:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/reload
   * Recharger la configuration complète
   */
  async reloadAll(req, res, next) {
    try {
      const result = await asteriskService.reloadAll();
      return success(res, result, 'Configuration rechargée');
    } catch (err) {
      console.error('❌ Erreur reloadAll:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/reload/:module
   * Recharger un module spécifique
   */
  async reloadModule(req, res, next) {
    try {
      const { module } = req.params;
      const result = await asteriskService.reloadModule(module);
      return success(res, result, `Module ${module} rechargé`);
    } catch (err) {
      console.error('❌ Erreur reloadModule:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/reload/pjsip
   * Recharger PJSIP
   */
  async reloadPJSIP(req, res, next) {
    try {
      const result = await asteriskService.reloadPJSIP();
      return success(res, result, 'PJSIP rechargé');
    } catch (err) {
      console.error('❌ Erreur reloadPJSIP:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/reload/dialplan
   * Recharger le dialplan
   */
  async reloadDialplan(req, res, next) {
    try {
      const result = await asteriskService.reloadDialplan();
      return success(res, result, 'Dialplan rechargé');
    } catch (err) {
      console.error('❌ Erreur reloadDialplan:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/modules
   * Obtenir la liste des modules chargés
   */
  async getLoadedModules(req, res, next) {
    try {
      const modules = await asteriskService.getLoadedModules();
      return success(res, modules, 'Modules chargés');
    } catch (err) {
      console.error('❌ Erreur getLoadedModules:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/peers
   * Obtenir les peers SIP/PJSIP
   */
  async getPeers(req, res, next) {
    try {
      const { technology } = req.query;
      const peers = await asteriskService.getPeers(technology || 'pjsip');
      return success(res, peers, 'Liste des peers');
    } catch (err) {
      console.error('❌ Erreur getPeers:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/message
   * Envoyer un message SIP
   */
  async sendMessage(req, res, next) {
    try {
      const data = req.body;

      if (!data.to || !data.body) {
        return error(res, 'Les champs to et body sont requis', 400);
      }

      const result = await asteriskService.sendMessage(data);
      return success(res, result, 'Message envoyé');
    } catch (err) {
      console.error('❌ Erreur sendMessage:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/stats
   * Obtenir les statistiques globales
   */
  async getGlobalStats(req, res, next) {
    try {
      const stats = await asteriskService.getGlobalStats();
      return success(res, stats, 'Statistiques globales Asterisk');
    } catch (err) {
      console.error('❌ Erreur getGlobalStats:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * POST /api/asterisk/command
   * Exécuter une commande CLI personnalisée
   */
  async executeCommand(req, res, next) {
    try {
      const { command } = req.body;

      if (!command) {
        return error(res, 'Le champ command est requis', 400);
      }

      const result = await asteriskService.executeCommand(command);
      return success(res, result, 'Commande exécutée');
    } catch (err) {
      console.error('❌ Erreur executeCommand:', err);
      
      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/asterisk/uptime
   * Obtenir le uptime d'Asterisk
   */
  async getUptime(req, res, next) {
    try {
      const uptime = await asteriskService.getUptime();
      return success(res, uptime, 'Uptime d\'Asterisk');
    } catch (err) {
      console.error('❌ Erreur getUptime:', err);

      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }

      next(err);
    }
  }

  /**
   * POST /api/asterisk/transfer/blind
   * Effectuer un transfert d'appel simple (blind transfer)
   */
  async blindTransfer(req, res, next) {
    try {
      const { channelName, extension, context } = req.body;

      if (!channelName || !extension || !context) {
        return error(res, 'Les champs channelName, extension et context sont requis', 400);
      }

      const result = await asteriskService.blindTransfer(channelName, extension, context);
      return success(res, result, `Transfert vers ${extension} effectué`);
    } catch (err) {
      console.error('❌ Erreur blindTransfer:', err);

      if (err.message.includes('AMI non connecté')) {
        return error(res, 'AMI non disponible', 503);
      }

      next(err);
    }
  }
}

module.exports = new AsteriskController();