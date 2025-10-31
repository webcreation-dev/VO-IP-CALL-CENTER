const cdrService = require('../services/cdrService');
const { success, error, notFound } = require('../utils/response');

/**
 * Contrôleur pour la gestion des CDR
 */
class CdrController {
  /**
   * GET /api/cdr
   * Récupérer tous les CDR avec pagination et filtres
   */
  async getAllCdr(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        disposition: req.query.disposition,
        src: req.query.src,
        dst: req.query.dst,
        has_recording: req.query.has_recording,
        page: req.query.page || 1,
        limit: req.query.limit || 50,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order
      };

      const result = await cdrService.getAllCdr(filters);
      
      return res.status(200).json({
        success: true,
        message: `${result.data.length} CDR trouvé(s)`,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      console.error('❌ Erreur getAllCdr:', err);
      next(err);
    }
  }

  /**
   * GET /api/cdr/:id
   * Récupérer un CDR par ID
   */
  async getCdrById(req, res, next) {
    try {
      const { id } = req.params;
      const cdr = await cdrService.getCdrById(id);

      if (!cdr) {
        return notFound(res, `CDR avec l'ID ${id} introuvable`);
      }

      return success(res, cdr, 'CDR trouvé');
    } catch (err) {
      console.error('❌ Erreur getCdrById:', err);
      next(err);
    }
  }

  /**
   * GET /api/cdr/stats/global
   * Obtenir les statistiques globales
   */
  async getGlobalStats(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await cdrService.getGlobalStats(filters);
      return success(res, stats, 'Statistiques globales');
    } catch (err) {
      console.error('❌ Erreur getGlobalStats:', err);
      next(err);
    }
  }

  /**
   * GET /api/cdr/stats/tenant/:tenantId
   * Obtenir les statistiques par tenant
   */
  async getStatsByTenant(req, res, next) {
    try {
      const { tenantId } = req.params;
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        group_by: req.query.group_by
      };

      const stats = await cdrService.getStatsByTenant(tenantId, filters);
      return success(res, stats, `Statistiques pour le tenant ${tenantId}`);
    } catch (err) {
      console.error('❌ Erreur getStatsByTenant:', err);
      next(err);
    }
  }

  /**
   * GET /api/cdr/stats/queues
   * Obtenir les statistiques des queues
   */
  async getQueueStats(req, res, next) {
    try {
      const filters = {
        queue_name: req.query.queue_name,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await cdrService.getQueueStats(filters);
      return success(res, stats, 'Statistiques des queues');
    } catch (err) {
      console.error('❌ Erreur getQueueStats:', err);
      next(err);
    }
  }

  /**
   * GET /api/cdr/export/csv
   * Exporter les CDR en CSV
   */
  async exportCsv(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        disposition: req.query.disposition
      };

      const csv = await cdrService.exportCdr(filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cdr_export_${Date.now()}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('❌ Erreur exportCsv:', err);
      next(err);
    }
  }
}

module.exports = new CdrController();