import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Soft Delete Support
 *
 * Adds soft delete columns (deleted_at, deleted_by, deletion_reason)
 * to all major Asterisk configuration tables.
 *
 * This enables:
 * 1. Data retention for historical reporting
 * 2. Audit trail for deletions
 * 3. Restore capability for accidentally deleted records
 * 4. Clean Asterisk configuration via database views
 */
export class AddSoftDeleteColumns1731300000000 implements MigrationInterface {
  name = 'AddSoftDeleteColumns1731300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tables to add soft delete support
    const tables = [
      'ps_endpoints',
      'ps_auths',
      'ps_aors',
      'queues',
      'queue_members',
      'extensions',
      'sip_trunks',
    ];

    for (const table of tables) {
      // Add deleted_at column (timestamp when record was soft-deleted)
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE
      `);

      // Add deleted_by column (user ID who performed the deletion)
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "deleted_by" INTEGER
      `);

      // Add deletion_reason column (optional explanation)
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "deletion_reason" TEXT
      `);

      // Create index on deleted_at for query performance
      // Partial index only indexes non-deleted records (most common query)
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_${table}_deleted_at"
        ON "${table}"("deleted_at")
        WHERE "deleted_at" IS NULL
      `);

      console.log(`✅ Added soft delete columns to ${table}`);
    }

    // Add foreign key constraint for deleted_by (references app_users)
    // Only for tables that already have tenant_id (user context)
    const tablesWithUserContext = [
      'ps_endpoints',
      'ps_auths',
      'ps_aors',
      'queues',
      'extensions',
      'sip_trunks',
    ];

    for (const table of tablesWithUserContext) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "FK_${table}_deleted_by"
        FOREIGN KEY ("deleted_by")
        REFERENCES "app_users"("id")
        ON DELETE SET NULL
      `);

      console.log(`✅ Added deleted_by foreign key to ${table}`);
    }

    console.log('✅ Soft delete migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'ps_endpoints',
      'ps_auths',
      'ps_aors',
      'queues',
      'queue_members',
      'extensions',
      'sip_trunks',
    ];

    const tablesWithUserContext = [
      'ps_endpoints',
      'ps_auths',
      'ps_aors',
      'queues',
      'extensions',
      'sip_trunks',
    ];

    // Drop foreign key constraints first
    for (const table of tablesWithUserContext) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP CONSTRAINT IF EXISTS "FK_${table}_deleted_by"
      `);
    }

    // Drop indexes and columns
    for (const table of tables) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_${table}_deleted_at"
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP COLUMN IF EXISTS "deletion_reason"
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP COLUMN IF EXISTS "deleted_by"
      `);

      await queryRunner.query(`
        ALTER TABLE "${table}"
        DROP COLUMN IF EXISTS "deleted_at"
      `);

      console.log(`✅ Removed soft delete columns from ${table}`);
    }

    console.log('✅ Soft delete rollback completed successfully');
  }
}
