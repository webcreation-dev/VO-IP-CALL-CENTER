export default () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'asterisk',
    user: process.env.DB_USER || 'asterisk',
    password: process.env.DB_PASSWORD,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
  },

  ami: {
    host: process.env.AMI_HOST || 'localhost',
    port: parseInt(process.env.AMI_PORT || '5038', 10),
    user: process.env.AMI_USER || 'admin',
    password: process.env.AMI_PASSWORD,
  },

  ari: {
    host: process.env.ARI_HOST || 'localhost',
    port: parseInt(process.env.ARI_PORT || '8088', 10),
    user: process.env.ARI_USER || 'asterisk',
    password: process.env.ARI_PASSWORD,
    wsUrl: process.env.ARI_WS_URL || 'ws://localhost:8088/ari/events',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  cache: {
    ttl: {
      stats: parseInt(process.env.CACHE_TTL_STATS || '30', 10),
      endpoints: parseInt(process.env.CACHE_TTL_ENDPOINTS || '60', 10),
      queues: parseInt(process.env.CACHE_TTL_QUEUES || '30', 10),
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  security: {
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    title: process.env.SWAGGER_TITLE || 'Asterisk VoIP Call Center API',
    description: process.env.SWAGGER_DESCRIPTION || 'Multi-tenant VoIP Call Center Management API',
    version: process.env.SWAGGER_VERSION || '2.0',
    path: process.env.SWAGGER_PATH || 'api/docs',
  },
});
