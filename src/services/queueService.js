const db = require('../../db');
const amiConfig = require('../config/ami');

/**
 * Service pour la gestion des queues (files d'attente)
 */
class QueueService {
  /**
   * Récupérer toutes les queues avec leurs membres
   */
  async getAllQueues(tenantId = null) {
    let query = `
      SELECT 
        q.name,
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
    return rows;
  }

  /**
   * Récupérer une queue par nom
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
    return rows[0] || null;
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
        setinterfacevar, setqueuevar, autofill
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
}

module.exports = new QueueService();
