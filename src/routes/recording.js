const express = require('express');
const router = express.Router();
const recordingController = require('../controllers/recordingController');

/**
 * Routes pour la gestion des enregistrements audio
 * Base URL: /api/recordings
 */

// Routes statistiques
router.get('/stats', recordingController.getRecordingStats.bind(recordingController));

// Routes principales
router.get('/', recordingController.getAllRecordings.bind(recordingController));
router.get('/:id', recordingController.getRecordingById.bind(recordingController));
router.get('/:id/download', recordingController.downloadRecording.bind(recordingController));
router.post('/', recordingController.createRecording.bind(recordingController));
router.put('/:id', recordingController.updateRecording.bind(recordingController));
router.delete('/:id', recordingController.deleteRecording.bind(recordingController));

module.exports = router;