import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrichTenantsTable1730000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Add new columns to tenants table
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS max_endpoints INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS max_queues INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      -- Create index for performance
      CREATE INDEX IF NOT EXISTS tenants_is_active_idx ON tenants(is_active);

      -- Update existing tenants with default values
      UPDATE tenants SET
        is_active = true,
        max_endpoints = 100,
        max_queues = 50,
        timezone = 'UTC',
        updated_at = CURRENT_TIMESTAMP
      WHERE is_active IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Remove added columns
      ALTER TABLE tenants
      DROP COLUMN IF EXISTS company_name,
      DROP COLUMN IF EXISTS contact_email,
      DROP COLUMN IF EXISTS contact_phone,
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS city,
      DROP COLUMN IF EXISTS country,
      DROP COLUMN IF EXISTS timezone,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS max_endpoints,
      DROP COLUMN IF EXISTS max_queues,
      DROP COLUMN IF EXISTS updated_at;

      -- Drop index
      DROP INDEX IF EXISTS tenants_is_active_idx;
    `);
  }
}
