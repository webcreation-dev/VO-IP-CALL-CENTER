const endpointService = require('../services/endpointService');
const { success, created, error, notFound } = require('../utils/response');

/**
 * Contrôleur pour la gestion des endpoints PJSIP
 */
class EndpointController {
  /**
   * GET /api/endpoints
   * GET /api/endpoints?tenant_id=1
   * Récupérer tous les endpoints
   */
  async getAllEndpoints(req, res, next) {
    try {
      const { tenant_id } = req.query;
      const endpoints = await endpointService.getAllEndpoints(tenant_id || null);
      return success(res, endpoints, `${endpoints.length} endpoint(s) trouvé(s)`);
    } catch (err) {
      console.error('❌ Erreur getAllEndpoints:', err);
      next(err);
    }
  }

  /**
   * GET /api/endpoints/:id
   * Récupérer un endpoint par ID
   */
  async getEndpointById(req, res, next) {
    try {
      const { id } = req.params;
      const endpoint = await endpointService.getEndpointById(id);

      if (!endpoint) {
        return notFound(res, `Endpoint "${id}" introuvable`);
      }

      return success(res, endpoint, 'Endpoint trouvé');
    } catch (err) {
      console.error('❌ Erreur getEndpointById:', err);
      next(err);
    }
  }

  /**
   * POST /api/endpoints
   * Créer un nouveau endpoint
   */
  async createEndpoint(req, res, next) {
    try {
      const data = req.body;

      // Validation basique
      if (!data.id || !data.tenant_id || !data.password || !data.context) {
        return error(
          res,
          'Les champs id, tenant_id, password et context sont requis',
          400
        );
      }

      const endpoint = await endpointService.createEndpoint(data);
      return created(res, endpoint, `Endpoint "${endpoint.id}" créé avec succès`);
    } catch (err) {
      console.error('❌ Erreur createEndpoint:', err);

      if (err.message.includes('existe déjà')) {
        return error(res, err.message, 409);
      }

      if (err.message.includes("n'existe pas")) {
        return error(res, err.message, 404);
      }

      next(err);
    }
  }

  /**
   * PUT /api/endpoints/:id
   * Mettre à jour un endpoint
   */
  async updateEndpoint(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;

      const endpoint = await endpointService.updateEndpoint(id, data);
      return success(res, endpoint, `Endpoint "${id}" mis à jour avec succès`);
    } catch (err) {
      console.error('❌ Erreur updateEndpoint:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * DELETE /api/endpoints/:id
   * Supprimer un endpoint
   */
  async deleteEndpoint(req, res, next) {
    try {
      const { id } = req.params;
      const endpoint = await endpointService.deleteEndpoint(id);
      return success(res, endpoint, `Endpoint "${id}" supprimé avec succès`);
    } catch (err) {
      console.error('❌ Erreur deleteEndpoint:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * GET /api/endpoints/:id/status
   * Obtenir le statut d'enregistrement d'un endpoint
   */
  async getEndpointStatus(req, res, next) {
    try {
      const { id } = req.params;
      const status = await endpointService.getEndpointStatus(id);
      return success(res, status, 'Statut de l\'endpoint');
    } catch (err) {
      console.error('❌ Erreur getEndpointStatus:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }
}

module.exports = new EndpointController();