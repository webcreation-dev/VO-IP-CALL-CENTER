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
   * Statistiques des appels enrichies avec données temps réel AMI
   */
  async getCallStatistics(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      // Stats historiques depuis DB
      const stats = await statisticsService.getCallStatistics(filters);

      // Enrichir avec appels actifs temps réel
      let activeCalls = 0;
      let activeChannels = [];

      try {
        activeChannels = await statisticsService.getActiveChannels();
        // Compter les canaux actifs (chaque appel = 2 canaux généralement)
        activeCalls = activeChannels.length > 0 ? Math.ceil(activeChannels.length / 2) : 0;
      } catch (amiErr) {
        console.warn('⚠️ Impossible de récupérer les canaux actifs AMI:', amiErr.message);
      }

      return success(res, {
        ...stats,
        active_calls_now: activeCalls,  // ✅ TEMPS RÉEL
        active_channels: activeChannels.length,  // ✅ TEMPS RÉEL
        data_source: activeCalls > 0 ? 'hybrid' : 'database'
      }, 'Statistiques des appels');
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
   * Résumé rapide (version light du dashboard) enrichi avec données temps réel AMI
   */
  async getSummary(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 derniers jours par défaut
        end_date: req.query.end_date || new Date().toISOString().split('T')[0]
      };

      // Statistiques essentielles (historique DB)
      const callStats = await statisticsService.getCallStatistics(filters);
      const endpointStats = await statisticsService.getEndpointStatistics({ tenant_id: filters.tenant_id });

      // Compter les queues directement depuis la table
      const db = require('../../db');
      const queuesCount = await db.query('SELECT COUNT(*) as count FROM queues');
      const totalQueues = parseInt(queuesCount.rows[0].count);

      // Données temps réel AMI
      let activeChannels = [];
      let activeCalls = 0;

      try {
        activeChannels = await statisticsService.getActiveChannels();
        // Compter les canaux actifs (chaque appel = 2 canaux généralement)
        activeCalls = activeChannels.length > 0 ? Math.ceil(activeChannels.length / 2) : 0;
      } catch (amiErr) {
        console.warn('⚠️ Impossible de récupérer les canaux actifs AMI:', amiErr.message);
      }

      return success(res, {
        calls: {
          total: callStats.total_calls,
          answered: callStats.answered_calls,
          answer_rate: callStats.answer_rate_percent,
          active_now: activeCalls,  // ✅ TEMPS RÉEL
          data_source: 'hybrid'
        },
        queues: totalQueues,
        endpoints: endpointStats.total_endpoints,
        endpoints_registered: endpointStats.registered_endpoints || endpointStats.registered_endpoints_ami || 0,  // ✅ TEMPS RÉEL
        period: {
          start: filters.start_date,
          end: filters.end_date
        },
        data_source: endpointStats.data_source || 'database'
      }, 'Résumé des statistiques');
    } catch (err) {
      console.error('❌ Erreur getSummary:', err);
      next(err);
    }
  }
}

module.exports = new StatisticsController();