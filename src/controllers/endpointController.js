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
   * Champs requis: tenant_id, password
   * Champs optionnels: id (généré auto si absent), transport, context (récupéré du tenant si absent)
   */
  async createEndpoint(req, res, next) {
    try {
      const data = req.body;

      // Validation minimale (id et context sont maintenant optionnels)
      if (!data.tenant_id || !data.password) {
        return error(
          res,
          'Les champs tenant_id et password sont requis',
          400
        );
      }

      const endpoint = await endpointService.createEndpoint(data);
      return created(
        res,
        endpoint,
        `Endpoint "${endpoint.id}" créé avec succès${!data.id ? ' (extension générée automatiquement)' : ''}`
      );
    } catch (err) {
      console.error('❌ Erreur createEndpoint:', err);

      if (err.message.includes('existe déjà')) {
        return error(res, err.message, 409);
      }

      if (err.message.includes("n'existe pas") || err.message.includes("n'a pas de context")) {
        return error(res, err.message, 404);
      }

      if (err.message.includes('Plus d\'extensions disponibles')) {
        return error(res, err.message, 507); // Insufficient Storage
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
   * 
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

  /**
   * NOUVELLE ROUTE - GET /api/endpoints/enriched
   * GET /api/endpoints/enriched?tenant_id=1
   * Récupérer tous les endpoints ENRICHIS avec détails AMI complets
   * (IP, User-Agent, Latence, etc.)
   */
  async getAllEndpointsEnriched(req, res, next) {
    try {
      const { tenant_id } = req.query;

      // 1. Récupérer les endpoints de base (comme avant)
      const endpoints = await endpointService.getAllEndpoints(tenant_id || null);

      // 2. Enrichir avec les détails complets AMI
      const enrichedEndpoints = await endpointService.enrichEndpointsWithFullDetails(endpoints);

      return success(
        res,
        enrichedEndpoints,
        `${enrichedEndpoints.length} endpoint(s) enrichi(s)`
      );
    } catch (err) {
      console.error('❌ Erreur getAllEndpointsEnriched:', err);
      next(err);
    }
  }

  /**
   * NOUVELLE ROUTE - GET /api/endpoints/:id/details
   * Récupérer les détails complets AMI d'un endpoint spécifique
   */
  async getEndpointDetails(req, res, next) {
    try {
      const { id } = req.params;

      // Vérifier que l'endpoint existe en DB
      const endpoint = await endpointService.getEndpointById(id);
      if (!endpoint) {
        return notFound(res, `Endpoint "${id}" introuvable`);
      }

      // Récupérer les détails AMI
      const details = await endpointService.getEndpointDetailsFromAMI(id);

      return success(res, {
        ...endpoint,
        ami_details: details
      }, 'Détails complets de l\'endpoint');
    } catch (err) {
      console.error('❌ Erreur getEndpointDetails:', err);

      if (err.message.includes('introuvable') || err.message.includes('non trouvé')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * POST /api/endpoints/:id/disconnect
   * Forcer la déconnexion d'un endpoint
   */
  async forceDisconnect(req, res, next) {
    try {
      const { id } = req.params;

      const result = await endpointService.forceDisconnect(id);
      return success(res, result, `Endpoint "${id}" déconnecté avec succès`);
    } catch (err) {
      console.error('❌ Erreur forceDisconnect:', err);

      if (err.message.includes('introuvable') || err.message.includes('non trouvé')) {
        return notFound(res, err.message);
      }

      if (err.message.includes('AMI non connecté')) {
        return error(res, err.message, 503);
      }

      next(err);
    }
  }
}

module.exports = new EndpointController();