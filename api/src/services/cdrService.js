const db = require('../../db');

/**
 * Service pour la gestion des CDR (Call Detail Records)
 */
class CdrService {
  /**
   * Récupérer les CDR avec pagination et filtres
   */
  async getAllCdr(filters = {}) {
    const {
      tenant_id,
      start_date,
      end_date,
      disposition,
      src,
      dst,
      has_recording,
      page = 1,
      limit = 50,
      sort_by = 'start_time',
      sort_order = 'DESC'
    } = filters;

    // Construction de la requête avec filtres
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }

    if (start_date) {
      conditions.push(`start_time >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`start_time <= $${paramIndex++}`);
      params.push(end_date);
    }

    if (disposition) {
      conditions.push(`disposition = $${paramIndex++}`);
      params.push(disposition);
    }

    if (src) {
      conditions.push(`caller ILIKE $${paramIndex++}`);
      params.push(`%${src}%`);
    }

    if (dst) {
      conditions.push(`called ILIKE $${paramIndex++}`);
      params.push(`%${dst}%`);
    }

    if (has_recording !== undefined) {
      if (has_recording === 'true' || has_recording === true) {
        conditions.push(`has_recording = 'OUI'`);
      } else {
        conditions.push(`has_recording = 'NON'`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Compter le total
    const countQuery = `SELECT COUNT(*) as total FROM v_call_history ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].total);

    // Récupérer les données paginées
    const offset = (page - 1) * limit;
    const allowedSortFields = ['start_time', 'end_time', 'total_duration', 'billable_duration', 'disposition'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'start_time';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM v_call_history 
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const { rows } = await db.query(dataQuery, params);

    return {
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Récupérer un CDR par ID
   */
  async getCdrById(id) {
    const query = 'SELECT * FROM v_call_history WHERE cdr_id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Récupérer un CDR par uniqueid
   */
  async getCdrByUniqueid(uniqueid) {
    const query = 'SELECT * FROM v_call_history WHERE uniqueid = $1';
    const { rows } = await db.query(query, [uniqueid]);
    return rows[0] || null;
  }

  /**
   * Obtenir les statistiques globales
   */
  async getGlobalStats(filters = {}) {
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
        COUNT(DISTINCT src) as unique_callers,
        COUNT(DISTINCT dst) as unique_destinations,
        ROUND(
          (COUNT(CASE WHEN disposition = 'ANSWERED' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
          2
        ) as answer_rate_percent
      FROM cdr
      ${whereClause}
    `;

    const { rows } = await db.query(query, params);
    return rows[0];
  }

  /**
   * Obtenir les statistiques par tenant
   */
  async getStatsByTenant(tenantId, filters = {}) {
    const { start_date, end_date, group_by = 'day' } = filters;

    const conditions = [`tenant_id = $1`];
    const params = [tenantId];
    let paramIndex = 2;

    if (start_date) {
      conditions.push(`call_date >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`call_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT * FROM v_call_statistics
      ${whereClause}
      ORDER BY call_date DESC
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  /**
   * Obtenir les statistiques des queues
   */
  async getQueueStats(filters = {}) {
    const { queue_name, start_date, end_date } = filters;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (queue_name) {
      conditions.push(`queue_name = $${paramIndex++}`);
      params.push(queue_name);
    }

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
      SELECT * FROM v_queue_statistics
      ${whereClause}
      ORDER BY call_date DESC
    `;

    const { rows } = await db.query(query, params);
    return rows;
  }

  /**
   * Exporter les CDR en CSV
   */
  async exportCdr(filters = {}) {
    const { data } = await this.getAllCdr({ ...filters, limit: 10000 });
    
    // Créer le CSV
    const headers = [
      'ID', 'Date/Heure', 'Appelant', 'Appelé', 'Contexte',
      'Durée Totale', 'Durée Facturable', 'Disposition', 'Enregistrement'
    ];

    const rows = data.map(record => [
      record.cdr_id,
      record.start_time,
      record.caller,
      record.called,
      record.context,
      record.total_duration,
      record.billable_duration,
      record.disposition,
      record.has_recording
    ]);

    // Convertir en CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

module.exports = new CdrService();