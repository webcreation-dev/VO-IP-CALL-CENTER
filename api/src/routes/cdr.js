const express = require('express');
const router = express.Router();
const cdrController = require('../controllers/cdrController');

/**
 * Routes pour la gestion des CDR
 * Base URL: /api/cdr
 */

// Routes statistiques (avant les routes avec :id pour éviter les conflits)
router.get('/stats/global', cdrController.getGlobalStats.bind(cdrController));
router.get('/stats/tenant/:tenantId', cdrController.getStatsByTenant.bind(cdrController));
router.get('/stats/queues', cdrController.getQueueStats.bind(cdrController));
router.get('/export/csv', cdrController.exportCsv.bind(cdrController));

// Routes principales
router.get('/', cdrController.getAllCdr.bind(cdrController));
router.get('/:id', cdrController.getCdrById.bind(cdrController));

module.exports = router;