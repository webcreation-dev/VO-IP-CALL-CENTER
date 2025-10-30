const express = require('express');
const router = express.Router();
const asteriskController = require('../controllers/asteriskController');

/**
 * Routes pour l'administration d'Asterisk via AMI
 * Base URL: /api/asterisk
 */

// Statut et informations
router.get('/status', asteriskController.getServerStatus.bind(asteriskController));
router.get('/uptime', asteriskController.getUptime.bind(asteriskController));
router.get('/stats', asteriskController.getGlobalStats.bind(asteriskController));

// Gestion des canaux
router.get('/channels', asteriskController.getActiveChannels.bind(asteriskController));
router.get('/channels/:channelName', asteriskController.getChannelInfo.bind(asteriskController));
router.delete('/channels/:channelName', asteriskController.hangupChannel.bind(asteriskController));

// Originate (initier un appel)
router.post('/originate', asteriskController.originateCall.bind(asteriskController));

// Transfert d'appel
router.post('/transfer/blind', asteriskController.blindTransfer.bind(asteriskController));
router.get('/extensions/available', asteriskController.getAvailableExtensions.bind(asteriskController));

// Rechargement des configurations
router.post('/reload', asteriskController.reloadAll.bind(asteriskController));
router.post('/reload/pjsip', asteriskController.reloadPJSIP.bind(asteriskController));
router.post('/reload/dialplan', asteriskController.reloadDialplan.bind(asteriskController));
router.post('/reload/:module', asteriskController.reloadModule.bind(asteriskController));

// Modules et peers
router.get('/modules', asteriskController.getLoadedModules.bind(asteriskController));
router.get('/peers', asteriskController.getPeers.bind(asteriskController));

// Messages et commandes
router.post('/message', asteriskController.sendMessage.bind(asteriskController));
router.post('/command', asteriskController.executeCommand.bind(asteriskController));

module.exports = router;