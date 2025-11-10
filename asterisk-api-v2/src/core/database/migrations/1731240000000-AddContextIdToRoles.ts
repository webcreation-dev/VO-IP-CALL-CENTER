import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContextIdToRoles1731240000000 implements MigrationInterface {
    name = 'AddContextIdToRoles1731240000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add context_id column (nullable for backward compatibility)
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            ADD COLUMN "context_id" integer NULL
        `);

        // 2. Add foreign key constraint to tenant_contexts
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            ADD CONSTRAINT "FK_endpoint_role_context"
            FOREIGN KEY ("context_id")
            REFERENCES "tenant_contexts"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);

        // 3. Drop old unique constraints
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            DROP CONSTRAINT IF EXISTS "UQ_87c81c54adc595a78c5dec4b792"
        `);

        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            DROP CONSTRAINT IF EXISTS "UQ_495a93e171b4434c9e5bc9e72f8"
        `);

        // 4. Create new unique indexes that support both tenant-wide and context-specific roles
        // Using COALESCE to handle NULL values (tenant-wide roles)
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_role_tenant_context_name"
            ON "endpoint_roles" ("tenant_id", COALESCE("context_id", -1), "name")
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_role_tenant_context_level"
            ON "endpoint_roles" ("tenant_id", COALESCE("context_id", -1), "level")
        `);

        // 5. Create index for context_id for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_endpoint_roles_context_id"
            ON "endpoint_roles" ("context_id")
            WHERE "context_id" IS NOT NULL
        `);

        // 6. Add comments for documentation
        await queryRunner.query(`
            COMMENT ON COLUMN "endpoint_roles"."context_id"
            IS 'Optional context ID. NULL means tenant-wide role (shared across all contexts). Non-NULL means context-specific role (only for that context).'
        `);

        // Note: Existing roles automatically have context_id = NULL (tenant-wide)
        // No data migration needed!
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop comments
        await queryRunner.query(`
            COMMENT ON COLUMN "endpoint_roles"."context_id" IS NULL
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_endpoint_roles_context_id"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_role_tenant_context_level"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_role_tenant_context_name"
        `);

        // Recreate old unique constraints (best effort)
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            ADD CONSTRAINT "UQ_87c81c54adc595a78c5dec4b792"
            UNIQUE ("tenant_id", "name")
        `);

        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            ADD CONSTRAINT "UQ_495a93e171b4434c9e5bc9e72f8"
            UNIQUE ("tenant_id", "level")
        `);

        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            DROP CONSTRAINT "FK_endpoint_role_context"
        `);

        // Drop column
        await queryRunner.query(`
            ALTER TABLE "endpoint_roles"
            DROP COLUMN "context_id"
        `);
    }
}
