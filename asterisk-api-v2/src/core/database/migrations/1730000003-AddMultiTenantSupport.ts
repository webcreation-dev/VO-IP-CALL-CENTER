import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiTenantSupport1730000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- ============================================
      -- 1. Add display_name to PJSIP entities
      -- ============================================

      -- Endpoints
      ALTER TABLE ps_endpoints ADD COLUMN IF NOT EXISTS display_name VARCHAR(40);
      UPDATE ps_endpoints SET display_name = id WHERE display_name IS NULL;

      -- Auths
      ALTER TABLE ps_auths ADD COLUMN IF NOT EXISTS display_name VARCHAR(40);
      UPDATE ps_auths SET display_name = id WHERE display_name IS NULL;

      -- AORs
      ALTER TABLE ps_aors ADD COLUMN IF NOT EXISTS display_name VARCHAR(40);
      UPDATE ps_aors SET display_name = id WHERE display_name IS NULL;

      -- ============================================
      -- 2. Add tenant_id to ps_contacts (was missing)
      -- ============================================
      ALTER TABLE ps_contacts ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS ps_contacts_tenant_id_idx ON ps_contacts(tenant_id);

      -- ============================================
      -- 3. Update queues table for multi-tenant
      -- ============================================

      -- Add columns
      ALTER TABLE queues ADD COLUMN IF NOT EXISTS display_name VARCHAR(128);
      ALTER TABLE queues ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

      -- Initialize display_name with current name
      UPDATE queues SET display_name = name WHERE display_name IS NULL;

      -- Set default tenant for existing queues (tenant_id=1)
      -- Create default tenant if doesn't exist
      INSERT INTO tenants (id, name, is_active)
      VALUES (1, 'default', true)
      ON CONFLICT (id) DO NOTHING;

      UPDATE queues SET tenant_id = 1 WHERE tenant_id IS NULL;

      -- Make tenant_id NOT NULL
      ALTER TABLE queues ALTER COLUMN tenant_id SET NOT NULL;

      -- Add foreign key
      ALTER TABLE queues ADD CONSTRAINT queues_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

      -- Drop old primary key and create new composite one
      ALTER TABLE queues DROP CONSTRAINT IF EXISTS queues_pkey;
      ALTER TABLE queues ADD PRIMARY KEY (tenant_id, name);

      CREATE INDEX IF NOT EXISTS queues_tenant_id_idx ON queues(tenant_id);

      -- ============================================
      -- 4. Update queue_members table for multi-tenant
      -- ============================================

      ALTER TABLE queue_members ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
      ALTER TABLE queue_members ADD COLUMN IF NOT EXISTS wrapuptime INTEGER;

      -- Set tenant_id for existing members based on their queue
      UPDATE queue_members qm
      SET tenant_id = (
        SELECT q.tenant_id
        FROM queues q
        WHERE q.name = qm.queue_name
        LIMIT 1
      )
      WHERE qm.tenant_id IS NULL;

      -- For any remaining NULL tenant_id, set to default
      UPDATE queue_members SET tenant_id = 1 WHERE tenant_id IS NULL;

      -- Make tenant_id NOT NULL
      ALTER TABLE queue_members ALTER COLUMN tenant_id SET NOT NULL;

      -- Add foreign key
      ALTER TABLE queue_members ADD CONSTRAINT queue_members_tenant_fk
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

      -- Drop old primary key and create new composite one
      ALTER TABLE queue_members DROP CONSTRAINT IF EXISTS queue_members_pkey;
      ALTER TABLE queue_members ADD PRIMARY KEY (tenant_id, queue_name, interface);

      CREATE INDEX IF NOT EXISTS queue_members_tenant_id_idx ON queue_members(tenant_id);

      -- ============================================
      -- 5. Add display_name indexes
      -- ============================================
      CREATE INDEX IF NOT EXISTS ps_endpoints_display_name_idx ON ps_endpoints(display_name);
      CREATE INDEX IF NOT EXISTS ps_auths_display_name_idx ON ps_auths(display_name);
      CREATE INDEX IF NOT EXISTS ps_aors_display_name_idx ON ps_aors(display_name);
      CREATE INDEX IF NOT EXISTS queues_display_name_idx ON queues(display_name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Revert queue_members
      ALTER TABLE queue_members DROP CONSTRAINT IF EXISTS queue_members_tenant_fk;
      ALTER TABLE queue_members DROP CONSTRAINT IF EXISTS queue_members_pkey;
      ALTER TABLE queue_members ADD PRIMARY KEY (queue_name, interface);
      ALTER TABLE queue_members DROP COLUMN IF EXISTS tenant_id;
      DROP INDEX IF EXISTS queue_members_tenant_id_idx;

      -- Revert queues
      ALTER TABLE queues DROP CONSTRAINT IF EXISTS queues_tenant_fk;
      ALTER TABLE queues DROP CONSTRAINT IF EXISTS queues_pkey;
      ALTER TABLE queues ADD PRIMARY KEY (name);
      ALTER TABLE queues DROP COLUMN IF EXISTS tenant_id;
      ALTER TABLE queues DROP COLUMN IF EXISTS display_name;
      DROP INDEX IF EXISTS queues_tenant_id_idx;
      DROP INDEX IF EXISTS queues_display_name_idx;

      -- Revert ps_contacts
      ALTER TABLE ps_contacts DROP COLUMN IF EXISTS tenant_id;
      DROP INDEX IF EXISTS ps_contacts_tenant_id_idx;

      -- Revert display_name columns
      ALTER TABLE ps_endpoints DROP COLUMN IF EXISTS display_name;
      ALTER TABLE ps_auths DROP COLUMN IF EXISTS display_name;
      ALTER TABLE ps_aors DROP COLUMN IF EXISTS display_name;
      DROP INDEX IF EXISTS ps_endpoints_display_name_idx;
      DROP INDEX IF EXISTS ps_auths_display_name_idx;
      DROP INDEX IF EXISTS ps_aors_display_name_idx;
    `);
  }
}
