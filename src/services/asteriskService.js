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

      const channels = [];
      let listening = true;

      // Écouter les événements CoreShowChannel
      const channelListener = (evt) => {
        if (evt.event === 'CoreShowChannel') {
          channels.push(evt);
        } else if (evt.event === 'CoreShowChannelsComplete') {
          // Fin de la liste des canaux
          if (listening) {
            listening = false;
            amiConfig.ami.removeListener('managerevent', channelListener);
            resolve({ events: channels });
          }
        }
      };

      // Attacher le listener
      amiConfig.ami.on('managerevent', channelListener);

      // Envoyer la commande
      amiConfig.executeAction({
        Action: 'CoreShowChannels',
      }, (err, res) => {
        if (err) {
          amiConfig.ami.removeListener('managerevent', channelListener);
          return reject(err);
        }
        // La réponse initiale arrive ici, mais les événements arrivent via le listener
      });

      // Timeout de sécurité (5 secondes)
      setTimeout(() => {
        if (listening) {
          listening = false;
          amiConfig.ami.removeListener('managerevent', channelListener);
          resolve({ events: channels });
        }
      }, 5000);
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

  /**
   * Effectuer un transfert simple (Blind Transfer)
   * Transfère un appel actif vers une extension sans supervision
   * @param {string} channelName - Nom du canal à transférer (ex: PJSIP/101-00000001)
   * @param {string} extension - Extension de destination (ex: 102)
   * @param {string} context - Contexte du dialplan (ex: client-a-context)
   */
  async blindTransfer(channelName, extension, context) {
    if (!channelName || !extension || !context) {
      throw new Error('Les champs channelName, extension et context sont requis');
    }

    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      // Utiliser BlindTransfer au lieu de Redirect
      // Format: exten@context
      const destination = `${extension}@${context}`;

      amiConfig.executeAction({
        Action: 'BlindTransfer',
        Channel: channelName,
        Exten: destination
      }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  /**
   * Obtenir les extensions disponibles (non en appel) pour un contexte donné
   */
  async getAvailableExtensions(context) {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Récupérer tous les endpoints du contexte depuis la DB
        const db = require('../../db');
        const endpointsResult = await db.query(
          'SELECT id FROM ps_endpoints WHERE context = $1 ORDER BY id',
          [context]
        );

        const allExtensions = endpointsResult.rows.map(row => row.id);

        // 2. Récupérer les canaux actifs
        const channelsData = await this.getActiveChannels();
        const activeChannels = channelsData.events || [];

        // 3. Extraire les extensions en appel
        const busyExtensions = new Set();
        activeChannels.forEach(channel => {
          if (channel.context === context) {
            // Extraire l'extension du nom du canal (ex: PJSIP/101-xxx -> 101)
            const match = channel.channel.match(/PJSIP\/(\d+)-/);
            if (match) {
              busyExtensions.add(match[1]);
            }
          }
        });

        // 4. Filtrer les extensions disponibles
        const availableExtensions = allExtensions.filter(
          ext => !busyExtensions.has(ext)
        );

        resolve(availableExtensions);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new AsteriskService();