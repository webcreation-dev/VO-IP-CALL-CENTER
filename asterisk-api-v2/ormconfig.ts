import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'asterisk',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'asterisk',
  entities: ['src/**/*.entity.ts'],
  migrations: [
    'src/core/database/migrations/*.ts',
    'src/migrations/*.ts',
  ],
  synchronize: false,
  logging: true,
});
