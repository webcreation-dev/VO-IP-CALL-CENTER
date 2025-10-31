const express = require('express');
const router = express.Router();
const endpointController = require('../controllers/endpointController');

/**
 * Routes pour la gestion des endpoints PJSIP
 * Base URL: /api/endpoints
 */

// NOUVELLE ROUTE - GET /api/endpoints/enriched - Liste avec détails AMI complets
// Query params: ?tenant_id=1
router.get('/enriched', endpointController.getAllEndpointsEnriched.bind(endpointController));

// GET /api/endpoints - Liste tous les endpoints (route existante)
// Query params: ?tenant_id=1
router.get('/', endpointController.getAllEndpoints.bind(endpointController));

// NOUVELLE ROUTE - GET /api/endpoints/:id/details - Détails AMI complets
router.get('/:id/details', endpointController.getEndpointDetails.bind(endpointController));

// NOUVELLE ROUTE - POST /api/endpoints/:id/disconnect - Forcer déconnexion
router.post('/:id/disconnect', endpointController.forceDisconnect.bind(endpointController));

// GET /api/endpoints/:id/status - Statut d'enregistrement (route existante)
router.get('/:id/status', endpointController.getEndpointStatus.bind(endpointController));

// GET /api/endpoints/:id - Détails d'un endpoint (route existante)
router.get('/:id', endpointController.getEndpointById.bind(endpointController));

// POST /api/endpoints - Créer un endpoint
router.post('/', endpointController.createEndpoint.bind(endpointController));

// PUT /api/endpoints/:id - Modifier un endpoint
router.put('/:id', endpointController.updateEndpoint.bind(endpointController));

// DELETE /api/endpoints/:id - Supprimer un endpoint
router.delete('/:id', endpointController.deleteEndpoint.bind(endpointController));

module.exports = router;