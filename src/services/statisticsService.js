const db = require('../../db');
const amiConfig = require('../config/ami');

/**
 * Service pour les statistiques avancées
 */
class StatisticsService {
  /**
   * Dashboard complet avec toutes les statistiques
   */
  async getDashboard(filters = {}) {
    const { tenant_id, start_date, end_date } = filters;

    // Statistiques globales des appels
    const callStats = await this.getCallStatistics({ tenant_id, start_date, end_date });
    
    // Statistiques des queues
    const queueStats = await this.getQueueStatistics({ start_date, end_date });
    
    // Statistiques des endpoints
    const endpointStats = await this.getEndpointStatistics({ tenant_id });
    
    // Statistiques des enregistrements
    const recordingStats = await this.getRecordingStatistics({ tenant_id, start_date, end_date });
    
    // Top appelants
    const topCallers = await this.getTopCallers({ tenant_id, start_date, end_date, limit: 10 });
    
    // Top appelés
    const topCalled = await this.getTopCalled({ tenant_id, start_date, end_date, limit: 10 });

    // Appels en temps réel (via AMI si connecté)
    let activeChannels = [];
    if (amiConfig.isConnected()) {
      try {
        activeChannels = await this.getActiveChannels();
      } catch (err) {
        console.warn('⚠️  Impossible de récupérer les canaux actifs:', err.message);
      }
    }

    return {
      call_statistics: callStats,
      queue_statistics: queueStats,
      endpoint_statistics: endpointStats,
      recording_statistics: recordingStats,
      top_callers: topCallers,
      top_called: topCalled,
      active_channels: activeChannels,
      generated_at: new Date().toISOString()
    };
  }

  /**
   * Statistiques des appels
   */
  async getCallStatistics(filters = {}) {
    const { tenant_id, start_date, end_date } = filters;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`calldate >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`calldate <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END) as answered_calls,
        COUNT(CASE WHEN disposition = 'NO ANSWER' THEN 1 END) as no_answer_calls,
        COUNT(CASE WHEN disposition = 'BUSY' THEN 1 END) as busy_calls,
        COUNT(CASE WHEN disposition = 'FAILED' THEN 1 END) as failed_calls,
        COALESCE(SUM(duration), 0) as total_duration_seconds,
        COALESCE(SUM(billsec), 0) as total_billable_seconds,
        COALESCE(ROUND(AVG(duration)), 0) as avg_duration_seconds,
        COALESCE(ROUND(AVG(billsec)), 0) as avg_billable_seconds,
        ROUND(
          (COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
          2
        ) as answer_rate_percent,
        COUNT(DISTINCT DATE(calldate)) as days_with_calls
      FROM cdr
      ${whereClause}
    `;

    const { rows } = await db.query(query, params);
    
    const stats = rows[0];
    
    // Convertir en heures et minutes
    stats.total_duration_hours = Math.floor(parseInt(stats.total_duration_seconds) / 3600);
    stats.total_duration_minutes = Math.floor((parseInt(stats.total_duration_seconds) % 3600) / 60);
    stats.total_billable_hours = Math.floor(parseInt(stats.total_billable_seconds) / 3600);
    stats.total_billable_minutes = Math.floor((parseInt(stats.total_billable_seconds) % 3600) / 60);

    return stats;
  }

  /**
   * Statistiques des queues
   */
  async getQueueStatistics(filters = {}) {
    const { start_date, end_date } = filters;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (start_date) {
      conditions.push(`call_date >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`call_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        queue_name,
        SUM(total_calls) as total_calls,
        SUM(answered_calls) as answered_calls,
        SUM(abandoned_calls) as abandoned_calls,
        ROUND(AVG(avg_wait_time_seconds), 0) as avg_wait_time_seconds,
        MAX(max_wait_time_seconds) as max_wait_time_seconds,
        ROUND(
          (SUM(answered_calls)::DECIMAL / NULLIF(SUM(total_calls), 0)) * 100, 
          2
        ) as service_level_percent
      FROM v_queue_statistics
      ${whereClause}
      GROUP BY queue_name
      ORDER BY total_calls DESC
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  /**
   * Compter les endpoints enregistrés depuis Asterisk via AMI
   */
  async getRegisteredEndpointsFromAMI() {
    return new Promise((resolve, reject) => {
      amiConfig.executeAction(
        {
          Action: 'PJSIPShowEndpoints',
        },
        (err, response) => {
          if (err) {
            return reject(err);
          }

          let registeredCount = 0;
          if (response && response.events) {
            response.events.forEach(event => {
              if (event.event === 'EndpointList' || event.objecttype === 'endpoint') {
                const deviceState = event.devicestate || event.DeviceState;
                // Compter comme enregistré si le device state n'est pas Unavailable ou Unknown
                if (deviceState && deviceState !== 'Unavailable' && deviceState !== 'Unknown') {
                  registeredCount++;
                }
              }
            });
          }

          resolve(registeredCount);
        }
      );
    });
  }

  /**
   * Statistiques des endpoints (enrichi avec AMI)
   */
  async getEndpointStatistics(filters = {}) {
    const { tenant_id } = filters;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        COUNT(*) as total_endpoints,
        COUNT(CASE WHEN webrtc = 'yes' THEN 1 END) as webrtc_endpoints,
        COUNT(CASE WHEN webrtc = 'no' THEN 1 END) as sip_endpoints,
        (SELECT COUNT(*) FROM ps_contacts) as registered_endpoints_db,
        COUNT(DISTINCT context) as unique_contexts
      FROM ps_endpoints
      ${whereClause}
    `;

    const { rows } = await db.query(query, params);
    const dbStats = rows[0];

    // Enrichir avec AMI si disponible
    if (!amiConfig.isConnected()) {
      return {
        ...dbStats,
        registered_endpoints: dbStats.registered_endpoints_db,
        data_source: 'database',
        warning: 'AMI non disponible - compteur d\'enregistrements potentiellement obsolète',
      };
    }

    try {
      // Utiliser le service endpoint qui fonctionne bien
      const endpointService = require('./endpointService');
      const amiEndpoints = await endpointService.getAllEndpointsFromAMI();

      // Compter combien sont enregistrés (device_state !== 'Unavailable')
      const registeredCount = Object.values(amiEndpoints).filter(
        ep => ep.device_state && ep.device_state !== 'Unavailable' && ep.device_state !== 'Unknown'
      ).length;

      return {
        ...dbStats,
        registered_endpoints: registeredCount,
        registered_endpoints_ami: registeredCount,
        data_source: 'hybrid',
      };

    } catch (amiErr) {
      console.warn('⚠️ Erreur AMI pour les statistiques endpoints:', amiErr.message);
      return {
        ...dbStats,
        registered_endpoints: dbStats.registered_endpoints_db,
        data_source: 'database_fallback',
        warning: `Erreur AMI: ${amiErr.message}`,
      };
    }
  }

  /**
   * Statistiques des enregistrements
   */
  async getRecordingStatistics(filters = {}) {
    const { tenant_id, start_date, end_date } = filters;
    
    const conditions = ['is_deleted = FALSE'];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        COUNT(*) as total_recordings,
        COALESCE(SUM(filesize), 0) as total_size_bytes,
        COALESCE(SUM(duration), 0) as total_duration_seconds
      FROM call_recordings
      ${whereClause}
    `;

    const { rows } = await db.query(query, params);
    
    const stats = rows[0];
    stats.total_size_mb = (parseInt(stats.total_size_bytes) / (1024 * 1024)).toFixed(2);
    stats.total_size_gb = (parseInt(stats.total_size_bytes) / (1024 * 1024 * 1024)).toFixed(3);
    
    return stats;
  }

  /**
   * Top appelants
   */
  async getTopCallers(filters = {}) {
    const { tenant_id, start_date, end_date, limit = 10 } = filters;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`calldate >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`calldate <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);

    const query = `
      SELECT 
        src as caller,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END) as answered_calls,
        SUM(billsec) as total_duration_seconds
      FROM cdr
      ${whereClause}
      GROUP BY src
      ORDER BY total_calls DESC
      LIMIT $${paramIndex++}
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  /**
   * Top appelés
   */
  async getTopCalled(filters = {}) {
    const { tenant_id, start_date, end_date, limit = 10 } = filters;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`calldate >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`calldate <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);

    const query = `
      SELECT 
        dst as called,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END) as answered_calls,
        SUM(billsec) as total_duration_seconds
      FROM cdr
      ${whereClause}
      GROUP BY dst
      ORDER BY total_calls DESC
      LIMIT $${paramIndex++}
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  /**
   * Appels actifs via AMI
   */
  async getActiveChannels() {
    return new Promise((resolve, reject) => {
      if (!amiConfig.isConnected()) {
        return resolve([]);
      }

      amiConfig.executeAction({
        Action: 'CoreShowChannels',
      }, (err, res) => {
        if (err) {
          return reject(err);
        }
        
        // Parser la réponse AMI pour extraire les canaux
        resolve(res);
      });
    });
  }

  /**
   * Évolution des appels par période
   */
  async getCallsTrend(filters = {}) {
    const { tenant_id, start_date, end_date, group_by = 'day' } = filters;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`calldate >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`calldate <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Groupement selon la période
    let dateGroup = 'DATE(calldate)';
    if (group_by === 'hour') {
      dateGroup = "DATE_TRUNC('hour', calldate)";
    } else if (group_by === 'week') {
      dateGroup = "DATE_TRUNC('week', calldate)";
    } else if (group_by === 'month') {
      dateGroup = "DATE_TRUNC('month', calldate)";
    }

    const query = `
      SELECT 
        ${dateGroup} as period,
        COUNT(*) as total_calls,
        COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END) as answered_calls,
        COUNT(CASE WHEN disposition = 'NO ANSWER' THEN 1 END) as no_answer_calls,
        SUM(billsec) as total_duration_seconds
      FROM cdr
      ${whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 30
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }
}

module.exports = new StatisticsService();