const tenantService = require('../services/tenantService');
const { success, created, error, notFound } = require('../utils/response');

/**
 * Contrôleur pour la gestion des tenants
 */
class TenantController {
  /**
   * GET /api/tenants
   * Récupérer tous les tenants
   */
  async getAllTenants(req, res, next) {
    try {
      const tenants = await tenantService.getAllTenants();
      return success(res, tenants, `${tenants.length} tenant(s) trouvé(s)`);
    } catch (err) {
      console.error('❌ Erreur getAllTenants:', err);
      next(err);
    }
  }

  /**
   * GET /api/tenants/:id
   * Récupérer un tenant par ID
   */
  async getTenantById(req, res, next) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.getTenantById(id);

      if (!tenant) {
        return notFound(res, `Tenant avec l'ID ${id} introuvable`);
      }

      return success(res, tenant, 'Tenant trouvé');
    } catch (err) {
      console.error('❌ Erreur getTenantById:', err);
      next(err);
    }
  }

  /**
   * POST /api/tenants
   * Créer un nouveau tenant
   */
  async createTenant(req, res, next) {
    try {
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return error(res, 'Le nom du tenant est requis', 400);
      }

      const tenant = await tenantService.createTenant(name.trim());
      return created(res, tenant, `Tenant "${tenant.name}" créé avec succès`);
    } catch (err) {
      console.error('❌ Erreur createTenant:', err);
      
      if (err.message.includes('existe déjà')) {
        return error(res, err.message, 409);
      }
      
      next(err);
    }
  }

  /**
   * PUT /api/tenants/:id
   * Mettre à jour un tenant
   */
  async updateTenant(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === '') {
        return error(res, 'Le nom du tenant est requis', 400);
      }

      const tenant = await tenantService.updateTenant(id, name.trim());
      return success(res, tenant, `Tenant "${tenant.name}" mis à jour avec succès`);
    } catch (err) {
      console.error('❌ Erreur updateTenant:', err);
      
      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }
      
      if (err.message.includes('utilise déjà')) {
        return error(res, err.message, 409);
      }
      
      next(err);
    }
  }

  /**
   * DELETE /api/tenants/:id
   * Supprimer un tenant
   */
  async deleteTenant(req, res, next) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.deleteTenant(id);
      return success(res, tenant, `Tenant "${tenant.name}" supprimé avec succès`);
    } catch (err) {
      console.error('❌ Erreur deleteTenant:', err);
      
      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }
      
      if (err.message.includes('Impossible de supprimer')) {
        return error(res, err.message, 409);
      }
      
      next(err);
    }
  }

  /**
   * GET /api/tenants/:id/stats
   * Obtenir les statistiques d'un tenant
   */
  async getTenantStats(req, res, next) {
    try {
      const { id } = req.params;
      const stats = await tenantService.getTenantStats(id);
      return success(res, stats, 'Statistiques du tenant');
    } catch (err) {
      console.error('❌ Erreur getTenantStats:', err);
      
      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }
      
      next(err);
    }
  }
}

module.exports = new TenantController();