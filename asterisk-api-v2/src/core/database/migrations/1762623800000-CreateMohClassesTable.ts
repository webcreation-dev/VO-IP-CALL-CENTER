import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMohClassesTable1762623800000 implements MigrationInterface {
    name = 'CreateMohClassesTable1762623800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum types for MoH class
        await queryRunner.query(`
            CREATE TYPE "public"."moh_classes_mode_enum" AS ENUM(
                'files',
                'quietmp3',
                'custom'
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "public"."moh_classes_sort_enum" AS ENUM(
                'alpha',
                'random'
            )
        `);

        // Create moh_classes table
        await queryRunner.query(`
            CREATE TABLE "moh_classes" (
                "id" SERIAL NOT NULL,
                "tenant_id" integer NOT NULL,
                "name" character varying(100) NOT NULL,
                "mode" "public"."moh_classes_mode_enum" NOT NULL DEFAULT 'files',
                "directory" character varying(500),
                "application" character varying(500),
                "format" character varying(50) DEFAULT 'wav',
                "sort" "public"."moh_classes_sort_enum" NOT NULL DEFAULT 'random',
                "description" text,
                "enabled" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_moh_classes_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_moh_classes_tenant_name" UNIQUE ("tenant_id", "name")
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_moh_classes_tenant_id" ON "moh_classes" ("tenant_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_moh_classes_name" ON "moh_classes" ("name")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_moh_classes_tenant_enabled" ON "moh_classes" ("tenant_id", "enabled")
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "moh_classes"
            ADD CONSTRAINT "FK_moh_classes_tenant"
            FOREIGN KEY ("tenant_id")
            REFERENCES "tenants"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);

        // Add comments for documentation
        await queryRunner.query(`
            COMMENT ON TABLE "moh_classes"
            IS 'Stores Music on Hold class configurations that map to musiconhold.conf'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "moh_classes"."mode"
            IS 'MoH mode: files (play files from directory), quietmp3 (use mpg123), custom (custom application)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "moh_classes"."directory"
            IS 'Directory containing music files (required for files mode)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "moh_classes"."application"
            IS 'Custom application command (required for custom mode)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "moh_classes"."sort"
            IS 'Sort order for files: alpha (alphabetical), random'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE "moh_classes"
            DROP CONSTRAINT "FK_moh_classes_tenant"
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX "public"."IDX_moh_classes_tenant_enabled"
        `);

        await queryRunner.query(`
            DROP INDEX "public"."IDX_moh_classes_name"
        `);

        await queryRunner.query(`
            DROP INDEX "public"."IDX_moh_classes_tenant_id"
        `);

        // Drop table
        await queryRunner.query(`
            DROP TABLE "moh_classes"
        `);

        // Drop enum types
        await queryRunner.query(`
            DROP TYPE "public"."moh_classes_sort_enum"
        `);

        await queryRunner.query(`
            DROP TYPE "public"."moh_classes_mode_enum"
        `);
    }
}
