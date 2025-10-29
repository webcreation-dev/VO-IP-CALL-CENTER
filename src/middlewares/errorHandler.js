/**
 * Middleware de gestion globale des erreurs
 */
const errorHandler = (err, req, res, next) => {
    // Ne pas logger les erreurs 404 des bots si skipLog est défini
    if (!err.skipLog) {
      console.error('❌ Erreur capturée:', err);
    }
  
    // Erreur de validation
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Erreur de validation',
        details: err.message,
      });
    }
  
    // Erreur PostgreSQL
    if (err.code && err.code.startsWith('23')) {
      return res.status(409).json({
        success: false,
        error: 'Conflit de données',
        details: err.detail || err.message,
      });
    }
  
    // Erreur 404
    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Ressource non trouvée',
        details: err.message,
      });
    }
  
    // Erreur générique
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Erreur interne du serveur',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
  
  /**
   * Middleware pour les routes non trouvées (404)
   */
  const notFound = (req, res, next) => {
    // Liste des patterns de bots/scanners à ignorer dans les logs
    const ignoredPatterns = [
      '/admin/',
      '/assets',
      '/api/v1/users',
      '/_asterisk/',
      '/remote/',
      '/favicon.ico',
      '/pdown',
      '/.env',
      '/config.php'
    ];

    // Ne pas logger les requêtes de bots
    const shouldSkipLog = ignoredPatterns.some(pattern => req.originalUrl.includes(pattern));

    const error = new Error(`Route non trouvée - ${req.originalUrl}`);
    error.status = 404;
    error.skipLog = shouldSkipLog; // Flag pour le errorHandler
    next(error);
  };
  
  module.exports = { errorHandler, notFound };