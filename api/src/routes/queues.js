const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

/**
 * Routes pour la gestion des queues
 * Base URL: /api/queues
 */

// ===== NOUVELLES ROUTES API COMPLÈTES ET RÉUTILISABLES =====
// IMPORTANT: Les routes spécifiques doivent venir AVANT les routes avec paramètres

// GET /api/queues/enriched?tenant_id=1 - Liste enrichie avec toutes les stats AMI
router.get('/enriched', queueController.getAllQueuesEnriched.bind(queueController));

// GET /api/queues/stats/global?tenant_id=1 - Statistiques globales agrégées
router.get('/stats/global', queueController.getGlobalQueueStats.bind(queueController));

// ===== ROUTES EXISTANTES =====

// Routes pour les queues
router.get('/', queueController.getAllQueues.bind(queueController));

// GET /api/queues/:name/details - Détails complets (config + stats + membres)
router.get('/:name/details', queueController.getQueueDetailedStats.bind(queueController));

// POST /api/queues/:name/reload - Recharger une queue spécifique
router.post('/:name/reload', queueController.reloadQueue.bind(queueController));

// GET /api/queues/:name/calls - Appels en attente dans la queue
router.get('/:name/calls', queueController.getQueueCalls.bind(queueController));

// GET /api/queues/:name/stats - Statistiques d'une queue (route existante)
router.get('/:name/stats', queueController.getQueueStats.bind(queueController));

// GET /api/queues/:name - Détails d'une queue (route existante)
router.get('/:name', queueController.getQueueByName.bind(queueController));

router.post('/', queueController.createQueue.bind(queueController));
router.put('/:name', queueController.updateQueue.bind(queueController));
router.delete('/:name', queueController.deleteQueue.bind(queueController));

// Routes pour les membres des queues

// GET /api/queues/:queueName/members/enriched - Liste enrichie des membres avec infos endpoint
router.get('/:queueName/members/enriched', queueController.getQueueMembersEnriched.bind(queueController));

// GET /api/queues/:queueName/members - Liste des membres (route existante)
router.get('/:queueName/members', queueController.getQueueMembers.bind(queueController));

router.post('/:queueName/members', queueController.addMember.bind(queueController));
router.delete('/:queueName/members/:interface', queueController.removeMember.bind(queueController));
router.put('/:queueName/members/:interface/pause', queueController.pauseMember.bind(queueController));
router.put('/:queueName/members/:interface/unpause', queueController.unpauseMember.bind(queueController));
router.put('/:queueName/members/:interface/penalty', queueController.updateMemberPenalty.bind(queueController));

module.exports = router;