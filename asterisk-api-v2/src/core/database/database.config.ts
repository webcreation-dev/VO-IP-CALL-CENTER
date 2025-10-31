import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.user'),
  password: configService.get('database.password'),
  database: configService.get('database.name'),
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false, // ALWAYS false in production - use migrations
  logging: configService.get('app.env') === 'development',
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: false, // Run migrations manually
  maxQueryExecutionTime: 1000, // Log if query takes more than 1s
  extra: {
    max: configService.get('database.poolSize'),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  },
  // Handle connection errors gracefully
  retryAttempts: 3,
  retryDelay: 3000,
});
