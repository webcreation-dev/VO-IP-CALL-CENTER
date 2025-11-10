import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRolePresetsTable1731250000000 implements MigrationInterface {
    name = 'CreateRolePresetsTable1731250000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create role_presets table
        await queryRunner.query(`
            CREATE TABLE "role_presets" (
                "id" SERIAL PRIMARY KEY,
                "preset_id" VARCHAR(100) UNIQUE NOT NULL,
                "name" VARCHAR(200) NOT NULL,
                "description" TEXT,
                "is_active" BOOLEAN DEFAULT true,
                "created_at" TIMESTAMP DEFAULT NOW(),
                "updated_at" TIMESTAMP DEFAULT NOW()
            )
        `);

        // 2. Create role_preset_roles table
        await queryRunner.query(`
            CREATE TABLE "role_preset_roles" (
                "id" SERIAL PRIMARY KEY,
                "preset_id" INTEGER NOT NULL,
                "name" VARCHAR(50) NOT NULL,
                "display_name" VARCHAR(100) NOT NULL,
                "description" TEXT,
                "level" INTEGER NOT NULL CHECK ("level" >= 1 AND "level" <= 10),
                "can_call_same_level" BOOLEAN DEFAULT true,
                "can_call_lower_level" BOOLEAN DEFAULT false,
                "can_call_higher_level" BOOLEAN DEFAULT false,
                "sort_order" INTEGER DEFAULT 0,
                CONSTRAINT "FK_role_preset_roles_preset"
                    FOREIGN KEY ("preset_id")
                    REFERENCES "role_presets"("id")
                    ON DELETE CASCADE
                    ON UPDATE NO ACTION
            )
        `);

        // 3. Create unique constraints for role_preset_roles
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_role_preset_roles_preset_name"
            ON "role_preset_roles" ("preset_id", "name")
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_role_preset_roles_preset_level"
            ON "role_preset_roles" ("preset_id", "level")
        `);

        // 4. Create index on preset_id for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_role_preset_roles_preset_id"
            ON "role_preset_roles" ("preset_id")
        `);

        // 5. Add comments for documentation
        await queryRunner.query(`
            COMMENT ON TABLE "role_presets"
            IS 'Role presets that can be applied when creating contexts. Managed by ADMIN only.'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "role_presets"."preset_id"
            IS 'Unique identifier for the preset (e.g., call_center_standard, technical_support)'
        `);

        await queryRunner.query(`
            COMMENT ON TABLE "role_preset_roles"
            IS 'Roles that belong to a specific preset. Defines the hierarchy and permissions.'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "role_preset_roles"."level"
            IS 'Hierarchical level of the role (1-10). 1 = lowest (Agent), 10 = highest (Director)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "role_preset_roles"."sort_order"
            IS 'Order in which roles should be displayed in UI'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop comments
        await queryRunner.query(`
            COMMENT ON COLUMN "role_preset_roles"."sort_order" IS NULL
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "role_preset_roles"."level" IS NULL
        `);

        await queryRunner.query(`
            COMMENT ON TABLE "role_preset_roles" IS NULL
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "role_presets"."preset_id" IS NULL
        `);

        await queryRunner.query(`
            COMMENT ON TABLE "role_presets" IS NULL
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_role_preset_roles_preset_id"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_role_preset_roles_preset_level"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_role_preset_roles_preset_name"
        `);

        // Drop tables (cascade will handle role_preset_roles)
        await queryRunner.query(`
            DROP TABLE IF EXISTS "role_preset_roles"
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS "role_presets"
        `);
    }
}
