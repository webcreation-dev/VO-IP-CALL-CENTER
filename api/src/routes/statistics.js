const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

/**
 * Routes pour les statistiques avancées
 * Base URL: /api/statistics
 */

// Dashboard complet
router.get('/dashboard', statisticsController.getDashboard.bind(statisticsController));

// Résumé rapide
router.get('/summary', statisticsController.getSummary.bind(statisticsController));

// Statistiques détaillées par catégorie
router.get('/calls', statisticsController.getCallStatistics.bind(statisticsController));
router.get('/queues', statisticsController.getQueueStatistics.bind(statisticsController));
router.get('/endpoints', statisticsController.getEndpointStatistics.bind(statisticsController));
router.get('/recordings', statisticsController.getRecordingStatistics.bind(statisticsController));

// Top performers
router.get('/top-callers', statisticsController.getTopCallers.bind(statisticsController));
router.get('/top-called', statisticsController.getTopCalled.bind(statisticsController));

// Temps réel
router.get('/active-channels', statisticsController.getActiveChannels.bind(statisticsController));

// Tendances
router.get('/trend', statisticsController.getCallsTrend.bind(statisticsController));

module.exports = router;