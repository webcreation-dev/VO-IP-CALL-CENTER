const statisticsService = require('../services/statisticsService');
const { success, error } = require('../utils/response');

/**
 * Contrôleur pour les statistiques avancées
 */
class StatisticsController {
  /**
   * GET /api/statistics/dashboard
   * Dashboard complet avec toutes les statistiques
   */
  async getDashboard(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const dashboard = await statisticsService.getDashboard(filters);
      return success(res, dashboard, 'Dashboard des statistiques');
    } catch (err) {
      console.error('❌ Erreur getDashboard:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/calls
   * Statistiques des appels
   */
  async getCallStatistics(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await statisticsService.getCallStatistics(filters);
      return success(res, stats, 'Statistiques des appels');
    } catch (err) {
      console.error('❌ Erreur getCallStatistics:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/queues
   * Statistiques des queues
   */
  async getQueueStatistics(req, res, next) {
    try {
      const filters = {
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await statisticsService.getQueueStatistics(filters);
      return success(res, stats, 'Statistiques des queues');
    } catch (err) {
      console.error('❌ Erreur getQueueStatistics:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/endpoints
   * Statistiques des endpoints
   */
  async getEndpointStatistics(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id
      };

      const stats = await statisticsService.getEndpointStatistics(filters);
      return success(res, stats, 'Statistiques des endpoints');
    } catch (err) {
      console.error('❌ Erreur getEndpointStatistics:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/recordings
   * Statistiques des enregistrements
   */
  async getRecordingStatistics(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await statisticsService.getRecordingStatistics(filters);
      return success(res, stats, 'Statistiques des enregistrements');
    } catch (err) {
      console.error('❌ Erreur getRecordingStatistics:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/top-callers
   * Top appelants
   */
  async getTopCallers(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit || 10
      };

      const topCallers = await statisticsService.getTopCallers(filters);
      return success(res, topCallers, 'Top appelants');
    } catch (err) {
      console.error('❌ Erreur getTopCallers:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/top-called
   * Top appelés
   */
  async getTopCalled(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        limit: req.query.limit || 10
      };

      const topCalled = await statisticsService.getTopCalled(filters);
      return success(res, topCalled, 'Top numéros appelés');
    } catch (err) {
      console.error('❌ Erreur getTopCalled:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/active-channels
   * Appels actifs en temps réel
   */
  async getActiveChannels(req, res, next) {
    try {
      const channels = await statisticsService.getActiveChannels();
      return success(res, channels, 'Canaux actifs');
    } catch (err) {
      console.error('❌ Erreur getActiveChannels:', err);
      
      if (err.message && err.message.includes('AMI')) {
        return error(res, 'AMI non disponible', 503);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/statistics/trend
   * Évolution des appels par période
   */
  async getCallsTrend(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        group_by: req.query.group_by || 'day' // day, hour, week, month
      };

      const trend = await statisticsService.getCallsTrend(filters);
      return success(res, trend, 'Évolution des appels');
    } catch (err) {
      console.error('❌ Erreur getCallsTrend:', err);
      next(err);
    }
  }

  /**
   * GET /api/statistics/summary
   * Résumé rapide (version light du dashboard)
   */
  async getSummary(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 derniers jours par défaut
        end_date: req.query.end_date || new Date().toISOString().split('T')[0]
      };

      // Statistiques essentielles uniquement
      const callStats = await statisticsService.getCallStatistics(filters);
      const queueStats = await statisticsService.getQueueStatistics(filters);
      const endpointStats = await statisticsService.getEndpointStatistics({ tenant_id: filters.tenant_id });

      return success(res, {
        calls: {
          total: callStats.total_calls,
          answered: callStats.answered_calls,
          answer_rate: callStats.answer_rate_percent
        },
        queues: queueStats.length,
        endpoints: endpointStats.total_endpoints,
        period: {
          start: filters.start_date,
          end: filters.end_date
        }
      }, 'Résumé des statistiques');
    } catch (err) {
      console.error('❌ Erreur getSummary:', err);
      next(err);
    }
  }
}

module.exports = new StatisticsController();