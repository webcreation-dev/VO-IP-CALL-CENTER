const queueService = require('../services/queueService');
const queueMemberService = require('../services/queueMemberService');
const { success, created, error, notFound } = require('../utils/response');

/**
 * Contrôleur pour la gestion des queues
 */
class QueueController {
  /**
   * GET /api/queues
   * GET /api/queues?tenant_id=1
   */
  async getAllQueues(req, res, next) {
    try {
      const { tenant_id } = req.query;
      const queues = await queueService.getAllQueues(tenant_id || null);
      return success(res, queues, `${queues.length} queue(s) trouvée(s)`);
    } catch (err) {
      console.error('❌ Erreur getAllQueues:', err);
      next(err);
    }
  }

  /**
   * GET /api/queues/:name
   */
  async getQueueByName(req, res, next) {
    try {
      const { name } = req.params;
      const queue = await queueService.getQueueByName(name);

      if (!queue) {
        return notFound(res, `Queue "${name}" introuvable`);
      }

      return success(res, queue, 'Queue trouvée');
    } catch (err) {
      console.error('❌ Erreur getQueueByName:', err);
      next(err);
    }
  }

  /**
   * POST /api/queues
   */
  async createQueue(req, res, next) {
    try {
      const data = req.body;

      if (!data.name) {
        return error(res, 'Le nom de la queue est requis', 400);
      }

      const queue = await queueService.createQueue(data);
      return created(res, queue, `Queue "${queue.name}" créée avec succès`);
    } catch (err) {
      console.error('❌ Erreur createQueue:', err);

      if (err.message.includes('existe déjà')) {
        return error(res, err.message, 409);
      }

      next(err);
    }
  }

  /**
   * PUT /api/queues/:name
   */
  async updateQueue(req, res, next) {
    try {
      const { name } = req.params;
      const data = req.body;

      const queue = await queueService.updateQueue(name, data);
      return success(res, queue, `Queue "${name}" mise à jour avec succès`);
    } catch (err) {
      console.error('❌ Erreur updateQueue:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      if (err.message.includes('Aucun champ')) {
        return error(res, err.message, 400);
      }

      next(err);
    }
  }

  /**
   * DELETE /api/queues/:name
   */
  async deleteQueue(req, res, next) {
    try {
      const { name } = req.params;
      const queue = await queueService.deleteQueue(name);
      return success(res, queue, `Queue "${name}" supprimée avec succès`);
    } catch (err) {
      console.error('❌ Erreur deleteQueue:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * GET /api/queues/:name/stats
   */
  async getQueueStats(req, res, next) {
    try {
      const { name } = req.params;
      const stats = await queueService.getQueueStats(name);
      return success(res, stats, 'Statistiques de la queue');
    } catch (err) {
      console.error('❌ Erreur getQueueStats:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * GET /api/queues/:queueName/members
   */
  async getQueueMembers(req, res, next) {
    try {
      const { queueName } = req.params;
      const members = await queueMemberService.getQueueMembers(queueName);
      return success(res, members, `${members.length} membre(s) dans la queue`);
    } catch (err) {
      console.error('❌ Erreur getQueueMembers:', err);
      next(err);
    }
  }

  /**
   * POST /api/queues/:queueName/members
   */
  async addMember(req, res, next) {
    try {
      const { queueName } = req.params;
      const data = req.body;

      if (!data.interface) {
        return error(res, 'L\'interface du membre est requise (ex: PJSIP/101)', 400);
      }

      const member = await queueMemberService.addMember(queueName, data);
      return created(res, member, `Membre ${member.interface} ajouté à la queue "${queueName}"`);
    } catch (err) {
      console.error('❌ Erreur addMember:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      if (err.message.includes('déjà dans')) {
        return error(res, err.message, 409);
      }

      next(err);
    }
  }

  /**
   * DELETE /api/queues/:queueName/members/:interface
   */
  async removeMember(req, res, next) {
    try {
      const { queueName, interface: memberInterface } = req.params;
      // Décoder l'interface (au cas où elle contient des caractères spéciaux)
      const decodedInterface = decodeURIComponent(memberInterface);
      
      const member = await queueMemberService.removeMember(queueName, decodedInterface);
      return success(res, member, `Membre ${decodedInterface} retiré de la queue "${queueName}"`);
    } catch (err) {
      console.error('❌ Erreur removeMember:', err);

      if (err.message.includes('n\'est pas dans')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * PUT /api/queues/:queueName/members/:interface/pause
   */
  async pauseMember(req, res, next) {
    try {
      const { queueName, interface: memberInterface } = req.params;
      const { reason } = req.body;
      const decodedInterface = decodeURIComponent(memberInterface);

      const member = await queueMemberService.pauseMember(queueName, decodedInterface, reason);
      return success(res, member, `Membre ${decodedInterface} mis en pause dans la queue "${queueName}"`);
    } catch (err) {
      console.error('❌ Erreur pauseMember:', err);

      if (err.message.includes('n\'est pas dans')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * PUT /api/queues/:queueName/members/:interface/unpause
   */
  async unpauseMember(req, res, next) {
    try {
      const { queueName, interface: memberInterface } = req.params;
      const decodedInterface = decodeURIComponent(memberInterface);

      const member = await queueMemberService.unpauseMember(queueName, decodedInterface);
      return success(res, member, `Membre ${decodedInterface} repris dans la queue "${queueName}"`);
    } catch (err) {
      console.error('❌ Erreur unpauseMember:', err);

      if (err.message.includes('n\'est pas dans')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * PUT /api/queues/:queueName/members/:interface/penalty
   */
  async updateMemberPenalty(req, res, next) {
    try {
      const { queueName, interface: memberInterface } = req.params;
      const { penalty } = req.body;
      const decodedInterface = decodeURIComponent(memberInterface);

      if (penalty === undefined || penalty === null) {
        return error(res, 'La priorité (penalty) est requise', 400);
      }

      const member = await queueMemberService.updateMemberPenalty(queueName, decodedInterface, penalty);
      return success(res, member, `Priorité du membre ${decodedInterface} modifiée à ${penalty}`);
    } catch (err) {
      console.error('❌ Erreur updateMemberPenalty:', err);

      if (err.message.includes('n\'est pas dans')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }
}

module.exports = new QueueController();