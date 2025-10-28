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
        e.id as endpoint_id,
        e.context as endpoint_context
      FROM queue_members qm
      LEFT JOIN ps_endpoints e ON qm.interface = CONCAT('PJSIP/', e.id)
      WHERE qm.queue_name = $1
      ORDER BY qm.penalty, qm.membername
    `;

    const { rows } = await db.query(query, [queueName]);

    // Enrichir avec le statut temps réel depuis AMI
    if (amiConfig.isConnected()) {
      try {
        const queueStatus = await new Promise((resolve, reject) => {
          amiConfig.executeAction(
            { Action: 'QueueStatus', Queue: queueName },
            (err, response) => {
              if (err) return reject(err);
              resolve(response);
              resolve(response);
              console.log(
                '🔍 DEBUG AMI QueueStatus:',
                JSON.stringify(queueStatus, null, 2)
              );
            }
          );
        });

        // Parser les événements AMI pour extraire le statut de chaque membre
        const memberStatuses = {};
        if (queueStatus && queueStatus.events) {
          queueStatus.events.forEach(event => {
            if (event.event === 'QueueMember') {
              const memberInterface = event.location || event.interface;
              memberStatuses[memberInterface] = {
                status: event.status, // 1=Available, 2=In Use, 5=Unavailable
                paused: parseInt(event.paused) === 1,
                callstaken: event.callstaken,
                lastcall: event.lastcall,
              };
            }
          });
        }

        // Merge le statut AMI avec les données DB
        rows.forEach(member => {
          const amiStatus = memberStatuses[member.interface];
          if (amiStatus) {
            member.status = amiStatus.status;
            member.available = amiStatus.status === '1'; // 1 = Available
            member.paused = amiStatus.paused;
          } else {
            member.status = '5'; // Unavailable par défaut
            member.available = false;
          }
        });
      } catch (err) {
        console.warn('⚠️ Impossible de récupérer le statut AMI:', err.message);
      }
    }

    return rows;
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

    // Vérifier si la queue existe
    const queueCheck = await db.query(
      'SELECT name FROM queues WHERE name = $1',
      [queueName]
    );
    if (queueCheck.rows.length === 0) {
      throw new Error(`Queue "${queueName}" introuvable`);
    }

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
        queue_name, interface, uniqueid, membername, penalty, paused, state_interface
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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

    const query = `
      UPDATE queue_members 
      SET paused = 1 
      WHERE queue_name = $1 AND interface = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [queueName, memberInterface]);

    // Mettre en pause via AMI
    this.pauseMemberViaAMI(queueName, memberInterface, true, reason);

    return rows[0];
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

    const query = `
      UPDATE queue_members 
      SET paused = 0 
      WHERE queue_name = $1 AND interface = $2
      RETURNING *
    `;

    const { rows } = await db.query(query, [queueName, memberInterface]);

    // Reprendre via AMI
    this.pauseMemberViaAMI(queueName, memberInterface, false);

    return rows[0];
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

    // Mettre à jour via AMI
    this.updateMemberPenaltyViaAMI(queueName, memberInterface, penalty);

    return rows[0];
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
    if (!amiConfig.isConnected()) {
      console.warn('⚠️  AMI non connecté');
      return;
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
        } else {
          console.log(
            `✅ Membre ${memberInterface} ${
              paused ? 'mis en pause' : 'repris'
            } dans ${queueName} via AMI`
          );
        }
      }
    );
  }

  updateMemberPenaltyViaAMI(queueName, memberInterface, penalty) {
    if (!amiConfig.isConnected()) {
      console.warn('⚠️  AMI non connecté');
      return;
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
        } else {
          console.log(
            `✅ Priorité de ${memberInterface} modifiée à ${penalty} dans ${queueName} via AMI`
          );
        }
      }
    );
  }
}

module.exports = new QueueMemberService();
