const db = require('../../db');
const amiConfig = require('../config/ami');

/**
 * Service pour la gestion des membres de queues (agents)
 */
class QueueMemberService {
  /**
   * Récupérer tous les membres d'une queue
   */
  async getQueueMembers(queueName) {
    const query = `
      SELECT
        qm.queue_name,
        qm.interface,
        qm.uniqueid,
        qm.membername,
        qm.penalty,
        qm.paused,
        qm.state_interface,
        qm.tenant_id,
        e.id as endpoint_id,
        e.context as endpoint_context
      FROM queue_members qm
      LEFT JOIN ps_endpoints e ON qm.interface = CONCAT('PJSIP/', e.id)
      WHERE qm.queue_name = $1
      ORDER BY qm.penalty, qm.membername
    `;

    const { rows } = await db.query(query, [queueName]);

    // Enrichir avec le statut temps réel depuis AMI
    if (!amiConfig.isConnected()) {
      console.warn('⚠️ AMI non connecté - retour des données DB uniquement');
      return rows.map(row => ({
        ...row,
        status: '5', // Unavailable par défaut
        available: false,
        data_source: 'database',
        warning: 'AMI non disponible - statuts non mis à jour',
      }));
    }

    try {
      const ami = amiConfig.ami;
      const memberStatuses = {};
      const actionId = `${Date.now()}`; // ActionID simplifié

      // Attendre les événements AMI
      const queueStatus = await new Promise((resolve, reject) => {
        const eventHandler = (event) => {
          if (event.actionid !== actionId) return;

          if (event.event === 'QueueMember') {
            const memberInterface = event.location || event.interface;
            memberStatuses[memberInterface] = {
              status: event.status, // 1=Available, 2=In Use, 5=Unavailable
              paused: parseInt(event.paused) === 1,
              callstaken: event.callstaken,
              lastcall: event.lastcall,
              in_call: parseInt(event.incall || '0'),
            };
          } else if (event.event === 'QueueStatusComplete') {
            // Fin des événements
            ami.removeListener('managerevent', eventHandler);
            resolve(memberStatuses);
          }
        };

        // Attacher le listener
        ami.on('managerevent', eventHandler);

        // Envoyer l'action
        amiConfig.executeAction(
          { Action: 'QueueStatus', Queue: queueName, ActionID: actionId },
          (err, response) => {
            if (err) {
              ami.removeListener('managerevent', eventHandler);
              return reject(err);
            }
          }
        );

        // Timeout de sécurité
        setTimeout(() => {
          ami.removeListener('managerevent', eventHandler);
          resolve(memberStatuses);
        }, 5000);
      });

      // Merge le statut AMI avec les données DB
      return rows.map(member => {
        const amiStatus = memberStatuses[member.interface];
        if (amiStatus) {
          return {
            ...member,
            status: amiStatus.status,
            available: amiStatus.status === '1', // 1 = Available
            paused: amiStatus.paused,
            calls_taken: amiStatus.callstaken,
            last_call: amiStatus.lastcall,
            in_call: amiStatus.in_call,
            data_source: 'hybrid',
          };
        }
        return {
          ...member,
          status: '5', // Unavailable par défaut
          available: false,
          data_source: 'database',
          warning: 'Membre non trouvé dans Asterisk',
        };
      });

    } catch (err) {
      console.warn('⚠️ Erreur lors de la récupération du statut AMI:', err.message);
      return rows.map(row => ({
        ...row,
        status: '5',
        available: false,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${err.message}`,
      }));
    }
  }

  /**
   * Vérifier si un membre existe dans une queue
   */
  async memberExists(queueName, memberInterface) {
    const query =
      'SELECT * FROM queue_members WHERE queue_name = $1 AND interface = $2';
    const { rows } = await db.query(query, [queueName, memberInterface]);
    return rows.length > 0;
  }

  /**
   * Ajouter un membre à une queue
   */
  async addMember(queueName, data) {
    const {
      interface: memberInterface,
      membername,
      penalty = 0,
      paused = 0,
      state_interface = null,
    } = data;

    // Validation
    if (!memberInterface) {
      throw new Error("L'interface du membre est requise (ex: PJSIP/101)");
    }

    // Vérifier si la queue existe et récupérer son tenant_id
    const queueCheck = await db.query(
      'SELECT name, tenant_id FROM queues WHERE name = $1',
      [queueName]
    );
    if (queueCheck.rows.length === 0) {
      throw new Error(`Queue "${queueName}" introuvable`);
    }
    const queueTenantId = queueCheck.rows[0].tenant_id;

    // Vérifier si le membre existe déjà
    if (await this.memberExists(queueName, memberInterface)) {
      throw new Error(
        `Le membre ${memberInterface} est déjà dans la queue "${queueName}"`
      );
    }

    // Générer un uniqueid global (unique pour toute la table, pas juste la queue)
    const uniqueidResult = await db.query(
      'SELECT COALESCE(MAX(CAST(uniqueid AS INTEGER)), 0) + 1 as next_id FROM queue_members'
    );
    const uniqueid = uniqueidResult.rows[0].next_id;

    const query = `
      INSERT INTO queue_members (
        queue_name, interface, uniqueid, membername, penalty, paused, state_interface, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      queueName,
      memberInterface,
      uniqueid.toString(),
      membername || memberInterface,
      penalty,
      paused,
      state_interface,
      queueTenantId,
    ];

    const { rows } = await db.query(query, values);

    // Ajouter le membre via AMI
    this.addMemberViaAMI(queueName, memberInterface, membername);

    return rows[0];
  }

  /**
   * Retirer un membre d'une queue
   */
  async removeMember(queueName, memberInterface) {
    // Vérifier si le membre existe
    if (!(await this.memberExists(queueName, memberInterface))) {
      throw new Error(
        `Le membre ${memberInterface} n'est pas dans la queue "${queueName}"`
      );
    }

    const query =
      'DELETE FROM queue_members WHERE queue_name = $1 AND interface = $2 RETURNING *';
    const { rows } = await db.query(query, [queueName, memberInterface]);

    // Retirer le membre via AMI
    this.removeMemberViaAMI(queueName, memberInterface);

    return rows[0];
  }

  /**
   * Mettre un membre en pause
   */
  async pauseMember(queueName, memberInterface, reason = 'Pause manuelle') {
    if (!(await this.memberExists(queueName, memberInterface))) {
      throw new Error(
        `Le membre ${memberInterface} n'est pas dans la queue "${queueName}"`
      );
    }

    // Vérifier la connexion AMI AVANT de modifier la DB
    if (!amiConfig.isConnected()) {
      throw new Error('AMI non connecté - impossible de mettre en pause le membre dans Asterisk');
    }

    // Mettre en pause via AMI en premier
    try {
      await this.pauseMemberViaAMI(queueName, memberInterface, true, reason);
    } catch (amiErr) {
      throw new Error(`Erreur AMI lors de la mise en pause: ${amiErr.message}`);
    }

    // Si AMI réussit, mettre à jour la DB
    const query = `
      UPDATE queue_members
      SET paused = 1
      WHERE queue_name = $1 AND interface = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [queueName, memberInterface]);

    return {
      ...rows[0],
      data_source: 'hybrid',
      ami_updated: true,
    };
  }

  /**
   * Reprendre un membre (annuler la pause)
   */
  async unpauseMember(queueName, memberInterface) {
    if (!(await this.memberExists(queueName, memberInterface))) {
      throw new Error(
        `Le membre ${memberInterface} n'est pas dans la queue "${queueName}"`
      );
    }

    // Vérifier la connexion AMI AVANT de modifier la DB
    if (!amiConfig.isConnected()) {
      throw new Error('AMI non connecté - impossible de reprendre le membre dans Asterisk');
    }

    // Reprendre via AMI en premier
    try {
      await this.pauseMemberViaAMI(queueName, memberInterface, false);
    } catch (amiErr) {
      throw new Error(`Erreur AMI lors de la reprise: ${amiErr.message}`);
    }

    // Si AMI réussit, mettre à jour la DB
    const query = `
      UPDATE queue_members
      SET paused = 0
      WHERE queue_name = $1 AND interface = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [queueName, memberInterface]);

    return {
      ...rows[0],
      data_source: 'hybrid',
      ami_updated: true,
    };
  }

  /**
   * Modifier la priorité (penalty) d'un membre
   */
  async updateMemberPenalty(queueName, memberInterface, penalty) {
    if (!(await this.memberExists(queueName, memberInterface))) {
      throw new Error(
        `Le membre ${memberInterface} n'est pas dans la queue "${queueName}"`
      );
    }

    // Vérifier la connexion AMI AVANT de modifier la DB
    if (!amiConfig.isConnected()) {
      throw new Error('AMI non connecté - impossible de modifier la priorité du membre dans Asterisk');
    }

    // Mettre à jour via AMI en premier
    try {
      await this.updateMemberPenaltyViaAMI(queueName, memberInterface, penalty);
    } catch (amiErr) {
      throw new Error(`Erreur AMI lors de la modification de la priorité: ${amiErr.message}`);
    }

    // Si AMI réussit, mettre à jour la DB
    const query = `
      UPDATE queue_members
      SET penalty = $1
      WHERE queue_name = $2 AND interface = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [
      penalty,
      queueName,
      memberInterface,
    ]);

    return {
      ...rows[0],
      data_source: 'hybrid',
      ami_updated: true,
    };
  }

  // ==========================================
  // Méthodes AMI
  // ==========================================

  addMemberViaAMI(queueName, memberInterface, membername) {
    if (!amiConfig.isConnected()) {
      console.warn('⚠️  AMI non connecté');
      return;
    }

    amiConfig.executeAction(
      {
        Action: 'QueueAdd',
        Queue: queueName,
        Interface: memberInterface,
        MemberName: membername || memberInterface,
        Penalty: 0,
        Paused: 0,
      },
      (err, res) => {
        if (err) {
          console.error('❌ Erreur AMI QueueAdd:', err);
        } else {
          console.log(
            `✅ Membre ${memberInterface} ajouté à ${queueName} via AMI`
          );
        }
      }
    );
  }

  removeMemberViaAMI(queueName, memberInterface) {
    if (!amiConfig.isConnected()) {
      console.warn('⚠️  AMI non connecté');
      return;
    }

    amiConfig.executeAction(
      {
        Action: 'QueueRemove',
        Queue: queueName,
        Interface: memberInterface,
      },
      (err, res) => {
        if (err) {
          console.error('❌ Erreur AMI QueueRemove:', err);
        } else {
          console.log(
            `✅ Membre ${memberInterface} retiré de ${queueName} via AMI`
          );
        }
      }
    );
  }

  pauseMemberViaAMI(queueName, memberInterface, paused, reason = '') {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction(
        {
          Action: 'QueuePause',
          Queue: queueName,
          Interface: memberInterface,
          Paused: paused ? 'true' : 'false',
          Reason: reason,
        },
        (err, res) => {
          if (err) {
            console.error('❌ Erreur AMI QueuePause:', err);
            return reject(err);
          }
          console.log(
            `✅ Membre ${memberInterface} ${
              paused ? 'mis en pause' : 'repris'
            } dans ${queueName} via AMI`
          );
          resolve(res);
        }
      );
    });
  }

  updateMemberPenaltyViaAMI(queueName, memberInterface, penalty) {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return reject(new Error('AMI non connecté'));
      }

      amiConfig.executeAction(
        {
          Action: 'QueuePenalty',
          Queue: queueName,
          Interface: memberInterface,
          Penalty: penalty,
        },
        (err, res) => {
          if (err) {
            console.error('❌ Erreur AMI QueuePenalty:', err);
            return reject(err);
          }
          console.log(
            `✅ Priorité de ${memberInterface} modifiée à ${penalty} dans ${queueName} via AMI`
          );
          resolve(res);
        }
      );
    });
  }
}

module.exports = new QueueMemberService();
