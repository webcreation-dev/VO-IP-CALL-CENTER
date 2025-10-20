const express = require('express');
const router = express.Router();
const endpointController = require('../controllers/endpointController');

/**
 * Routes pour la gestion des endpoints PJSIP
 * Base URL: /api/endpoints
 */

// GET /api/endpoints - Liste tous les endpoints
// Query params: ?tenant_id=1
router.get('/', endpointController.getAllEndpoints.bind(endpointController));

// GET /api/endpoints/:id - Détails d'un endpoint
router.get('/:id', endpointController.getEndpointById.bind(endpointController));

// GET /api/endpoints/:id/status - Statut d'enregistrement
router.get('/:id/status', endpointController.getEndpointStatus.bind(endpointController));

// POST /api/endpoints - Créer un endpoint
router.post('/', endpointController.createEndpoint.bind(endpointController));

// PUT /api/endpoints/:id - Modifier un endpoint
router.put('/:id', endpointController.updateEndpoint.bind(endpointController));

// DELETE /api/endpoints/:id - Supprimer un endpoint
router.delete('/:id', endpointController.deleteEndpoint.bind(endpointController));

module.exports = router;