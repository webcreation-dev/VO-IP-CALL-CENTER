import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { AmiModule } from './core/asterisk/ami/ami.module';
import { AriModule } from './core/asterisk/ari/ari.module';
import { CacheModule } from './core/cache/cache.module';
import { LoggerModule } from './core/logger/logger.module';

// Business modules
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { ExtensionsModule } from './extensions/extensions.module';
import { QueuesModule } from './queues/queues.module';
import { QueueMembersModule } from './queue-members/queue-members.module';
import { ChannelsModule } from './channels/channels.module';
import { CdrModule } from './cdr/cdr.module';
import { RecordingsModule } from './recordings/recordings.module';
// import { MonitoringModule } from './monitoring/monitoring.module';
import { MetadataModule } from './metadata/metadata.module';
import { AsteriskModule } from './asterisk/asterisk.module';
import { StatisticsModule } from './statistics/statistics.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

// Filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { IvrModule } from './ivr/ivr.module';

@Module({
  imports: [
    // Configuration - must be first
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),

    // Core infrastructure modules
    LoggerModule,
    DatabaseModule,
    AmiModule,
    AriModule,
    CacheModule,

    // Business modules
    AuthModule,
    TenantsModule,
    EndpointsModule,
    ExtensionsModule,
    QueuesModule,
    QueueMembersModule,
    ChannelsModule,
    CdrModule,
    RecordingsModule,
    // MonitoringModule,
    MetadataModule,
    AsteriskModule,
    StatisticsModule,
    IvrModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global Guards (applied in order)
    // TEMPORARILY DISABLED FOR TESTING - RE-ENABLE AFTER MIGRATION COMPLETE
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard, // 1. JWT authentication (respects @Public())
    // },
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard, // 2. Role-based access control (after JWT auth)
    // },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Log all requests/responses
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor, // Standardize response format
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor, // Add global timeout
    },

    // Global Exception Filters (applied in reverse order)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter, // Catch all unhandled exceptions
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // Format HTTP exceptions
    },
  ],
})
export class AppModule {}
