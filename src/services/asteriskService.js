const amiConfig = require('../config/ami');

/**
 * Service pour l'administration d'Asterisk via AMI
 */
class AsteriskService {
  /**
   * Obtenir le statut du serveur Asterisk
   */
  async getServerStatus() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      // Récupérer plusieurs informations en parallèle
      const statusPromises = [
        this.getCoreStatus(),
        this.getSystemInfo(),
        this.getCoreSettings(),
      ];

      Promise.all(statusPromises)
        .then(([coreStatus, systemInfo, coreSettings]) => {
          resolve({
            ami_connected: true,
            core_status: coreStatus,
            system_info: systemInfo,
            core_settings: coreSettings,
            timestamp: new Date().toISOString()
          });
        })
        .catch(reject);
    });
  }

  /**
   * Obtenir le statut du core Asterisk
   */
  getCoreStatus() {
    return new Promise((resolve, reject) => {
      amiConfig.executeAction({
        Action: 'CoreStatus',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir les informations système
   */
  getSystemInfo() {
    return new Promise((resolve, reject) => {
      amiConfig.executeAction({
        Action: 'Command',
        Command: 'core show sysinfo',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir les paramètres du core
   */
  getCoreSettings() {
    return new Promise((resolve, reject) => {
      amiConfig.executeAction({
        Action: 'CoreSettings',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir tous les canaux actifs
   */
  async getActiveChannels() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'CoreShowChannels',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir les détails d'un canal spécifique
   */
  async getChannelInfo(channelName) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Command',
        Command: `core show channel ${channelName}`,
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Raccrocher un canal
   */
  async hangupChannel(channelName, cause = 16) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Hangup',
        Channel: channelName,
        Cause: cause, // 16 = Normal Clearing
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Initier un appel (Originate)
   */
  async originateCall(data) {
    const {
      channel,
      extension,
      context,
      priority = 1,
      callerid,
      timeout = 30000,
      variables = {},
      async = true
    } = data;

    if (!channel || !extension || !context) {
      throw new Error('Les champs channel, extension et context sont requis');
    }

    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      const action = {
        Action: 'Originate',
        Channel: channel,
        Exten: extension,
        Context: context,
        Priority: priority,
        Timeout: timeout,
        Async: async ? 'true' : 'false',
      };

      if (callerid) {
        action.CallerID = callerid;
      }

      // Ajouter des variables personnalisées
      if (Object.keys(variables).length > 0) {
        action.Variable = Object.entries(variables)
          .map(([key, value]) => `${key}=${value}`)
          .join(',');
      }

      amiConfig.executeAction(action, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Recharger la configuration complète
   */
  async reloadAll() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Reload',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Recharger un module spécifique
   */
  async reloadModule(moduleName) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.reloadModule(moduleName, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Recharger PJSIP
   */
  async reloadPJSIP() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.reloadPJSIP((err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Recharger le dialplan
   */
  async reloadDialplan() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.reloadDialplan((err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir la liste des modules chargés
   */
  async getLoadedModules() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'ModuleCheck',
        Module: 'all',
      }, (err, res) => {
        if (err) {
          // Fallback sur Command
          amiConfig.executeAction({
            Action: 'Command',
            Command: 'module show',
          }, (err2, res2) => {
            if (err2) return reject(err2);
            resolve(res2);
          });
        } else {
          resolve(res);
        }
      });
    });
  }

  /**
   * Obtenir les peers SIP/PJSIP
   */
  async getPeers(technology = 'pjsip') {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      const action = technology.toLowerCase() === 'pjsip' 
        ? { Action: 'PJSIPShowEndpoints' }
        : { Action: 'SIPpeers' };

      amiConfig.executeAction(action, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Envoyer un message SIP
   */
  async sendMessage(data) {
    const { to, from, body } = data;

    if (!to || !body) {
      throw new Error('Les champs to et body sont requis');
    }

    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'MessageSend',
        To: to,
        From: from || 'asterisk',
        Body: body,
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir les statistiques globales
   */
  async getGlobalStats() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      const statsPromises = [
        this.getActiveChannels(),
        this.getCoreStatus(),
      ];

      Promise.all(statsPromises)
        .then(([channels, coreStatus]) => {
          resolve({
            active_channels: channels,
            core_status: coreStatus,
            timestamp: new Date().toISOString()
          });
        })
        .catch(reject);
    });
  }

  /**
   * Exécuter une commande CLI personnalisée
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Command',
        Command: command,
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Redémarrer Asterisk (DANGER!)
   */
  async restartAsterisk(when = 'now') {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Restart',
        When: when,
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir le uptime d'Asterisk
   */
  async getUptime() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction({
        Action: 'Command',
        Command: 'core show uptime',
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }
}

module.exports = new AsteriskService();