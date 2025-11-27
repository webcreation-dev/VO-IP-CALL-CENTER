import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CustomLoggerService } from './core/logger/logger.service';

// Fix for Node.js 18 crypto polyfill issue
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get configuration service
  const configService = app.get(ConfigService);

  // Use custom logger
  const logger = await app.resolve(CustomLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  // Security - Helmet
  app.use(helmet());

  // CORS - Allow all origins
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted props exist
      transform: true, // Transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    }),
  );

  // API prefix
  const apiPrefix = configService.get('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  if (configService.get('swagger.enabled')) {
    const config = new DocumentBuilder()
      .setTitle(configService.get('swagger.title') || 'API')
      .setDescription(configService.get('swagger.description') || 'API Documentation')
      .setVersion(configService.get('swagger.version') || '1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('tenants', 'Tenant management')
      .addTag('endpoints', 'SIP Endpoints management')
      .addTag('queues', 'Queue management')
      .addTag('queue-members', 'Queue members management')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = configService.get('swagger.path') || 'api/docs';
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(`📚 Swagger documentation available at: /${swaggerPath}`);
  }

  // Start server
  const port = configService.get('app.port');
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`🌍 Environment: ${configService.get('app.env')}`);
}

bootstrap();
