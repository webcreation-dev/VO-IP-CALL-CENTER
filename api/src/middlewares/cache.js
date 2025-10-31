/**
 * Middleware de cache simple pour les statistiques
 * Évite de recalculer les stats trop fréquemment
 */
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute

const cacheMiddleware = (duration = CACHE_DURATION) => {
  return (req, res, next) => {
    // Créer une clé de cache basée sur l'URL et les query params
    const cacheKey = req.originalUrl || req.url;

    // Vérifier si la donnée est en cache
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < duration) {
      console.log(`✅ Cache hit: ${cacheKey}`);
      return res.json(cachedData.data);
    }

    // Intercepter res.json pour mettre en cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Mettre en cache uniquement les réponses réussies
      if (body.success) {
        cache.set(cacheKey, {
          data: body,
          timestamp: Date.now()
        });
        
        // Nettoyer le cache après la durée spécifiée
        setTimeout(() => {
          cache.delete(cacheKey);
        }, duration);
      }
      
      return originalJson(body);
    };

    next();
  };
};

/**
 * Nettoyer tout le cache
 */
const clearCache = () => {
  cache.clear();
  console.log('🗑️  Cache vidé');
};

module.exports = { cacheMiddleware, clearCache };