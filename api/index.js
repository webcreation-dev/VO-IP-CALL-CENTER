const express = require('express');
const db = require('./db'); // Garde l'ancien pour compatibilité
const corsMiddleware = require('./src/middlewares/cors');
const { errorHandler, notFound } = require('./src/middlewares/errorHandler');
const { success } = require('./src/utils/response');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(express.static(__dirname));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
// Route de base
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API de gestion Asterisk',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      tenants: '/api/tenants',
      endpoints: '/api/endpoints',
      queues: '/api/queues',
      cdr: '/api/cdr', // ✨ NOUVEAU
      recordings: '/api/recordings', // ✨ NOUVEAU
      statistics: '/api/statistics', // ✨ NOUVEAU
      asterisk: '/api/asterisk', // ✨ NOUVEAU
    },
  });
});

// Route health check
app.get('/api/health', async (req, res) => {
  try {
    // Test connexion PostgreSQL
    await db.query('SELECT NOW()');

    // Test connexion AMI
    const amiConfig = require('./src/config/ami');
    const amiStatus = amiConfig.isConnected();

    return success(
      res,
      {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          postgresql: 'OK',
          ami: amiStatus ? 'OK' : 'DISCONNECTED',
        },
      },
      'Système opérationnel'
    );
  } catch (err) {
    console.error('❌ Health check failed:', err);
    return res.status(503).json({
      success: false,
      error: 'Service indisponible',
      details: err.message,
    });
  }
});

// Route existante (pour compatibilité)
app.get('/tenants', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tenants ORDER BY id');
    return success(res, rows, 'Liste des tenants');
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      details: err.message,
    });
  }
});

// Routes API
app.use('/api/tenants', require('./src/routes/tenants'));
app.use('/api/endpoints', require('./src/routes/endpoints')); // ✨ NOUVELLE LIGNE
app.use('/api/queues', require('./src/routes/queues')); // ✨ NOUVELLE LIGNE
app.use('/api/cdr', require('./src/routes/cdr')); // ✨ NOUVELLE LIGNE
app.use('/api/recordings', require('./src/routes/recording')); // ✨ NOUVELLE LIGNE
app.use('/api/statistics', require('./src/routes/statistics')); // ✨ NOUVELLE LIGNE
app.use('/api/asterisk', require('./src/routes/asterisk')); // ✨ NOUVELLE LIGNE

// Middlewares d'erreur (TOUJOURS EN DERNIER)
app.use(notFound);
app.use(errorHandler);

// Démarrage du serveur
app.listen(port, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Serveur API démarré sur le port ${port}`);
  console.log(`📍 URL: http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  console.log('═══════════════════════════════════════════════════');

  // Initialiser AMI
  const amiConfig = require('./src/config/ami');
  console.log('🔄 Initialisation de la connexion AMI...');
});

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  console.log('⏹️  Signal SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⏹️  Signal SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});
