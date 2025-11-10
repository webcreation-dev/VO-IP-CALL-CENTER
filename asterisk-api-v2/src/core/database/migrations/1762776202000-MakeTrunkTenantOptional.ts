import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTrunkTenantOptional1762776202000 implements MigrationInterface {
  name = 'MakeTrunkTenantOptional1762776202000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      DROP CONSTRAINT IF EXISTS "FK_e3c1e80d210f0886e4323155408"
    `);

    // Make tenant_id nullable
    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      ALTER COLUMN "tenant_id" DROP NOT NULL
    `);

    // Re-add the foreign key constraint with ON DELETE SET NULL
    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      ADD CONSTRAINT "FK_e3c1e80d210f0886e4323155408"
      FOREIGN KEY ("tenant_id")
      REFERENCES "tenants"("id")
      ON DELETE SET NULL
    `);

    // Create index on tenant_id for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sip_trunks_tenant_id"
      ON "sip_trunks"("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_sip_trunks_tenant_id"
    `);

    // Drop the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      DROP CONSTRAINT IF EXISTS "FK_e3c1e80d210f0886e4323155408"
    `);

    // Make tenant_id NOT NULL again (only for trunks that have a tenant)
    // First, we need to delete or assign a default tenant to orphaned trunks
    await queryRunner.query(`
      DELETE FROM "sip_trunks"
      WHERE "tenant_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);

    // Re-add the foreign key constraint with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "sip_trunks"
      ADD CONSTRAINT "FK_e3c1e80d210f0886e4323155408"
      FOREIGN KEY ("tenant_id")
      REFERENCES "tenants"("id")
      ON DELETE CASCADE
    `);
  }
}
