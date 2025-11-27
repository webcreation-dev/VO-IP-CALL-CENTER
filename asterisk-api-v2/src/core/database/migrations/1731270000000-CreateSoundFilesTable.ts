import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSoundFilesTable1731270000000 implements MigrationInterface {
    name = 'CreateSoundFilesTable1731270000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enum type for sound file category
        await queryRunner.query(`
            CREATE TYPE "public"."sound_files_category_enum" AS ENUM(
                'moh',
                'announcement',
                'greeting',
                'prompt',
                'other'
            )
        `);

        // Create sound_files table
        await queryRunner.query(`
            CREATE TABLE "sound_files" (
                "id" SERIAL NOT NULL,
                "tenant_id" integer NOT NULL,
                "name" character varying(255) NOT NULL,
                "filename" character varying(255) NOT NULL,
                "filepath" character varying(500) NOT NULL,
                "format" character varying(20) NOT NULL,
                "duration" double precision,
                "filesize" bigint NOT NULL,
                "category" "public"."sound_files_category_enum" NOT NULL DEFAULT 'other',
                "description" text,
                "original_name" character varying(255) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sound_files_id" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_sound_files_tenant_id" ON "sound_files" ("tenant_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_sound_files_category" ON "sound_files" ("category")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_sound_files_tenant_category" ON "sound_files" ("tenant_id", "category")
        `);

        // Add foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "sound_files"
            ADD CONSTRAINT "FK_sound_files_tenant"
            FOREIGN KEY ("tenant_id")
            REFERENCES "tenants"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);

        // Add comments for documentation
        await queryRunner.query(`
            COMMENT ON TABLE "sound_files"
            IS 'Stores uploaded audio files for Music on Hold, announcements, greetings, etc.'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "sound_files"."category"
            IS 'Category of sound file: moh (music on hold), announcement, greeting, prompt, other'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.query(`
            ALTER TABLE "sound_files"
            DROP CONSTRAINT "FK_sound_files_tenant"
        `);

        // Drop indexes
        await queryRunner.query(`
            DROP INDEX "public"."IDX_sound_files_tenant_category"
        `);

        await queryRunner.query(`
            DROP INDEX "public"."IDX_sound_files_category"
        `);

        await queryRunner.query(`
            DROP INDEX "public"."IDX_sound_files_tenant_id"
        `);

        // Drop table
        await queryRunner.query(`
            DROP TABLE "sound_files"
        `);

        // Drop enum type
        await queryRunner.query(`
            DROP TYPE "public"."sound_files_category_enum"
        `);
    }
}
