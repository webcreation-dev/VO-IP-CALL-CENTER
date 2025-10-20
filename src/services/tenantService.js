const db = require('../../db');

/**
 * Service pour la gestion des tenants
 */
class TenantService {
  /**
   * Récupérer tous les tenants
   */
  async getAllTenants() {
    const query = `
      SELECT 
        id, 
        name, 
        created_at
      FROM tenants 
      ORDER BY id DESC
    `;

    const { rows } = await db.query(query);
    return rows;
  }

  /**
   * Récupérer un tenant par ID
   */
  async getTenantById(id) {
    const query = `
      SELECT 
        id, 
        name, 
        created_at
      FROM tenants 
      WHERE id = $1
    `;

    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Récupérer un tenant par nom
   */
  async getTenantByName(name) {
    const query = 'SELECT * FROM tenants WHERE name = $1';
    const { rows } = await db.query(query, [name]);
    return rows[0] || null;
  }

  /**
   * Créer un nouveau tenant
   */
  async createTenant(name) {
    // Vérifier si le tenant existe déjà
    const existing = await this.getTenantByName(name);
    if (existing) {
      throw new Error(`Un tenant avec le nom "${name}" existe déjà`);
    }

    const query = `
      INSERT INTO tenants (name) 
      VALUES ($1) 
      RETURNING id, name, created_at
    `;

    const { rows } = await db.query(query, [name]);
    return rows[0];
  }

  /**
   * Mettre à jour un tenant
   */
  async updateTenant(id, name) {
    // Vérifier si le tenant existe
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant avec l'ID ${id} introuvable`);
    }

    // Vérifier si le nouveau nom n'est pas déjà utilisé par un autre tenant
    const existingWithName = await this.getTenantByName(name);
    if (existingWithName && existingWithName.id !== parseInt(id)) {
      throw new Error(`Un autre tenant utilise déjà le nom "${name}"`);
    }

    const query = `
      UPDATE tenants 
      SET name = $1 
      WHERE id = $2 
      RETURNING id, name, created_at
    `;

    const { rows } = await db.query(query, [name, id]);
    return rows[0];
  }

  /**
   * Supprimer un tenant
   * ATTENTION : Cette opération supprime aussi tous les endpoints, queues, etc. associés
   */
  async deleteTenant(id) {
    // Vérifier si le tenant existe
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant avec l'ID ${id} introuvable`);
    }

    // Vérifier s'il y a des dépendances (désactivé pour l'instant)
    // TODO: Réactiver quand PostgreSQL sera connecté
    // if (tenant.endpoint_count > 0 || tenant.queue_count > 0) {
    //   throw new Error(
    //     `Impossible de supprimer le tenant "${tenant.name}". ` +
    //     `Il contient ${tenant.endpoint_count} endpoint(s) et ${tenant.queue_count} queue(s). ` +
    //     `Supprimez d'abord ces éléments.`
    //   );
    // }

    const query = 'DELETE FROM tenants WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  /**
   * Obtenir les statistiques d'un tenant
   */
  async getTenantStats(id) {
    const tenant = await this.getTenantById(id);
    if (!tenant) {
      throw new Error(`Tenant avec l'ID ${id} introuvable`);
    }

    // Statistiques des appels (si la table cdr existe)
    const statsQuery = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE disposition = 'ANSWERED') as answered_calls,
        COUNT(*) FILTER (WHERE disposition = 'NO ANSWER') as missed_calls,
        COUNT(*) FILTER (WHERE disposition = 'BUSY') as busy_calls,
        COALESCE(SUM(billsec), 0) as total_duration_seconds,
        COALESCE(AVG(billsec) FILTER (WHERE disposition = 'ANSWERED'), 0) as avg_duration_seconds
      FROM cdr 
      WHERE tenant_id = $1
        AND calldate >= CURRENT_DATE - INTERVAL '30 days'
    `;

    try {
      const { rows } = await db.query(statsQuery, [id]);
      return {
        tenant,
        stats: rows[0],
      };
    } catch (err) {
      // Si la table cdr n'a pas de colonne tenant_id, retourner juste le tenant
      console.warn('Impossible de récupérer les stats CDR:', err.message);
      return {
        tenant,
        stats: null,
      };
    }
  }
}

module.exports = new TenantService();
