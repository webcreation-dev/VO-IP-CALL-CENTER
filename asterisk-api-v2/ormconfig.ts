import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'asterisk',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'asterisk',
  entities: ['src/core/database/entities/**/*.entity{.ts,.js}'],
  migrations: ['src/core/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
