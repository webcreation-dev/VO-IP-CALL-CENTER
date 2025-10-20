const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

/**
 * Routes pour la gestion des queues
 * Base URL: /api/queues
 */

// Routes pour les queues
router.get('/', queueController.getAllQueues.bind(queueController));
router.get('/:name', queueController.getQueueByName.bind(queueController));
router.get('/:name/stats', queueController.getQueueStats.bind(queueController));
router.post('/', queueController.createQueue.bind(queueController));
router.put('/:name', queueController.updateQueue.bind(queueController));
router.delete('/:name', queueController.deleteQueue.bind(queueController));

// Routes pour les membres des queues
router.get('/:queueName/members', queueController.getQueueMembers.bind(queueController));
router.post('/:queueName/members', queueController.addMember.bind(queueController));
router.delete('/:queueName/members/:interface', queueController.removeMember.bind(queueController));
router.put('/:queueName/members/:interface/pause', queueController.pauseMember.bind(queueController));
router.put('/:queueName/members/:interface/unpause', queueController.unpauseMember.bind(queueController));
router.put('/:queueName/members/:interface/penalty', queueController.updateMemberPenalty.bind(queueController));

module.exports = router;