const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

/**
 * Routes pour la gestion des tenants
 * Base URL: /api/tenants
 */

// GET /api/tenants - Liste tous les tenants
router.get('/', tenantController.getAllTenants.bind(tenantController));

// GET /api/tenants/:id - Détails d'un tenant
router.get('/:id', tenantController.getTenantById.bind(tenantController));

// GET /api/tenants/:id/stats - Statistiques d'un tenant
router.get('/:id/stats', tenantController.getTenantStats.bind(tenantController));

// POST /api/tenants - Créer un tenant
router.post('/', tenantController.createTenant.bind(tenantController));

// PUT /api/tenants/:id - Modifier un tenant
router.put('/:id', tenantController.updateTenant.bind(tenantController));

// DELETE /api/tenants/:id - Supprimer un tenant
router.delete('/:id', tenantController.deleteTenant.bind(tenantController));

module.exports = router;