import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_POOL_SIZE: Joi.number().default(20),

  // AMI
  AMI_HOST: Joi.string().required(),
  AMI_PORT: Joi.number().default(5038),
  AMI_USER: Joi.string().required(),
  AMI_PASSWORD: Joi.string().required(),

  // ARI
  ARI_HOST: Joi.string().required(),
  ARI_PORT: Joi.number().default(8088),
  ARI_USER: Joi.string().required(),
  ARI_PASSWORD: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  // Security
  CORS_ORIGIN: Joi.string().required(),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Logging
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
});
