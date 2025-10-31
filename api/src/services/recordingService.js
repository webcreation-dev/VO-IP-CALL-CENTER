const db = require('../../db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Service pour la gestion des enregistrements audio
 */
class RecordingService {
  /**
   * Récupérer tous les enregistrements avec pagination
   */
  async getAllRecordings(filters = {}) {
    const {
      tenant_id,
      start_date,
      end_date,
      src,
      dst,
      page = 1,
      limit = 50
    } = filters;

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

    if (src) {
      conditions.push(`src ILIKE $${paramIndex++}`);
      params.push(`%${src}%`);
    }

    if (dst) {
      conditions.push(`dst ILIKE $${paramIndex++}`);
      params.push(`%${dst}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Compter le total
    const countQuery = `SELECT COUNT(*) as total FROM call_recordings ${whereClause}`;
    const { rows: countRows } = await db.query(countQuery, params);
    const total = parseInt(countRows[0].total);

    // Récupérer les données
    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const dataQuery = `
      SELECT 
        cr.*,
        c.disposition,
        c.calldate,
        t.name as tenant_name
      FROM call_recordings cr
      LEFT JOIN cdr c ON cr.uniqueid = c.uniqueid
      LEFT JOIN tenants t ON cr.tenant_id = t.id
      ${whereClause}
      ORDER BY cr.created_at DESC
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
   * Récupérer un enregistrement par ID
   */
  async getRecordingById(id) {
    const query = `
      SELECT 
        cr.*,
        c.src as caller,
        c.dst as called,
        c.disposition,
        c.calldate,
        c.duration as call_duration,
        t.name as tenant_name
      FROM call_recordings cr
      LEFT JOIN cdr c ON cr.uniqueid = c.uniqueid
      LEFT JOIN tenants t ON cr.tenant_id = t.id
      WHERE cr.id = $1 AND cr.is_deleted = FALSE
    `;

    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Créer un enregistrement
   */
  async createRecording(data) {
    const {
      tenant_id,
      uniqueid,
      filename,
      filepath,
      filesize,
      format,
      duration,
      src,
      dst,
      notes
    } = data;

    const query = `
      INSERT INTO call_recordings (
        tenant_id, uniqueid, filename, filepath, filesize,
        format, duration, src, dst, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      tenant_id, uniqueid, filename, filepath, filesize,
      format, duration, src, dst, notes
    ];

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Mettre à jour un enregistrement
   */
  async updateRecording(id, data) {
    const recording = await this.getRecordingById(id);
    if (!recording) {
      throw new Error(`Enregistrement avec l'ID ${id} introuvable`);
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (fields.length === 0) {
      throw new Error('Aucun champ à mettre à jour');
    }

    values.push(id);
    const query = `UPDATE call_recordings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Supprimer un enregistrement (soft delete)
   */
  async deleteRecording(id) {
    const recording = await this.getRecordingById(id);
    if (!recording) {
      throw new Error(`Enregistrement avec l'ID ${id} introuvable`);
    }

    const query = `
      UPDATE call_recordings 
      SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  /**
   * Obtenir le chemin du fichier audio
   */
  async getRecordingFilePath(id) {
    const recording = await this.getRecordingById(id);
    if (!recording) {
      throw new Error(`Enregistrement avec l'ID ${id} introuvable`);
    }

    // Vérifier si le fichier existe
    try {
      await fs.access(recording.filepath);
      return recording.filepath;
    } catch (err) {
      throw new Error(`Fichier audio introuvable: ${recording.filepath}`);
    }
  }

  /**
   * Obtenir les statistiques des enregistrements
   */
  async getRecordingStats(filters = {}) {
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
        COALESCE(ROUND(AVG(duration)), 0) as avg_duration_seconds,
        COALESCE(SUM(duration), 0) as total_duration_seconds,
        COUNT(DISTINCT format) as format_count
      FROM call_recordings
      ${whereClause}
    `;

    const { rows } = await db.query(query, params);
    
    const stats = rows[0];
    stats.total_size_mb = (parseInt(stats.total_size_bytes) / (1024 * 1024)).toFixed(2);
    stats.total_size_gb = (parseInt(stats.total_size_bytes) / (1024 * 1024 * 1024)).toFixed(2);

    return stats;
  }
}

module.exports = new RecordingService();