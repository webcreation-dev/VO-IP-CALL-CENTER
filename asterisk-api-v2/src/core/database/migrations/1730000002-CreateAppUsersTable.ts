import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppUsersTable1730000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Create ENUM type for user roles
      DO $$ BEGIN
        CREATE TYPE user_role_values AS ENUM ('admin', 'tenant_admin', 'supervisor', 'agent');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      -- Create app_users table
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role user_role_values NOT NULL DEFAULT 'agent',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        endpoint_id VARCHAR(40) REFERENCES ps_endpoints(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        -- Constraint: admin has no tenant, others must have tenant
        CONSTRAINT app_users_tenant_role_check CHECK (
          (role = 'admin' AND tenant_id IS NULL) OR
          (role != 'admin' AND tenant_id IS NOT NULL)
        )
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS app_users_tenant_id_idx ON app_users(tenant_id);
      CREATE INDEX IF NOT EXISTS app_users_email_idx ON app_users(email);
      CREATE INDEX IF NOT EXISTS app_users_endpoint_id_idx ON app_users(endpoint_id);
      CREATE INDEX IF NOT EXISTS app_users_role_idx ON app_users(role);
      CREATE INDEX IF NOT EXISTS app_users_is_active_idx ON app_users(is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Drop app_users table
      DROP TABLE IF EXISTS app_users CASCADE;

      -- Drop ENUM type
      DROP TYPE IF EXISTS user_role_values CASCADE;
    `);
  }
}
