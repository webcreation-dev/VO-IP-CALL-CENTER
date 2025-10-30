const db = require('../../db');
const amiConfig = require('../config/ami');

/**
 * Service pour la gestion des queues (files d'attente)
 */
class QueueService {
  /**
   * Récupérer toutes les queues depuis Asterisk via AMI
   */
  async getAllQueuesFromAMI() {
    return new Promise((resolve, reject) => {
      const ami = amiConfig.ami;
      const queues = {};
      const actionId = `${Date.now()}`; // ActionID simplifié - AMI tronque les ActionID complexes

      // Écouter les événements avant d'envoyer l'action
      const eventHandler = (event) => {
        if (event.actionid !== actionId) return;

        if (event.event === 'QueueParams') {
          const queueName = event.queue;
          if (queueName) {
            queues[queueName] = {
              name: queueName,
              max: event.max || 0,
              strategy: event.strategy || 'unknown',
              calls: parseInt(event.calls || '0'),
              holdtime: parseInt(event.holdtime || '0'),
              talktime: parseInt(event.talktime || '0'),
              completed: parseInt(event.completed || '0'),
              abandoned: parseInt(event.abandoned || '0'),
              service_level: parseInt(event.servicelevel || '0'),
              service_level_perf: parseFloat(event.servicelevelperf || '0'),
              weight: parseInt(event.weight || '0'),
              members: [],
            };
          }
        } else if (event.event === 'QueueMember') {
          const queueName = event.queue;
          if (queueName && queues[queueName]) {
            queues[queueName].members.push({
              interface: event.location || event.interface,
              name: event.membername || event.name,
              status: event.status,
              paused: parseInt(event.paused) === 1,
              calls_taken: parseInt(event.callstaken || '0'),
              last_call: parseInt(event.lastcall || '0'),
              penalty: parseInt(event.penalty || '0'),
              in_call: parseInt(event.incall || '0'),
            });
          }
        } else if (event.event === 'QueueStatusComplete') {
          // Fin des événements
          ami.removeListener('managerevent', eventHandler);
          console.log('✅ Queues trouvées dans AMI:', Object.keys(queues).length, Object.keys(queues));
          resolve(queues);
        }
      };

      // Attacher le listener
      ami.on('managerevent', eventHandler);

      // Envoyer l'action
      amiConfig.executeAction(
        {
          Action: 'QueueStatus',
          ActionID: actionId,
        },
        (err, response) => {
          if (err) {
            ami.removeListener('managerevent', eventHandler);
            console.log('❌ Erreur AMI QueueStatus (all queues):', err);
            return reject(err);
          }
        }
      );

      // Timeout de sécurité
      setTimeout(() => {
        ami.removeListener('managerevent', eventHandler);
        console.log('⏱️ Timeout AMI pour toutes les queues');
        resolve(queues);
      }, 5000);
    });
  }

  /**
   * Récupérer toutes les queues avec leurs membres (enrichi avec AMI)
   */
  async getAllQueues(tenantId = null) {
    let query = `
      SELECT
        q.name,
        q.tenant_id,
        q.musiconhold,
        q.strategy,
        q.timeout,
        q.retry,
        q.wrapuptime,
        q.maxlen,
        q.announce_frequency,
        q.announce_holdtime,
        q.announce_position,
        q.monitor_type,
        q.monitor_format,
        q.ringinuse,
        q.autofill,
        (SELECT COUNT(*) FROM queue_members qm WHERE qm.queue_name = q.name) as member_count
      FROM queues q
    `;

    const params = [];
    if (tenantId) {
      query += ' WHERE q.tenant_id = $1';
      params.push(tenantId);
    }

    query += ' ORDER BY q.name';

    const { rows } = await db.query(query, params);

    // Enrichir avec AMI si disponible
    if (!amiConfig.isConnected()) {
      console.warn('⚠️ AMI non connecté - retour des données DB uniquement');
      return rows.map(row => ({
        ...row,
        data_source: 'database',
        warning: 'AMI non disponible',
      }));
    }

    try {
      const amiQueues = await this.getAllQueuesFromAMI();

      // Fusionner les données
      return rows.map(row => {
        const amiData = amiQueues[row.name];
        if (amiData) {
          return {
            ...row,
            member_count_ami: amiData.members.length,
            calls: amiData.calls,
            completed: amiData.completed,
            abandoned: amiData.abandoned,
            holdtime: amiData.holdtime,
            talktime: amiData.talktime,
            service_level_perf: amiData.service_level_perf,
            data_source: 'hybrid',
          };
        }
        return {
          ...row,
          data_source: 'database',
          warning: 'Queue non trouvée dans Asterisk',
        };
      });

    } catch (amiErr) {
      console.warn('⚠️ Erreur lors de la récupération AMI des queues:', amiErr.message);
      return rows.map(row => ({
        ...row,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      }));
    }
  }

  /**
   * Récupérer le statut d'une queue depuis Asterisk via AMI
   */
  async getQueueStatusFromAMI(queueName) {
    return new Promise((resolve, reject) => {
      const ami = amiConfig.ami;
      let queueData = null;
      const members = [];
      const actionId = `${Date.now()}`; // ActionID simplifié - AMI tronque les ActionID complexes

      // Debug: Logger TOUS les événements
      const debugHandler = (event) => {
        console.log('🐛 DEBUG Event:', event.event, 'ActionID:', event.actionid, 'Expected:', actionId);
      };
      ami.on('managerevent', debugHandler);

      // Écouter les événements avant d'envoyer l'action
      const eventHandler = (event) => {
        if (event.actionid !== actionId) return;

        console.log('🔍 Événement AMI reçu:', event.event, 'pour', queueName);

        if (event.event === 'QueueParams') {
          queueData = {
            name: event.queue,
            max: event.max || 0,
            strategy: event.strategy || 'unknown',
            calls: parseInt(event.calls || '0'),
            holdtime: parseInt(event.holdtime || '0'),
            talktime: parseInt(event.talktime || '0'),
            completed: parseInt(event.completed || '0'),
            abandoned: parseInt(event.abandoned || '0'),
            service_level: parseInt(event.servicelevel || '0'),
            service_level_perf: parseFloat(event.servicelevelperf || '0'),
            weight: parseInt(event.weight || '0'),
          };
        } else if (event.event === 'QueueMember') {
          members.push({
            interface: event.location || event.interface,
            name: event.membername || event.name,
            status: event.status,
            paused: parseInt(event.paused) === 1,
            calls_taken: parseInt(event.callstaken || '0'),
            last_call: parseInt(event.lastcall || '0'),
            penalty: parseInt(event.penalty || '0'),
            in_call: parseInt(event.incall || '0'),
          });
        } else if (event.event === 'QueueStatusComplete') {
          // Fin des événements
          ami.removeListener('managerevent', eventHandler);
          ami.removeListener('managerevent', debugHandler);

          if (queueData) {
            queueData.members = members;
            console.log('✅ Queue trouvée dans AMI:', queueName, '- Membres:', members.length);
            resolve(queueData);
          } else {
            console.log('⚠️ Queue NON trouvée dans AMI:', queueName);
            resolve(null);
          }
        }
      };

      // Attacher le listener
      ami.on('managerevent', eventHandler);

      // Envoyer l'action
      amiConfig.executeAction(
        {
          Action: 'QueueStatus',
          Queue: queueName,
          ActionID: actionId,
        },
        (err, response) => {
          if (err) {
            ami.removeListener('managerevent', eventHandler);
            ami.removeListener('managerevent', debugHandler);
            console.log('❌ Erreur AMI QueueStatus pour', queueName, ':', err);
            return reject(err);
          }
          console.log('📤 Action AMI envoyée pour', queueName, '- ActionID:', actionId);
        }
      );

      // Timeout de sécurité
      setTimeout(() => {
        ami.removeListener('managerevent', eventHandler);
        ami.removeListener('managerevent', debugHandler);
        if (!queueData) {
          console.log('⏱️ Timeout AMI pour queue:', queueName);
          resolve(null);
        }
      }, 5000);
    });
  }

  /**
   * Récupérer une queue par nom (enrichi avec AMI)
   */
  async getQueueByName(name) {
    const query = `
      SELECT
        q.*,
        (
          SELECT json_agg(
            json_build_object(
              'interface', qm.interface,
              'uniqueid', qm.uniqueid,
              'membername', qm.membername,
              'penalty', qm.penalty,
              'paused', qm.paused,
              'state_interface', qm.state_interface
            )
          )
          FROM queue_members qm
          WHERE qm.queue_name = q.name
        ) as members
      FROM queues q
      WHERE q.name = $1
    `;

    const { rows } = await db.query(query, [name]);
    const queue = rows[0] || null;

    if (!queue) {
      return null;
    }

    // Enrichir avec AMI si disponible
    if (!amiConfig.isConnected()) {
      return {
        ...queue,
        data_source: 'database',
        warning: 'AMI non disponible',
      };
    }

    try {
      const amiData = await this.getQueueStatusFromAMI(name);

      if (amiData) {
        return {
          ...queue,
          members_ami: amiData.members,
          member_count_ami: amiData.members.length,
          calls: amiData.calls,
          completed: amiData.completed,
          abandoned: amiData.abandoned,
          holdtime: amiData.holdtime,
          talktime: amiData.talktime,
          service_level_perf: amiData.service_level_perf,
          data_source: 'hybrid',
        };
      }

      return {
        ...queue,
        data_source: 'database',
        warning: 'Queue non trouvée dans Asterisk',
      };

    } catch (amiErr) {
      console.warn(`⚠️ Erreur AMI pour queue ${name}:`, amiErr.message);
      return {
        ...queue,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      };
    }
  }

  /**
   * Vérifier si une queue existe
   */
  async queueExists(name) {
    const query = 'SELECT name FROM queues WHERE name = $1';
    const { rows } = await db.query(query, [name]);
    return rows.length > 0;
  }

  /**
   * Créer une nouvelle queue
   */
  async createQueue(data) {
    const {
      name,
      musiconhold = 'default',
      strategy = 'ringall',
      timeout = 20,
      retry = 5,
      wrapuptime = 15,
      maxlen = 0,
      announce_frequency = 30,
      announce_holdtime = 'yes',
      announce_position = 'yes',
      periodic_announce = null,
      periodic_announce_frequency = 60,
      monitor_type = 'MixMonitor',
      monitor_format = 'wav',
      ringinuse = 'no',
      setinterfacevar = 'yes',
      setqueuevar = 'yes',
      autofill = 'yes',
      tenant_id = null,
    } = data;

    // Validation
    if (!name) {
      throw new Error('Le nom de la queue est requis');
    }

    // Vérifier si la queue existe déjà
    if (await this.queueExists(name)) {
      throw new Error(`Une queue avec le nom "${name}" existe déjà`);
    }

    const query = `
      INSERT INTO queues (
        name, musiconhold, strategy, timeout, retry, wrapuptime,
        maxlen, announce_frequency, announce_holdtime, announce_position,
        periodic_announce, periodic_announce_frequency,
        monitor_type, monitor_format, ringinuse,
        setinterfacevar, setqueuevar, autofill, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      name,
      musiconhold,
      strategy,
      timeout,
      retry,
      wrapuptime,
      maxlen,
      announce_frequency,
      announce_holdtime,
      announce_position,
      periodic_announce,
      periodic_announce_frequency,
      monitor_type,
      monitor_format,
      ringinuse,
      setinterfacevar,
      setqueuevar,
      autofill,
      tenant_id,
    ];

    const { rows } = await db.query(query, values);

    // Recharger les queues dans Asterisk via AMI
    this.reloadQueues();

    return rows[0];
  }

  /**
   * Mettre à jour une queue
   */
  async updateQueue(name, data) {
    const queue = await this.getQueueByName(name);
    if (!queue) {
      throw new Error(`Queue "${name}" introuvable`);
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Construire dynamiquement la requête UPDATE
    const allowedFields = [
      'musiconhold',
      'strategy',
      'timeout',
      'retry',
      'wrapuptime',
      'maxlen',
      'announce_frequency',
      'announce_holdtime',
      'announce_position',
      'periodic_announce',
      'periodic_announce_frequency',
      'monitor_type',
      'monitor_format',
      'ringinuse',
      'setinterfacevar',
      'setqueuevar',
      'autofill',
    ];

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    });

    if (fields.length === 0) {
      throw new Error('Aucun champ à mettre à jour');
    }

    values.push(name);
    const query = `UPDATE queues SET ${fields.join(
      ', '
    )} WHERE name = $${paramIndex} RETURNING *`;

    const { rows } = await db.query(query, values);

    // Recharger les queues dans Asterisk via AMI
    this.reloadQueues();

    return rows[0];
  }

  /**
   * Supprimer une queue
   */
  async deleteQueue(name) {
    const queue = await this.getQueueByName(name);
    if (!queue) {
      throw new Error(`Queue "${name}" introuvable`);
    }

    // Supprimer d'abord tous les membres
    await db.query('DELETE FROM queue_members WHERE queue_name = $1', [name]);

    // Supprimer la queue
    const query = 'DELETE FROM queues WHERE name = $1 RETURNING *';
    const { rows } = await db.query(query, [name]);

    // Recharger les queues dans Asterisk via AMI
    this.reloadQueues();

    return rows[0];
  }

  /**
   * Obtenir les statistiques d'une queue via AMI
   */
  async getQueueStats(name) {
    const queue = await this.getQueueByName(name);
    if (!queue) {
      throw new Error(`Queue "${name}" introuvable`);
    }

    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        // Si AMI non connecté, retourner les données de la DB uniquement
        return resolve({
          queue: queue,
          ami_status: 'disconnected',
          realtime_stats: null,
        });
      }

      amiConfig.executeAction(
        {
          Action: 'QueueStatus',
          Queue: name,
        },
        (err, res) => {
          if (err) {
            console.warn(
              '⚠️  Impossible de récupérer les stats AMI:',
              err.message
            );
            return resolve({
              queue: queue,
              ami_status: 'error',
              realtime_stats: null,
            });
          }

          resolve({
            queue: queue,
            ami_status: 'connected',
            realtime_stats: res,
          });
        }
      );
    });
  }

  /**
   * Recharger les queues dans Asterisk
   */
  reloadQueues() {
    if (!amiConfig.isConnected()) {
      console.warn('⚠️  AMI non connecté, impossible de recharger les queues');
      return;
    }

    amiConfig.executeAction(
      {
        Action: 'Command',
        Command: 'module reload app_queue.so',
      },
      (err, res) => {
        if (err) {
          console.error('❌ Erreur lors du rechargement des queues:', err);
        } else {
          console.log('✅ Queues rechargées dans Asterisk');
        }
      }
    );
  }

  /**
   * API COMPLÈTE ET RÉUTILISABLE
   * GET /api/queues/enriched
   * Récupérer toutes les queues avec enrichissement AMI complet
   * @param {number|null} tenantId - Filtrer par tenant (optionnel)
   * @returns {Promise<Array>} Liste complète des queues avec toutes les données DB + AMI
   */
  async getAllQueuesEnriched(tenantId = null) {
    try {
      // 1. Récupérer les données de base depuis DB
      const queuesFromDB = await this.getAllQueues(tenantId);

      // 2. Récupérer les données AMI complètes
      let queuesFromAMI = {};
      try {
        queuesFromAMI = await this.getAllQueuesFromAMI();
      } catch (err) {
        console.warn('⚠️ AMI non disponible pour enrichissement, données DB uniquement');
      }

      // 3. Enrichir chaque queue avec données AMI étendues
      const enrichedQueues = queuesFromDB.map(queue => {
        const amiData = queuesFromAMI[queue.name] || {};

        // Calculer statistiques étendues
        const calls_waiting = parseInt(amiData.calls || 0);
        const members = amiData.members || [];
        const members_total = members.length;
        const members_available = members.filter(m => m.status === '1' && !m.paused && m.in_call === 0).length;
        const members_in_call = members.filter(m => m.in_call > 0).length;
        const members_paused = members.filter(m => m.paused).length;
        const members_unavailable = members.filter(m => m.status !== '1').length;

        // Calculer le temps d'attente le plus long (estimation)
        const avg_holdtime = parseInt(amiData.holdtime || 0);
        const longest_wait_time = calls_waiting > 0 ? Math.round(avg_holdtime * 1.5) : 0;

        // Déterminer l'état visuel de la queue
        let visual_state = 'idle'; // idle, active, busy, critical
        if (calls_waiting === 0) {
          visual_state = 'idle';
        } else if (calls_waiting <= 2 && longest_wait_time < 60) {
          visual_state = 'active';
        } else if (calls_waiting <= 5 && longest_wait_time < 120) {
          visual_state = 'busy';
        } else {
          visual_state = 'critical';
        }

        // Calculer le taux d'abandon
        const total_calls = (amiData.completed || 0) + (amiData.abandoned || 0);
        const abandonment_rate = total_calls > 0 ? ((amiData.abandoned || 0) / total_calls * 100).toFixed(2) : 0;

        // Calculer l'utilisation des agents
        const agent_utilization = members_total > 0 ? ((members_in_call / members_total) * 100).toFixed(2) : 0;

        return {
          // Données DB de base
          ...queue,

          // Statistiques d'appels AMI
          calls_waiting,
          calls_completed: parseInt(amiData.completed || 0),
          calls_abandoned: parseInt(amiData.abandoned || 0),
          calls_total: total_calls,

          // Temps et performance
          avg_holdtime,
          avg_talktime: parseInt(amiData.talktime || 0),
          longest_wait_time,
          service_level: parseInt(amiData.service_level || 0),
          service_level_perf: parseFloat(amiData.service_level_perf || 0),

          // Métriques calculées
          abandonment_rate: parseFloat(abandonment_rate),
          agent_utilization: parseFloat(agent_utilization),

          // Statistiques membres
          members_total,
          members_available,
          members_in_call,
          members_paused,
          members_unavailable,

          // État visuel
          visual_state, // idle, active, busy, critical

          // Métadonnées AMI
          ami_connected: Object.keys(queuesFromAMI).length > 0,
          ami_data_available: !!amiData.name,

          // Timestamp
          enriched_at: new Date().toISOString(),
        };
      });

      return enrichedQueues;
    } catch (error) {
      console.error('❌ Erreur getAllQueuesEnriched:', error);
      throw error;
    }
  }

  /**
   * API COMPLÈTE ET RÉUTILISABLE
   * GET /api/queues/stats/global
   * Statistiques globales agrégées de toutes les queues
   * @param {number|null} tenantId - Filtrer par tenant (optionnel)
   * @returns {Promise<Object>} Statistiques globales complètes
   */
  async getGlobalQueueStats(tenantId = null) {
    try {
      // Récupérer les queues enrichies
      const enrichedQueues = await this.getAllQueuesEnriched(tenantId);

      // Agréger les statistiques
      const stats = {
        // Compteurs de base
        total_queues: enrichedQueues.length,
        total_calls_waiting: 0,
        total_calls_completed: 0,
        total_calls_abandoned: 0,
        total_calls_handled: 0,

        // Statistiques membres globales
        total_members: 0,
        members_available: 0,
        members_in_call: 0,
        members_paused: 0,
        members_unavailable: 0,

        // Métriques de performance globales
        avg_holdtime_global: 0,
        avg_talktime_global: 0,
        longest_wait_time_global: 0,
        global_abandonment_rate: 0,
        global_agent_utilization: 0,

        // Répartition par état visuel
        queues_idle: 0,
        queues_active: 0,
        queues_busy: 0,
        queues_critical: 0,

        // Queues avec le plus d'appels en attente
        top_busy_queues: [],

        // Métadonnées
        ami_connected: enrichedQueues.length > 0 ? enrichedQueues[0].ami_connected : false,
        calculated_at: new Date().toISOString(),
        tenant_id: tenantId,
      };

      let total_holdtime = 0;
      let total_talktime = 0;
      let queues_with_calls = 0;

      enrichedQueues.forEach(queue => {
        // Appels
        stats.total_calls_waiting += queue.calls_waiting || 0;
        stats.total_calls_completed += queue.calls_completed || 0;
        stats.total_calls_abandoned += queue.calls_abandoned || 0;

        // Membres
        stats.total_members += queue.members_total || 0;
        stats.members_available += queue.members_available || 0;
        stats.members_in_call += queue.members_in_call || 0;
        stats.members_paused += queue.members_paused || 0;
        stats.members_unavailable += queue.members_unavailable || 0;

        // Temps
        if (queue.avg_holdtime > 0) {
          total_holdtime += queue.avg_holdtime;
          queues_with_calls++;
        }
        total_talktime += queue.avg_talktime || 0;

        if (queue.longest_wait_time > stats.longest_wait_time_global) {
          stats.longest_wait_time_global = queue.longest_wait_time;
        }

        // États visuels
        switch (queue.visual_state) {
          case 'idle': stats.queues_idle++; break;
          case 'active': stats.queues_active++; break;
          case 'busy': stats.queues_busy++; break;
          case 'critical': stats.queues_critical++; break;
        }
      });

      // Calculer les totaux et moyennes
      stats.total_calls_handled = stats.total_calls_completed + stats.total_calls_abandoned;
      stats.avg_holdtime_global = queues_with_calls > 0 ? Math.round(total_holdtime / queues_with_calls) : 0;
      stats.avg_talktime_global = enrichedQueues.length > 0 ? Math.round(total_talktime / enrichedQueues.length) : 0;

      if (stats.total_calls_handled > 0) {
        stats.global_abandonment_rate = parseFloat(
          ((stats.total_calls_abandoned / stats.total_calls_handled) * 100).toFixed(2)
        );
      }

      if (stats.total_members > 0) {
        stats.global_agent_utilization = parseFloat(
          ((stats.members_in_call / stats.total_members) * 100).toFixed(2)
        );
      }

      // Top 5 queues avec le plus d'appels en attente
      stats.top_busy_queues = enrichedQueues
        .filter(q => q.calls_waiting > 0)
        .sort((a, b) => b.calls_waiting - a.calls_waiting)
        .slice(0, 5)
        .map(q => ({
          name: q.name,
          calls_waiting: q.calls_waiting,
          longest_wait_time: q.longest_wait_time,
          members_available: q.members_available,
        }));

      return stats;
    } catch (error) {
      console.error('❌ Erreur getGlobalQueueStats:', error);
      throw error;
    }
  }

  /**
   * API COMPLÈTE ET RÉUTILISABLE
   * GET /api/queues/:name/details
   * Détails complets d'une queue spécifique avec toutes les données DB + AMI
   * @param {string} queueName - Nom de la queue
   * @returns {Promise<Object>} Objet complet avec configuration + statistiques + membres
   */
  async getQueueDetailedStats(queueName) {
    try {
      // 1. Récupérer les données DB
      const queueFromDB = await this.getQueueByName(queueName);
      if (!queueFromDB) {
        throw new Error(`Queue "${queueName}" introuvable`);
      }

      // 2. Récupérer le statut AMI complet
      const queueStatus = await this.getQueueStatusFromAMI(queueName);

      // 3. Récupérer les membres enrichis
      const queueMemberService = require('./queueMemberService');
      const members = await queueMemberService.getQueueMembers(queueName);

      // 4. Construire la réponse complète
      const details = {
        // Configuration complète de la queue (DB)
        configuration: {
          name: queueFromDB.name,
          tenant_id: queueFromDB.tenant_id,
          tenant_name: queueFromDB.tenant_name,

          // Paramètres de base
          strategy: queueFromDB.strategy,
          musiconhold: queueFromDB.musiconhold,
          context: queueFromDB.context,
          timeout: queueFromDB.timeout,
          retry: queueFromDB.retry,
          wrapuptime: queueFromDB.wrapuptime,
          maxlen: queueFromDB.maxlen,
          weight: queueFromDB.weight,

          // Annonces
          announce_frequency: queueFromDB.announce_frequency,
          announce_holdtime: queueFromDB.announce_holdtime,
          announce_position: queueFromDB.announce_position,
          announce_round_seconds: queueFromDB.announce_round_seconds,
          periodic_announce: queueFromDB.periodic_announce,
          periodic_announce_frequency: queueFromDB.periodic_announce_frequency,
          min_announce_frequency: queueFromDB.min_announce_frequency,
          random_periodic_announce: queueFromDB.random_periodic_announce,
          relative_periodic_announce: queueFromDB.relative_periodic_announce,

          // Messages sonores
          queue_youarenext: queueFromDB.queue_youarenext,
          queue_thereare: queueFromDB.queue_thereare,
          queue_callswaiting: queueFromDB.queue_callswaiting,
          queue_holdtime: queueFromDB.queue_holdtime,
          queue_minutes: queueFromDB.queue_minutes,
          queue_seconds: queueFromDB.queue_seconds,
          queue_thankyou: queueFromDB.queue_thankyou,
          queue_reporthold: queueFromDB.queue_reporthold,

          // Monitoring
          monitor_type: queueFromDB.monitor_type,
          monitor_format: queueFromDB.monitor_format,

          // Autopause
          autopause: queueFromDB.autopause,
          autopausedelay: queueFromDB.autopausedelay,
          autopausebusy: queueFromDB.autopausebusy,
          autopauseunavail: queueFromDB.autopauseunavail,

          // Paramètres avancés
          servicelevel: queueFromDB.servicelevel,
          joinempty: queueFromDB.joinempty,
          leavewhenempty: queueFromDB.leavewhenempty,
          timeoutrestart: queueFromDB.timeoutrestart,
          ringinuse: queueFromDB.ringinuse,
          autofill: queueFromDB.autofill,
          setinterfacevar: queueFromDB.setinterfacevar,
          setqueueentryvar: queueFromDB.setqueueentryvar,
          setqueuevar: queueFromDB.setqueuevar,
        },

        // Statistiques en temps réel (AMI)
        statistics: {
          calls_waiting: queueStatus.calls || 0,
          calls_completed: queueStatus.completed || 0,
          calls_abandoned: queueStatus.abandoned || 0,
          calls_total: (queueStatus.completed || 0) + (queueStatus.abandoned || 0),

          avg_holdtime: queueStatus.holdtime || 0,
          avg_talktime: queueStatus.talktime || 0,
          service_level: queueStatus.service_level || 0,
          service_level_perf: queueStatus.service_level_perf || 0,

          abandonment_rate:
            ((queueStatus.completed || 0) + (queueStatus.abandoned || 0)) > 0
              ? parseFloat((((queueStatus.abandoned || 0) / ((queueStatus.completed || 0) + (queueStatus.abandoned || 0))) * 100).toFixed(2))
              : 0,
        },

        // Membres de la queue
        members: {
          total: members.length,
          available: members.filter(m => m.status === 'available' && !m.paused && !m.in_call).length,
          in_call: members.filter(m => m.in_call).length,
          paused: members.filter(m => m.paused).length,
          unavailable: members.filter(m => m.status === 'unavailable').length,
          list: members.map(m => ({
            interface: m.interface,
            member_name: m.member_name,
            status: m.status,
            paused: m.paused,
            paused_reason: m.paused_reason || null,
            penalty: m.penalty,
            calls_taken: m.calls_taken || 0,
            last_call: m.last_call || 0,
            in_call: m.in_call || false,
            state_interface: m.state_interface,
          })),
        },

        // État global de la queue
        state: {
          is_active: (queueStatus.calls || 0) > 0,
          has_available_agents: members.filter(m => m.status === 'available' && !m.paused).length > 0,
          can_accept_calls:
            members.filter(m => m.status === 'available' && !m.paused).length > 0 &&
            (queueFromDB.maxlen === 0 || (queueStatus.calls || 0) < queueFromDB.maxlen),
          visual_state: this._calculateVisualState(queueStatus.calls || 0, queueStatus.holdtime || 0),
        },

        // Métadonnées
        meta: {
          ami_connected: !!queueStatus.name,
          retrieved_at: new Date().toISOString(),
        },
      };

      return details;
    } catch (error) {
      console.error(`❌ Erreur getQueueDetailedStats pour "${queueName}":`, error);
      throw error;
    }
  }

  /**
   * Méthode utilitaire pour calculer l'état visuel
   * @private
   */
  _calculateVisualState(callsWaiting, avgHoldtime) {
    if (callsWaiting === 0) return 'idle';
    if (callsWaiting <= 2 && avgHoldtime < 60) return 'active';
    if (callsWaiting <= 5 && avgHoldtime < 120) return 'busy';
    return 'critical';
  }

  /**
   * API COMPLÈTE ET RÉUTILISABLE
   * POST /api/queues/:name/reload
   * Recharger une queue spécifique dans Asterisk
   * @param {string} queueName - Nom de la queue à recharger
   * @returns {Promise<Object>} Résultat du rechargement
   */
  async reloadSpecificQueue(queueName) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      // Vérifier que la queue existe
      db.query('SELECT name FROM queues WHERE name = $1', [queueName])
        .then(result => {
          if (result.rows.length === 0) {
            return reject(new Error(`Queue "${queueName}" introuvable`));
          }

          // Recharger la queue spécifique via CLI
          amiConfig.executeAction(
            {
              Action: 'Command',
              Command: `queue reload ${queueName}`,
            },
            (err, res) => {
              if (err) {
                console.error(`❌ Erreur reload queue "${queueName}":`, err);
                return reject(err);
              }

              console.log(`✅ Queue "${queueName}" rechargée`);
              resolve({
                success: true,
                queue_name: queueName,
                message: 'Queue rechargée avec succès',
                response: res,
                reloaded_at: new Date().toISOString(),
              });
            }
          );
        })
        .catch(reject);
    });
  }

  /**
   * API COMPLÈTE ET RÉUTILISABLE
   * GET /api/queues/:name/calls
   * Récupérer les appels en attente dans une queue (si disponible via AMI)
   * @param {string} queueName - Nom de la queue
   * @returns {Promise<Object>} Liste des appels en attente avec détails
   */
  async getQueueCalls(queueName) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      const calls = [];
      const actionId = `${Date.now()}`;
      let queueFound = false;

      const eventHandler = (event) => {
        if (event.actionid !== actionId) return;

        if (event.event === 'QueueEntry') {
          if (event.queue === queueName) {
            queueFound = true;
            calls.push({
              position: parseInt(event.position || 0),
              channel: event.channel,
              caller_id_num: event.calleridnum,
              caller_id_name: event.calleridname,
              wait_time: parseInt(event.wait || 0),
              priority: parseInt(event.priority || 0),
            });
          }
        } else if (event.event === 'QueueStatusComplete') {
          amiConfig.ami.removeListener('managerevent', eventHandler);

          if (!queueFound) {
            return reject(new Error(`Queue "${queueName}" non trouvée ou aucun appel en attente`));
          }

          resolve({
            queue_name: queueName,
            calls_count: calls.length,
            calls: calls.sort((a, b) => a.position - b.position),
            retrieved_at: new Date().toISOString(),
          });
        }
      };

      amiConfig.ami.on('managerevent', eventHandler);

      amiConfig.executeAction(
        {
          Action: 'QueueStatus',
          Queue: queueName,
          ActionID: actionId,
        },
        (err, response) => {
          if (err) {
            amiConfig.ami.removeListener('managerevent', eventHandler);
            return reject(err);
          }
        }
      );

      // Timeout
      setTimeout(() => {
        amiConfig.ami.removeListener('managerevent', eventHandler);
        if (calls.length === 0 && !queueFound) {
          resolve({
            queue_name: queueName,
            calls_count: 0,
            calls: [],
            message: 'Aucun appel en attente',
            retrieved_at: new Date().toISOString(),
          });
        } else {
          resolve({
            queue_name: queueName,
            calls_count: calls.length,
            calls: calls.sort((a, b) => a.position - b.position),
            retrieved_at: new Date().toISOString(),
          });
        }
      }, 5000);
    });
  }
}

module.exports = new QueueService();
